import './style.css';
import {
  TRADE_ASSETS,
  TIMEFRAMES,
  MIN_TRADE,
  MAX_TRADE,
  WIN_PAYOUT,
  getAsset,
  getTimeframe,
  payoutRate,
  winChance,
  nextPrice,
  buildSparkline,
  resolveTrade,
  expectedRtp,
  smoothSeries,
  smoothPath,
} from './trading.js';
import {
  REFERRAL_TIERS,
  REFERRAL_STAGES,
  LEVEL_TARGET,
  MIN_WITHDRAW_SC,
  RUB_TO_SC,
  loadState,
  saveState,
  makeId,
  initialsFromName,
  firstNameFrom,
  referralTier,
  nextReferralTier,
  referralCutOnLoss,
  qualifiedReferrals,
  rubToSc,
  scToRub,
  registerDailyTrade,
  dailyTradeBonusAmount,
  moveToWithdraw,
} from './state.js';

let state = loadState();
let chartTimer = null;

const TITLE_MAP = {
  overview: 'Обзор',
  trade: 'Торговля',
  withdrawals: 'Вывод средств',
  partners: 'Партнёрская программа',
  activity: 'Операции',
  faq: 'FAQ',
  privacy: 'Конфиденциальность',
  settings: 'Настройки',
};

const FAQ_ITEMS = [
  {
    q: 'Это пирамида?',
    a: 'Нет пассивного дохода и нет карточек «под процент». SC появляются после доната. На сделках Call/Put вы рискуете ставкой: проигрыш сжигает SC, выигрыш даёт +92% к ставке. Платформа в плюсе за счёт шанса победы ниже 50%.',
  },
  {
    q: 'Как устроена торговля?',
    a: `Актив → время → ставка → Call или Put. Победа: ставка + 92%. Поражение: ставка сгорает. Шанс победы ~${Math.round(winChance() * 100)}%.`,
  },
  {
    q: 'Что за ежедневный бонус?',
    a: 'В партнёрской программе: сделайте хотя бы одну ставку в день — получите SC за серию. Это награда за активность, не процент на депозит.',
  },
  {
    q: 'Что такое Swape Coin?',
    a: `1 ₽ = ${RUB_TO_SC} SC. Торговля в SC. Вывод от ${MIN_WITHDRAW_SC} SC обратно в ₽.`,
  },
  {
    q: 'Как работает партнёрка?',
    a: 'Доля от проигрышей приглашённых + ежедневный бонус за вашу собственную ставку. Не % от чужого доната.',
  },
  {
    q: 'Что если сайт закроется?',
    a: 'SC и заявки на вывод могут пропасть без компенсации.',
  },
];

const els = {
  auth: document.querySelector('#auth-screen'),
  app: document.querySelector('#app-shell'),
  toast: document.querySelector('.toast'),
  modalRoot: document.querySelector('#modal-root'),
  modalBody: document.querySelector('#modal-body'),
  title: document.querySelector('#page-title'),
  notifyPanel: document.querySelector('#notify-panel'),
  notifyList: document.querySelector('#notify-list'),
  notifyDot: document.querySelector('#notify-dot'),
  profileMenu: document.querySelector('#profile-menu'),
};

function money(value, digits = 2) {
  return `${Number(value).toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} SC`;
}

function moneyPlain(value, digits = 2) {
  return Number(value).toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function rubMoney(value, digits = 0) {
  return `${Number(value).toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ₽`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function persist() {
  saveState(state);
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add('visible');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove('visible'), 3500);
}

function pushNotification(title, body) {
  state.notifications.unshift({ id: makeId('n'), title, body, read: false, at: Date.now() });
  persist();
}

function addTransaction(tx) {
  state.transactions.unshift({ id: makeId('tx'), at: Date.now(), ...tx });
}

function openModal(html) {
  els.modalBody.innerHTML = html;
  els.modalRoot.hidden = false;
  document.body.classList.add('modal-open');
}

function closeModal() {
  els.modalRoot.hidden = true;
  document.body.classList.remove('modal-open');
  els.modalBody.innerHTML = '';
}

function closeMenus() {
  els.notifyPanel.hidden = true;
  els.profileMenu.hidden = true;
}

function ensureTrading() {
  if (!state.trading) {
    state.trading = {
      assetId: 'btc',
      timeframeId: '60',
      prices: {},
      history: [],
      open: [],
      stats: { trades: 0, wins: 0, losses: 0, volume: 0, pnl: 0 },
    };
  }
  if (!state.trading.prices) state.trading.prices = {};
  if (!state.bonuses) state.bonuses = { streak: 0, lastTradeDate: null, lastBonusDate: null };
  TRADE_ASSETS.forEach((asset) => {
    if (!state.trading.prices[asset.id]?.length) {
      state.trading.prices[asset.id] = buildSparkline(asset);
    }
  });
}

function currentPrice(assetId) {
  ensureTrading();
  const series = state.trading.prices[assetId] || [];
  return series[series.length - 1] || getAsset(assetId).base;
}

function tickPrices() {
  if (!state.auth.loggedIn) return;
  ensureTrading();
  TRADE_ASSETS.forEach((asset) => {
    const series = state.trading.prices[asset.id] || buildSparkline(asset);
    const next = nextPrice(asset, series[series.length - 1] || asset.base);
    series.push(next);
    if (series.length > 90) series.shift();
    state.trading.prices[asset.id] = smoothSeries(series, 2);
  });
  settleDueTrades();
  if (document.querySelector('.page-section.active')?.id === 'trade') paintChartOnly();
}

function settleDueTrades() {
  ensureTrading();
  const now = Date.now();
  const due = state.trading.open.filter((t) => t.expiresAt <= now);
  if (!due.length) return;
  due.forEach((trade) => settleTrade(trade));
  state.trading.open = state.trading.open.filter((t) => t.expiresAt > now);
  persist();
  const active = document.querySelector('.page-section.active')?.id;
  if (['trade', 'overview', 'activity', 'partners'].includes(active)) render();
}

function settleTrade(trade) {
  const asset = getAsset(trade.assetId);
  const result = resolveTrade({
    direction: trade.direction,
    openPrice: trade.openPrice,
    stake: trade.stake,
    payout: WIN_PAYOUT,
    asset,
  });
  trade.result = result;
  state.trading.stats.trades += 1;
  state.trading.stats.volume = Number((state.trading.stats.volume + trade.stake).toFixed(2));
  state.trading.stats.pnl = Number((state.trading.stats.pnl + result.pnl).toFixed(2));
  if (result.won) {
    state.trading.stats.wins += 1;
    state.balances.trade = Number((state.balances.trade + result.payoutTotal).toFixed(2));
    addTransaction({
      type: 'trade',
      title: `Сделка ${asset.symbol} ${trade.direction === 'call' ? 'Call' : 'Put'}`,
      detail: 'Выигрыш · +92%',
      amount: result.profit,
      balance: 'trade',
    });
    showToast(`Win · +${money(result.profit)}`);
  } else {
    state.trading.stats.losses += 1;
    addTransaction({
      type: 'trade',
      title: `Сделка ${asset.symbol} ${trade.direction === 'call' ? 'Call' : 'Put'}`,
      detail: 'Проигрыш · ставка сгорела',
      amount: -trade.stake,
      balance: 'trade',
    });
    showToast(`Lose · −${money(trade.stake)}`);
  }
  state.trading.history.unshift({ ...trade, result, closedAt: Date.now() });
  state.trading.history = state.trading.history.slice(0, 40);
}

function openTrade(direction) {
  ensureTrading();
  const stake = Number(document.querySelector('#trade-stake')?.value);
  const assetId = state.trading.assetId;
  const timeframeId = state.trading.timeframeId;
  if (!Number.isFinite(stake) || stake < MIN_TRADE) return showToast(`Минимум ${MIN_TRADE} SC`);
  if (stake > MAX_TRADE) return showToast(`Максимум ${MAX_TRADE} SC`);
  if (stake > state.balances.trade) return showToast('Недостаточно SC на торговом счёте');

  const tf = getTimeframe(timeframeId);
  const openPrice = currentPrice(assetId);
  state.balances.trade = Number((state.balances.trade - stake).toFixed(2));

  const daily = registerDailyTrade(state);
  if (daily.ok) {
    addTransaction({
      type: 'bonus',
      title: 'Ежедневная ставка',
      detail: `Серия ${daily.streak} дн.`,
      amount: daily.amount,
      balance: 'trade',
    });
    pushNotification('Бонус за ставку', `+${money(daily.amount)} за торговлю сегодня (серия ${daily.streak}).`);
    showToast(`Бонус серии +${money(daily.amount)}`);
  }

  const trade = {
    id: makeId('tr'),
    assetId,
    direction,
    stake,
    payout: WIN_PAYOUT,
    openPrice,
    openedAt: Date.now(),
    expiresAt: Date.now() + tf.seconds * 1000,
    timeframeId,
  };
  state.trading.open.unshift(trade);
  persist();
  showToast(`${direction === 'call' ? 'Call' : 'Put'} · ${money(stake)} · вход ${openPrice}`);
  render();
}

function priceToY(value, min, max, height) {
  const span = max - min || 1;
  return height - ((value - min) / span) * (height - 24) - 12;
}

function sparkSvg(series, entryLevels = [], width = 640, height = 240) {
  if (!series?.length) return '';
  const smoothed = smoothSeries(series, 2);
  const min = Math.min(...smoothed, ...entryLevels.map((e) => e.price));
  const max = Math.max(...smoothed, ...entryLevels.map((e) => e.price));
  const points = smoothed.map((v, i) => {
    const x = (i / (smoothed.length - 1)) * width;
    const y = priceToY(v, min, max, height);
    return [x, y];
  });
  const d = smoothPath(points);
  const up = smoothed[smoothed.length - 1] >= smoothed[0];
  const stroke = up ? '#65d5ad' : '#ef8d86';
  const last = points[points.length - 1];
  const entries = entryLevels
    .map((entry) => {
      const y = priceToY(entry.price, min, max, height);
      const color = entry.direction === 'call' ? '#65d5ad' : '#ef8d86';
      return `
        <line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${color}" stroke-width="1.5" stroke-dasharray="6 5" opacity="0.9" />
        <rect x="8" y="${y - 10}" width="118" height="18" rx="4" fill="#0d1327ee" stroke="${color}" />
        <text x="14" y="${y + 3}" fill="${color}" font-size="10" font-family="DM Mono, monospace">вход ${entry.price}</text>
      `;
    })
    .join('');

  return `
    <svg class="trade-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${stroke}" stop-opacity="0.22" />
          <stop offset="100%" stop-color="${stroke}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="${d} L ${width} ${height} L 0 ${height} Z" fill="url(#areaGrad)" />
      <path d="${d}" fill="none" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      ${entries}
      <circle cx="${last[0]}" cy="${last[1]}" r="4.5" fill="${stroke}" />
    </svg>`;
}

function paintChartOnly() {
  const host = document.querySelector('#chart-host');
  const priceEl = document.querySelector('#live-price');
  if (!host) return;
  ensureTrading();
  const asset = getAsset(state.trading.assetId);
  const series = state.trading.prices[asset.id] || [];
  const entries = state.trading.open
    .filter((t) => t.assetId === asset.id)
    .map((t) => ({ price: t.openPrice, direction: t.direction }));
  host.innerHTML = sparkSvg(series, entries);
  if (priceEl) priceEl.textContent = currentPrice(asset.id).toLocaleString('ru-RU');
  document.querySelectorAll('[data-open-timer]').forEach((el) => {
    const trade = state.trading.open.find((t) => t.id === el.dataset.openTimer);
    if (!trade) return;
    el.textContent = `${Math.max(0, Math.ceil((trade.expiresAt - Date.now()) / 1000))}с`;
  });
}

function showSection(id) {
  if (!TITLE_MAP[id]) return;
  document.querySelectorAll('.page-section').forEach((section) => {
    section.classList.toggle('active', section.id === id);
  });
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.classList.toggle('active', link.dataset.nav === id);
  });
  els.title.textContent = TITLE_MAP[id];
  window.history.replaceState(null, '', `#${id}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeMenus();
  render();
}

function updateChrome() {
  const { user } = state;
  document.querySelector('#sidebar-avatar').textContent = user.initials;
  document.querySelector('#top-avatar').textContent = user.initials;
  document.querySelector('#sidebar-name').textContent = user.name;
  document.querySelector('#sidebar-status').textContent = `Статус: ${user.status}`;
  els.notifyDot.hidden = state.notifications.filter((n) => !n.read).length === 0;
}

function renderNotifications() {
  els.notifyList.innerHTML = state.notifications.length
    ? state.notifications
        .slice(0, 8)
        .map(
          (n) => `<article class="notify-item ${n.read ? '' : 'unread'}" data-notify-id="${n.id}">
          <strong>${n.title}</strong><p>${n.body}</p><time>${formatDate(n.at)}</time>
        </article>`
        )
        .join('')
    : `<div class="empty-mini">Пока нет уведомлений</div>`;
}

function renderOverview() {
  ensureTrading();
  const stats = state.trading.stats;
  const recent = state.transactions.slice(0, 5);
  const open = state.trading.open;
  document.querySelector('#overview').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ТОРГОВЫЙ КАБИНЕТ</p>
        <h1>Привет, ${firstNameFrom(state.user.name)}</h1>
        <p class="muted">Call/Put · выплата +92% · без VIP и без пассивных карточек</p>
      </div>
      <div class="welcome-actions">
        <button class="primary-button compact-btn" type="button" data-open-section="trade">Терминал</button>
        <button class="ghost-button" type="button" id="open-deposit">Донат</button>
      </div>
    </div>
    <div class="risk-banner">
      <strong>Риск ставки</strong>
      <p>Победа = ставка + 92%. Проигрыш = ставка сгорает. Шанс ниже 50%. Ежедневный бонус — только за факт ставки, в партнёрке.</p>
    </div>
    <div class="metric-grid">
      <article class="metric-card">
        <div class="metric-title">Торговый счёт</div>
        <strong>${moneyPlain(state.balances.trade)} <small>SC</small></strong>
        <p>≈ ${rubMoney(scToRub(state.balances.trade), 2)}</p>
        <div class="metric-actions">
          <button class="ghost-button" type="button" id="open-deposit">Донат</button>
          <button class="text-button" type="button" id="open-transfer">На вывод →</button>
        </div>
      </article>
      <article class="metric-card">
        <div class="metric-title">К выводу</div>
        <strong>${moneyPlain(state.balances.withdraw)} <small>SC</small></strong>
        <p>От ${MIN_WITHDRAW_SC} SC</p>
        <button class="text-button" type="button" data-open="withdrawals">Вывести <span>→</span></button>
      </article>
      <article class="metric-card accent-card">
        <div class="metric-title">PnL</div>
        <strong class="${stats.pnl >= 0 ? 'pos' : 'neg'}">${stats.pnl >= 0 ? '+' : ''}${moneyPlain(stats.pnl)}</strong>
        <p>Сделок ${stats.trades} · W/L ${stats.wins}/${stats.losses} · RTP ~${expectedRtp()}%</p>
        <div class="progress-label"><span>Оборот</span><span>${moneyPlain(stats.volume)} SC</span></div>
        <div class="progress"><i style="width:${Math.min(100, (stats.volume / LEVEL_TARGET) * 100)}%"></i></div>
      </article>
    </div>
    <div class="two-column">
      <section class="panel">
        <div class="panel-heading"><div><p class="eyebrow">ОТКРЫТЫЕ</p><h2>Активные сделки</h2></div><a href="#trade" data-open="trade">Терминал →</a></div>
        ${
          open.length
            ? `<div class="history-list">${open
                .map((t) => {
                  const left = Math.max(0, Math.ceil((t.expiresAt - Date.now()) / 1000));
                  return `<div class="history-row"><div><strong>${getAsset(t.assetId).symbol} ${t.direction === 'call' ? 'Call ↑' : 'Put ↓'}</strong>
                    <span>Ставка ${money(t.stake)} · вход ${t.openPrice}</span></div>
                    <div class="history-meta"><span class="status-pill">${left}с</span></div></div>`;
                })
                .join('')}</div>`
            : `<div class="empty-state compact"><strong>Нет открытых сделок</strong><p>Откройте Call или Put.</p></div>`
        }
      </section>
      <section class="panel disclosure-panel">
        <div class="panel-heading"><div><p class="eyebrow">ЛЕНТА</p><h2>Последние операции</h2></div></div>
        <div class="mini-feed">${recent
          .map(
            (tx) => `<div class="mini-row"><div><strong>${tx.title}</strong><span>${tx.detail}</span></div>
            <b class="${tx.amount >= 0 ? 'pos' : 'neg'}">${tx.amount >= 0 ? '+' : ''}${moneyPlain(tx.amount)} SC</b></div>`
          )
          .join('')}</div>
      </section>
    </div>
  `;
}

function renderTrade() {
  ensureTrading();
  const asset = getAsset(state.trading.assetId);
  const tf = getTimeframe(state.trading.timeframeId);
  const series = state.trading.prices[asset.id] || [];
  const price = currentPrice(asset.id);
  const entries = state.trading.open
    .filter((t) => t.assetId === asset.id)
    .map((t) => ({ price: t.openPrice, direction: t.direction }));

  document.querySelector('#trade').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ТЕРМИНАЛ</p>
        <h1>Торговля</h1>
        <p class="muted">Выплата +${Math.round(WIN_PAYOUT * 100)}% · шанс ~${Math.round(winChance() * 100)}% · RTP ~${expectedRtp()}%</p>
      </div>
      <div class="balance-chip">Счёт: <b>${money(state.balances.trade)}</b></div>
    </div>
    <div class="trade-terminal">
      <section class="panel trade-chart-panel">
        <div class="trade-assets">
          ${TRADE_ASSETS.map((a) => `<button type="button" class="asset-chip ${a.id === asset.id ? 'on' : ''}" data-asset="${a.id}">${a.name}</button>`).join('')}
        </div>
        <div class="trade-price-row">
          <strong id="live-price">${price.toLocaleString('ru-RU')}</strong>
          <span>${asset.name}</span>
        </div>
        <div id="chart-host">${sparkSvg(series, entries)}</div>
        <div class="open-strip">
          ${
            state.trading.open.length
              ? state.trading.open
                  .map((t) => {
                    const left = Math.max(0, Math.ceil((t.expiresAt - Date.now()) / 1000));
                    return `<div class="open-pill">${getAsset(t.assetId).symbol} ${t.direction === 'call' ? '↑' : '↓'} вход ${t.openPrice} · ${money(t.stake)} · <span data-open-timer="${t.id}">${left}с</span></div>`;
                  })
                  .join('')
              : '<span class="muted">Нет активных позиций · линия входа появится после сделки</span>'
          }
        </div>
      </section>
      <section class="panel trade-ticket">
        <p class="eyebrow">НОВАЯ СДЕЛКА</p>
        <label>Время
          <select id="trade-timeframe">
            ${TIMEFRAMES.map((t) => `<option value="${t.id}" ${t.id === tf.id ? 'selected' : ''}>${t.label} · +92%</option>`).join('')}
          </select>
        </label>
        <label>Ставка SC
          <input id="trade-stake" type="number" min="${MIN_TRADE}" max="${MAX_TRADE}" step="1" value="100" />
        </label>
        <div class="payout-box">
          При победе: <strong>+92%</strong><br>
          <span class="muted">100 SC → +92 SC (итого 192 SC). Проигрыш = −100 SC.</span>
        </div>
        <div class="trade-actions">
          <button type="button" class="call-btn" id="trade-call">Call ↑</button>
          <button type="button" class="put-btn" id="trade-put">Put ↓</button>
        </div>
        <p class="muted tight">Пунктир на графике — линия входа по открытой сделке.</p>
      </section>
    </div>
    <section class="panel" style="margin-top:16px">
      <div class="panel-heading"><div><p class="eyebrow">ИСТОРИЯ</p><h2>Закрытые сделки</h2></div></div>
      ${
        state.trading.history.length
          ? `<div class="history-list">${state.trading.history
              .slice(0, 12)
              .map((t) => {
                const r = t.result;
                return `<div class="history-row"><div><strong>${getAsset(t.assetId).symbol} ${t.direction === 'call' ? 'Call' : 'Put'}</strong>
                  <span>вход ${t.openPrice} → ${r?.closePrice ?? '—'} · ${formatDate(t.closedAt || t.openedAt)}</span></div>
                  <div class="history-meta"><b class="${r?.won ? 'pos' : 'neg'}">${r?.won ? `+${moneyPlain(r.profit)}` : `−${moneyPlain(t.stake)}`} SC</b></div></div>`;
              })
              .join('')}</div>`
          : `<div class="empty-state compact"><strong>История пуста</strong></div>`
      }
    </section>
  `;
}

function renderWithdrawals() {
  const available = state.balances.withdraw;
  const canWithdraw = available >= MIN_WITHDRAW_SC;
  const need = Math.max(0, MIN_WITHDRAW_SC - available);
  const pct = Math.min(100, (available / MIN_WITHDRAW_SC) * 100);
  document.querySelector('#withdrawals').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ФИНАНСЫ</p>
        <h1>Вывод Swape Coin</h1>
        <p class="muted">Переведите SC с торгового счёта</p>
      </div>
      <button class="outline-button" type="button" id="open-transfer">С торгового счёта</button>
    </div>
    <div class="withdraw-layout">
      <section class="withdraw-card">
        <div class="withdraw-card-top"><span>ДОСТУПНО К ВЫВОДУ</span></div>
        <strong>${moneyPlain(available)} <small>SC</small></strong>
        <p class="muted tight">≈ ${rubMoney(scToRub(available), 2)}</p>
        <div class="withdraw-progress">
          <div><span>До минимума</span><b>${money(need)}</b></div>
          <div class="progress"><i style="width:${pct}%"></i></div>
        </div>
        ${
          canWithdraw
            ? `<form id="withdraw-form" class="withdraw-form">
                <label>Сумма SC<input name="amount" type="number" min="${MIN_WITHDRAW_SC}" max="${available}" step="1" value="${Math.floor(available)}" required /></label>
                <p class="muted tight" id="withdraw-rub-hint">≈ ${rubMoney(scToRub(Math.floor(available)), 2)}</p>
                <label>Способ<select name="method"><option value="card">Карта</option><option value="sbp">СБП</option></select></label>
                <label>Реквизиты<input name="requisites" required value="${state.user.payoutRequisites || ''}" /></label>
                <button class="primary-button" type="submit">Заказать выплату</button>
              </form>`
            : `<button class="primary-button disabled-button" disabled>Заказать выплату</button>
               <p class="disabled-note">Нужно ещё ${money(need)}</p>`
        }
      </section>
      <section class="panel history-panel">
        <div class="panel-heading"><div><p class="eyebrow">ИСТОРИЯ</p><h2>Заявки</h2></div></div>
        ${
          state.withdrawals.length
            ? `<div class="history-list">${state.withdrawals
                .map(
                  (w) => `<div class="history-row"><div><strong>${money(w.amount)}</strong><span>${w.methodLabel}</span></div>
                  <div class="history-meta"><span class="status-pill ${w.status}">${w.statusLabel}</span></div></div>`
                )
                .join('')}</div>`
            : `<div class="empty-state"><strong>Пока пусто</strong></div>`
        }
      </section>
    </div>
  `;
}

function renderPartners() {
  const url = `swipe.example/r/${state.user.referralCode}`;
  const tier = referralTier(state);
  const next = nextReferralTier(state);
  const bonusTotal = state.referrals.reduce((s, r) => s + (r.bonus || 0), 0);
  const qualified = qualifiedReferrals(state).length;
  const streak = state.bonuses?.streak || 0;
  const nextDaily = dailyTradeBonusAmount(Math.min(7, streak + 1));
  const gotToday = state.bonuses?.lastBonusDate === new Date().toISOString().slice(0, 10);

  document.querySelector('#partners').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ПАРТНЁРКА</p>
        <h1>Партнёры и ежедневный бонус</h1>
        <p class="muted">Affiliate share + бонус за ставку каждый день</p>
      </div>
    </div>

    <div class="bonus-hero">
      <div>
        <p class="eyebrow">ЕЖЕДНЕВНАЯ СТАВКА</p>
        <strong>${streak} дн.</strong>
        <p>Сделайте хотя бы одну сделку сегодня — бонус начислится автоматически. Сейчас за следующий день: +${nextDaily} SC.</p>
      </div>
      <div class="bonus-actions">
        <button class="primary-button compact-btn" type="button" data-open-section="trade">
          ${gotToday ? 'Бонус сегодня получен' : 'Сделать ставку'}
        </button>
        <span class="muted">${gotToday ? 'Приходите завтра' : 'Бонус после первой сделки дня'}</span>
      </div>
    </div>

    <div class="referral-hero">
      <div class="referral-copy">
        <span class="eyebrow">ВАША ССЫЛКА</span>
        <h2>Приводите трейдеров</h2>
        <p>Уровень «${tier.name}»: ${(tier.rate * 100).toFixed(0)}% от проигранных ставок приглашённых — не от доната.</p>
        <div class="referral-link"><span id="referral-url">${url}</span><button type="button" id="copy-referral">Копировать</button></div>
        <div class="partner-actions">
          <button class="ghost-button" type="button" id="simulate-referral">Добавить в воронку</button>
          <button class="primary-button compact-btn" type="button" id="advance-funnel">Продвинуть до сделки</button>
        </div>
      </div>
      <div class="orbital"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="ref-symbol">S</div></div>
    </div>

    <div class="partner-stats">
      <article><span>В воронке</span><strong>${state.referrals.length}</strong><small>человек</small></article>
      <article><span>Со сделками</span><strong>${qualified}</strong><small>квалификация</small></article>
      <article><span>Affiliate</span><strong>${money(bonusTotal)}</strong><small>с проигрышей</small></article>
      <article><span>Уровень</span><strong>${tier.name}</strong><small>${next ? `до ${next.name}: ${next.min}` : 'макс'}</small></article>
    </div>

    <section class="panel funnel-panel">
      <div class="panel-heading"><div><p class="eyebrow">ВОРОНКА</p><h2>Статусы</h2></div></div>
      ${
        state.referrals.length
          ? `<div class="history-list">${state.referrals
              .map((r) => {
                const stageIndex = REFERRAL_STAGES.findIndex((s) => s.id === r.stage);
                return `<div class="history-row referral-row"><div><strong>${r.name}</strong><span>${r.email}</span>
                  <div class="stage-track">${REFERRAL_STAGES.map((s, i) => `<i class="${i <= stageIndex ? 'on' : ''}"></i>`).join('')}</div></div>
                  <div class="history-meta"><span class="status-pill">${REFERRAL_STAGES.find((s) => s.id === r.stage)?.label}</span>
                  <b class="pos">${r.bonus ? `+${money(r.bonus)}` : '—'}</b></div></div>`;
              })
              .join('')}</div>`
          : `<div class="empty-state compact"><strong>Пусто</strong><p>Добавьте демо-реферала.</p></div>`
      }
    </section>
  `;
}

function renderActivity() {
  document.querySelector('#activity').innerHTML = `
    <div class="welcome-row">
      <div><p class="eyebrow">ИСТОРИЯ</p><h1>Операции</h1></div>
      <select id="activity-filter">
        <option value="all">Все</option>
        <option value="deposit">Донаты</option>
        <option value="trade">Сделки</option>
        <option value="bonus">Бонусы</option>
        <option value="withdraw">Выводы</option>
      </select>
    </div>
    <section class="panel"><div id="activity-list" class="history-list tall"></div></section>
  `;
  paintActivity();
}

function paintActivity() {
  const list = document.querySelector('#activity-list');
  if (!list) return;
  const filter = document.querySelector('#activity-filter')?.value || 'all';
  const items = state.transactions.filter((t) => filter === 'all' || t.type === filter);
  list.innerHTML = items.length
    ? items
        .map(
          (tx) => `<div class="history-row"><div><strong>${tx.title}</strong><span>${tx.detail}</span></div>
        <div class="history-meta"><b class="${tx.amount >= 0 ? 'pos' : 'neg'}">${tx.amount >= 0 ? '+' : ''}${moneyPlain(tx.amount)} SC</b>
        <time>${formatDate(tx.at)}</time></div></div>`
        )
        .join('')
    : `<div class="empty-state"><strong>Пусто</strong></div>`;
}

function renderFaq() {
  document.querySelector('#faq').innerHTML = `
    <div class="welcome-row"><div><p class="eyebrow">FAQ</p><h1>Частые вопросы</h1></div></div>
    <div class="risk-banner"><strong>Важно</strong><p>Нет гарантированной прибыли. При закрытии сайта SC могут пропасть.</p></div>
    <div class="faq-list">${FAQ_ITEMS.map((item, i) => `<details class="faq-item" ${i === 0 ? 'open' : ''}><summary>${item.q}</summary><p>${item.a}</p></details>`).join('')}</div>
  `;
}

function renderPrivacy() {
  document.querySelector('#privacy').innerHTML = `
    <div class="welcome-row"><div><p class="eyebrow">ДОКУМЕНТЫ</p><h1>Политика и риски</h1></div></div>
    <article class="legal-doc panel">
      <h2>Модель</h2>
      <p>Донат ₽ → SC → сделки Call/Put (+92% / потеря ставки). Пассивного дохода нет.</p>
      <div class="legal-alert"><p><strong>Не несём ответственности</strong>, если сайт закроется и SC пропадут.</p></div>
      <p><a href="mailto:help@swipe.example">help@swipe.example</a></p>
    </article>
  `;
}

function renderSettings() {
  const u = state.user;
  document.querySelector('#settings').innerHTML = `
    <div class="welcome-row"><div><p class="eyebrow">АККАУНТ</p><h1>Настройки</h1></div></div>
    <div class="settings-grid">
      <form id="profile-form" class="panel settings-form">
        <p class="eyebrow">ПРОФИЛЬ</p>
        <label>Имя<input name="name" required value="${u.name}" /></label>
        <label>Email<input name="email" type="email" required value="${u.email}" /></label>
        <label>Реквизиты<input name="payoutRequisites" value="${u.payoutRequisites || ''}" /></label>
        <button class="primary-button" type="submit">Сохранить</button>
      </form>
      <form id="security-form" class="panel settings-form">
        <p class="eyebrow">БЕЗОПАСНОСТЬ</p>
        <label>Новый пароль<input name="password" type="password" minlength="6" placeholder="Необязательно" /></label>
        <label class="check-row"><input name="twoFactor" type="checkbox" ${u.twoFactor ? 'checked' : ''} /> 2FA (демо)</label>
        <button class="primary-button" type="submit">Обновить</button>
        <button class="ghost-button danger-outline" type="button" id="reset-demo">Сбросить демо</button>
      </form>
    </div>
  `;
}

function render() {
  if (!state.auth.loggedIn) return;
  updateChrome();
  renderNotifications();
  const active = document.querySelector('.page-section.active')?.id || 'overview';
  if (active === 'overview') renderOverview();
  if (active === 'trade') renderTrade();
  if (active === 'withdrawals') renderWithdrawals();
  if (active === 'partners') renderPartners();
  if (active === 'activity') renderActivity();
  if (active === 'faq') renderFaq();
  if (active === 'privacy') renderPrivacy();
  if (active === 'settings') renderSettings();
}

function showAuth(loggedIn) {
  els.auth.hidden = loggedIn;
  els.app.hidden = !loggedIn;
  if (loggedIn) {
    const hash = window.location.hash.slice(1);
    showSection(TITLE_MAP[hash] ? hash : 'overview');
    if (!chartTimer) chartTimer = setInterval(tickPrices, 1000);
  }
}

function openDeposit() {
  openModal(`
    <h2 id="modal-title">Донат → SC</h2>
    <form id="deposit-form" class="modal-form">
      <label>Сумма, ₽<input name="amount" type="number" min="10" value="100" required /></label>
      <p class="muted">1 ₽ = ${RUB_TO_SC} SC на торговый счёт.</p>
      <div class="modal-actions">
        <button class="ghost-button" type="button" data-close-modal>Отмена</button>
        <button class="primary-button" type="submit">Донатнуть</button>
      </div>
    </form>
  `);
}

function openTransfer() {
  openModal(`
    <h2 id="modal-title">На баланс вывода</h2>
    <form id="transfer-form" class="modal-form">
      <label>Сумма SC<input name="amount" type="number" min="1" max="${state.balances.trade}" value="${Math.min(500, Math.floor(state.balances.trade))}" required /></label>
      <p class="muted">Доступно: ${money(state.balances.trade)}</p>
      <div class="modal-actions">
        <button class="ghost-button" type="button" data-close-modal>Отмена</button>
        <button class="primary-button" type="submit">Перевести</button>
      </div>
    </form>
  `);
}

function simulateReferral() {
  const names = ['Мария С.', 'Игорь В.', 'Ольга Н.', 'Дмитрий П.', 'Елена Р.'];
  const name = names[state.referrals.length % names.length];
  state.referrals.unshift({
    id: makeId('ref'),
    name,
    email: `${name.split(' ')[0].toLowerCase()}@mail.example`,
    stage: 'invited',
    bonus: 0,
    at: Date.now(),
  });
  persist();
  showToast(`${name} в воронке`);
  render();
}

function advanceFunnel() {
  const target = state.referrals.find((r) => r.stage !== 'active');
  if (!target) return showToast('Добавьте реферала');
  const order = ['invited', 'registered', 'traded', 'active'];
  const next = order[Math.min(order.length - 1, order.indexOf(target.stage) + 1)];
  target.stage = next;
  if (next === 'traded') {
    const lost = 200;
    const cut = referralCutOnLoss(state, lost);
    target.bonus = Number(((target.bonus || 0) + cut).toFixed(2));
    state.balances.withdraw = Number((state.balances.withdraw + cut).toFixed(2));
    addTransaction({ type: 'bonus', title: 'Affiliate share', detail: `${target.name} · loss ${money(lost)}`, amount: cut, balance: 'withdraw' });
    showToast(`Реферал проиграл сделку · вам +${money(cut)}`);
  }
  persist();
  render();
}

function bindGlobal() {
  document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-auth-tab]').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelector('#login-form').hidden = tab.dataset.authTab !== 'login';
      document.querySelector('#register-form').hidden = tab.dataset.authTab !== 'register';
    });
  });

  document.querySelector('#login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const email = String(data.get('email')).trim().toLowerCase();
    const password = String(data.get('password'));
    if (email === state.user.email && password === state.user.password) {
      state.auth.loggedIn = true;
      persist();
      showToast('С возвращением');
      showAuth(true);
    } else showToast('Неверный логин или пароль');
  });

  document.querySelector('#register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const name = String(data.get('name')).trim();
    state.user = {
      ...state.user,
      name,
      firstName: firstNameFrom(name),
      email: String(data.get('email')).trim().toLowerCase(),
      password: String(data.get('password')),
      initials: initialsFromName(name),
      status: 'Стандарт',
      referralCode: String(data.get('email')).split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16) || 'user',
    };
    state.auth.loggedIn = true;
    state.balances = { trade: rubToSc(250), withdraw: 0 };
    state.trading = { assetId: 'btc', timeframeId: '60', prices: {}, history: [], open: [], stats: { trades: 0, wins: 0, losses: 0, volume: 0, pnl: 0 } };
    state.bonuses = { streak: 0, lastTradeDate: null, lastBonusDate: null };
    state.referrals = [];
    state.transactions = [{ id: makeId('tx'), type: 'deposit', title: 'Стартовый донат', detail: `250 ₽ × ${RUB_TO_SC}`, amount: rubToSc(250), balance: 'trade', at: Date.now() }];
    persist();
    showToast('Аккаунт создан');
    showAuth(true);
  });

  document.querySelector('#login-form').email.value = 'alexey@example.com';
  document.querySelector('#login-form').password.value = 'demo1234';

  document.addEventListener('click', (e) => {
    if (e.target.closest('#notify-btn')) {
      const open = els.notifyPanel.hidden;
      closeMenus();
      els.notifyPanel.hidden = !open;
      return;
    }
    if (e.target.closest('#profile-menu-btn') || e.target.closest('#top-avatar')) {
      if (window.matchMedia('(max-width: 700px)').matches && e.target.closest('#top-avatar')) return showSection('settings');
      const open = els.profileMenu.hidden;
      closeMenus();
      els.profileMenu.hidden = !open;
      return;
    }
    if (!e.target.closest('.notify-panel') && !e.target.closest('.profile-menu')) {
      if (!els.notifyPanel.hidden || !els.profileMenu.hidden) closeMenus();
    }

    const t = e.target.closest('[data-open], a[href^="#"], [data-open-section], [data-close-modal], [data-notify-id], [data-asset]');
    if (t?.hasAttribute('data-close-modal')) return closeModal();
    if (t?.dataset.openSection) return showSection(t.dataset.openSection);
    if (t?.dataset.open || (t?.getAttribute('href') || '').startsWith('#')) {
      const id = t.dataset.open || t.getAttribute('href').slice(1);
      if (document.getElementById(id)) {
        e.preventDefault();
        showSection(id);
      }
      return;
    }
    if (t?.dataset.asset) {
      ensureTrading();
      state.trading.assetId = t.dataset.asset;
      persist();
      renderTrade();
      return;
    }
    if (t?.dataset.notifyId) {
      const n = state.notifications.find((x) => x.id === t.dataset.notifyId);
      if (n) {
        n.read = true;
        persist();
        renderNotifications();
        updateChrome();
      }
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'trade-timeframe') {
      state.trading.timeframeId = e.target.value;
      persist();
      renderTrade();
    }
    if (e.target.id === 'activity-filter') paintActivity();
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'deposit-form') {
      e.preventDefault();
      const rubAmount = Number(new FormData(e.target).get('amount'));
      if (rubAmount < 10) return showToast('Минимум 10 ₽');
      const amount = rubToSc(rubAmount);
      state.balances.trade = Number((state.balances.trade + amount).toFixed(2));
      addTransaction({ type: 'deposit', title: 'Донат → SC', detail: `${rubMoney(rubAmount)} × ${RUB_TO_SC}`, amount, balance: 'trade' });
      persist();
      closeModal();
      showToast(`+${money(amount)}`);
      render();
    }
    if (e.target.id === 'transfer-form') {
      e.preventDefault();
      const amount = Number(new FormData(e.target).get('amount'));
      const result = moveToWithdraw(state, amount);
      if (!result.ok) return showToast(result.reason);
      addTransaction({ type: 'withdraw', title: 'Перевод на вывод', detail: 'trade → withdraw', amount: -amount, balance: 'trade' });
      addTransaction({ type: 'deposit', title: 'Зачисление на вывод', detail: 'из торгового счёта', amount, balance: 'withdraw' });
      persist();
      closeModal();
      showToast(`Переведено ${money(amount)}`);
      render();
    }
    if (e.target.id === 'withdraw-form') {
      e.preventDefault();
      const data = new FormData(e.target);
      const amount = Number(data.get('amount'));
      if (amount < MIN_WITHDRAW_SC || amount > state.balances.withdraw) return showToast('Проверьте сумму');
      state.balances.withdraw = Number((state.balances.withdraw - amount).toFixed(2));
      state.user.payoutRequisites = String(data.get('requisites') || '');
      state.withdrawals.unshift({
        id: makeId('w'),
        amount,
        methodLabel: data.get('method') === 'sbp' ? 'СБП' : 'Карта',
        status: 'pending',
        statusLabel: 'В обработке',
        at: Date.now(),
      });
      addTransaction({ type: 'withdraw', title: 'Заявка на вывод', detail: 'SC → ₽', amount: -amount, balance: 'withdraw' });
      persist();
      showToast('Заявка создана');
      setTimeout(() => {
        const w = state.withdrawals[0];
        if (w?.status === 'pending') {
          w.status = 'done';
          w.statusLabel = 'Выполнено';
          persist();
          if (document.querySelector('.page-section.active')?.id === 'withdrawals') render();
        }
      }, 3500);
      render();
    }
    if (e.target.id === 'profile-form') {
      e.preventDefault();
      const data = new FormData(e.target);
      const name = String(data.get('name')).trim();
      state.user.name = name;
      state.user.firstName = firstNameFrom(name);
      state.user.email = String(data.get('email')).trim().toLowerCase();
      state.user.initials = initialsFromName(name);
      state.user.payoutRequisites = String(data.get('payoutRequisites') || '');
      persist();
      showToast('Профиль сохранён');
      render();
    }
    if (e.target.id === 'security-form') {
      e.preventDefault();
      const data = new FormData(e.target);
      if (data.get('password')) state.user.password = String(data.get('password'));
      state.user.twoFactor = Boolean(data.get('twoFactor'));
      persist();
      showToast('Безопасность обновлена');
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#open-deposit')) openDeposit();
    if (e.target.closest('#open-transfer')) openTransfer();
    if (e.target.closest('#trade-call')) openTrade('call');
    if (e.target.closest('#trade-put')) openTrade('put');
    if (e.target.closest('#copy-referral')) {
      const url = document.querySelector('#referral-url')?.textContent || '';
      navigator.clipboard?.writeText(`https://${url}`).then(() => showToast('Скопировано'), () => showToast(url));
    }
    if (e.target.closest('#simulate-referral')) simulateReferral();
    if (e.target.closest('#advance-funnel')) advanceFunnel();
    if (e.target.closest('#mark-all-read')) {
      state.notifications.forEach((n) => {
        n.read = true;
      });
      persist();
      renderNotifications();
      updateChrome();
    }
    if (e.target.closest('#logout-btn')) {
      state.auth.loggedIn = false;
      persist();
      closeMenus();
      closeModal();
      showAuth(false);
      showToast('Вы вышли');
    }
    if (e.target.closest('#reset-demo')) {
      ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'].forEach((v) => localStorage.removeItem(`swipe-cabinet-${v}`));
      state = loadState();
      state.auth.loggedIn = true;
      persist();
      showToast('Демо сброшено');
      showSection('overview');
    }
    if (e.target.closest('#open-support')) {
      openModal(`<h2 id="modal-title">Поддержка</h2><p class="prose">help@swipe.example</p><div class="modal-actions"><button class="primary-button" data-close-modal>OK</button></div>`);
    }
    if (e.target.closest('#open-terms-btn')) {
      openModal(`<h2 id="modal-title">Условия</h2><div class="prose"><p>Торговый демо-кабинет. Выплата +92%. Риск потери ставки. При закрытии сайта средства могут пропасть.</p></div><div class="modal-actions"><button class="primary-button" data-close-modal>OK</button></div>`);
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.closest('#withdraw-form') && e.target.name === 'amount') {
      const hint = document.querySelector('#withdraw-rub-hint');
      if (hint) hint.textContent = `≈ ${rubMoney(scToRub(Number(e.target.value) || 0), 2)}`;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeMenus();
    }
  });
}

bindGlobal();
showAuth(state.auth.loggedIn);
if (state.auth.loggedIn) chartTimer = setInterval(tickPrices, 1000);
