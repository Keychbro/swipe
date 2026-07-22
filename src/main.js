import './style.css';
import {
  TRADE_ASSETS,
  TIMEFRAMES,
  MIN_TRADE,
  MAX_TRADE,
  getAsset,
  getTimeframe,
  payoutRate,
  winChance,
  nextPrice,
  buildSparkline,
  resolveTrade,
  expectedRtp,
} from './trading.js';
import {
  WHEEL_SEGMENTS,
  wheelRtp,
  pickWheelSegment,
  wheelRotationForIndex,
  MINES_GRID,
  MINES_OPTIONS,
  createMinesBoard,
  minesMultiplier,
  nextMinesMultiplier,
  revealMineCell,
  cashOutMines,
  MIN_BET,
  MAX_BET,
} from './games.js';
import {
  VIP_PACK,
  REFERRAL_TIERS,
  REFERRAL_STAGES,
  MISSIONS,
  ACHIEVEMENTS,
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
  canClaimDaily,
  dailyRewardAmount,
  claimDailyBonus,
  activateBoost,
  claimMission,
  claimAchievement,
  moveToWithdraw,
} from './state.js';

let state = loadState();
let wheelAngle = 0;
let wheelBusy = false;
let chartTimer = null;

const TITLE_MAP = {
  overview: 'Обзор',
  trade: 'Торговля',
  withdrawals: 'Вывод средств',
  partners: 'Партнёрская программа',
  bonuses: 'Бонусы',
  games: 'Игры',
  activity: 'Операции',
  faq: 'FAQ',
  privacy: 'Конфиденциальность',
  settings: 'Настройки',
};

const FAQ_ITEMS = [
  {
    q: 'Это пирамида? Откуда деньги?',
    a: 'Нет пассивного дохода «из воздуха» и нет окупаемых карточек. SC появляются после доната. На сделках Call/Put вы рискуете ставкой: при проигрыше SC сгорают, при выигрыше выплата меньше чем ×2 (house edge). Платформа зарабатыет на отрицательном мат.ожидании сделок, а не на наборе вкладчиков.',
  },
  {
    q: 'Как устроена торговля?',
    a: `Выбираете актив, время, ставку и направление Call (вверх) или Put (вниз). Если угадали — получаете ставку + выплату (~${Math.round(payoutRate('60', false) * 100)}%). Если нет — теряете ставку. Базовый шанс победы ~${Math.round(winChance(false) * 100)}% (ниже 50%).`,
  },
  {
    q: 'Что такое Swape Coin?',
    a: `Внутренняя валюта. Донат: 1 ₽ = ${RUB_TO_SC} SC. Торговля и игры — в SC. Вывод от ${MIN_WITHDRAW_SC} SC обратно в ₽ по тому же курсу.`,
  },
  {
    q: 'Зачем VIP?',
    a: `VIP Трейдер за ${VIP_PACK.priceRub.toLocaleString('ru-RU')} ₽ улучшает условия сделок (чуть выше выплата и шанс), но не гарантирует прибыль и не начисляет пассивный доход.`,
  },
  {
    q: 'Как работает партнёрка?',
    a: 'Доля от проигрышей приглашённых (share of house), а не процент от их доната. Нет оплаты за «просто привёл человека положить деньги».',
  },
  {
    q: 'Что если сайт закроется?',
    a: 'SC, сделки и заявки на вывод могут пропасть без компенсации. Администрация не несёт ответственности за утрату средств.',
  },
];

const els = {
  auth: document.querySelector('#auth-screen'),
  app: document.querySelector('#app-shell'),
  toast: document.querySelector('.toast'),
  modalRoot: document.querySelector('#modal-root'),
  modalBody: document.querySelector('#modal-body'),
  tooltip: document.querySelector('#tooltip'),
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
    if (series.length > 60) series.shift();
    state.trading.prices[asset.id] = series;
  });
  settleDueTrades();
  const active = document.querySelector('.page-section.active')?.id;
  if (active === 'trade') paintChartOnly();
  else if (active === 'overview') {
    /* light update */
  }
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
  if (active === 'trade' || active === 'overview' || active === 'activity') render();
}

function settleTrade(trade) {
  const asset = getAsset(trade.assetId);
  const result = resolveTrade({
    direction: trade.direction,
    openPrice: trade.openPrice,
    stake: trade.stake,
    payout: trade.payout,
    isVip: state.user.vip,
    asset,
  });
  trade.closed = true;
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
      detail: `Выигрыш · +${Math.round(trade.payout * 100)}%`,
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
    // referral cut from house edge on loss
    const cut = referralCutOnLoss(state, trade.stake);
    if (cut > 0 && state.referrals.some((r) => ['traded', 'active'].includes(r.stage))) {
      // demo: credit to own withdraw as "affiliate pool" simplification when user is the referrer simulating friends
    }
    showToast(`Lose · −${money(trade.stake)}`);
  }
  state.trading.history.unshift({ ...trade, result, closedAt: Date.now() });
  state.trading.history = state.trading.history.slice(0, 40);
  state.bonuses.xp = (state.bonuses.xp || 0) + 8;
}

function openTrade(direction) {
  ensureTrading();
  const stake = Number(document.querySelector('#trade-stake')?.value);
  const assetId = state.trading.assetId;
  const timeframeId = state.trading.timeframeId;
  if (!Number.isFinite(stake) || stake < MIN_TRADE) {
    showToast(`Минимум ${MIN_TRADE} SC`);
    return;
  }
  if (stake > MAX_TRADE) {
    showToast(`Максимум ${MAX_TRADE} SC`);
    return;
  }
  if (stake > state.balances.trade) {
    showToast('Недостаточно SC на торговом счёте');
    return;
  }
  const tf = getTimeframe(timeframeId);
  const payout = payoutRate(timeframeId, state.user.vip);
  const openPrice = currentPrice(assetId);
  state.balances.trade = Number((state.balances.trade - stake).toFixed(2));
  const trade = {
    id: makeId('tr'),
    assetId,
    direction,
    stake,
    payout,
    openPrice,
    openedAt: Date.now(),
    expiresAt: Date.now() + tf.seconds * 1000,
    timeframeId,
  };
  state.trading.open.unshift(trade);
  persist();
  showToast(`${direction === 'call' ? 'Call' : 'Put'} · ${money(stake)} · ${tf.label}`);
  render();
}

function sparkSvg(series, width = 560, height = 200) {
  if (!series?.length) return '';
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * width;
      const y = height - ((v - min) / span) * (height - 16) - 8;
      return `${x},${y}`;
    })
    .join(' ');
  const last = series[series.length - 1];
  const up = series[series.length - 1] >= series[0];
  return `
    <svg class="trade-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <polyline fill="none" stroke="${up ? '#65d5ad' : '#ef8d86'}" stroke-width="2.5" points="${pts}" />
      <circle cx="${width}" cy="${height - ((last - min) / span) * (height - 16) - 8}" r="4" fill="${up ? '#65d5ad' : '#ef8d86'}" />
    </svg>`;
}

function paintChartOnly() {
  const host = document.querySelector('#chart-host');
  const priceEl = document.querySelector('#live-price');
  if (!host) return;
  ensureTrading();
  const asset = getAsset(state.trading.assetId);
  const series = state.trading.prices[asset.id] || [];
  host.innerHTML = sparkSvg(series);
  if (priceEl) priceEl.textContent = currentPrice(asset.id).toLocaleString('ru-RU');
  document.querySelectorAll('[data-open-timer]').forEach((el) => {
    const id = el.dataset.openTimer;
    const trade = state.trading.open.find((t) => t.id === id);
    if (!trade) return;
    const left = Math.max(0, Math.ceil((trade.expiresAt - Date.now()) / 1000));
    el.textContent = `${left}с`;
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
  document.querySelector('#sidebar-status').textContent = user.vip ? 'Статус: VIP Трейдер' : `Статус: ${user.status}`;
  const unread = state.notifications.filter((n) => !n.read).length;
  els.notifyDot.hidden = unread === 0;
}

function renderNotifications() {
  if (!state.notifications.length) {
    els.notifyList.innerHTML = `<div class="empty-mini">Пока нет уведомлений</div>`;
    return;
  }
  els.notifyList.innerHTML = state.notifications
    .slice(0, 8)
    .map(
      (n) => `
      <article class="notify-item ${n.read ? '' : 'unread'}" data-notify-id="${n.id}">
        <strong>${n.title}</strong>
        <p>${n.body}</p>
        <time>${formatDate(n.at)}</time>
      </article>`
    )
    .join('');
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
        <p class="muted">Нет пассивных карточек. SC только через донат, сделки и бонусы с вейджером риска.</p>
      </div>
      <div class="welcome-actions">
        <button class="primary-button compact-btn" type="button" data-open-section="trade">Открыть терминал</button>
        <button class="ghost-button" type="button" id="open-deposit">Донат</button>
      </div>
    </div>

    <div class="risk-banner">
      <strong>Не пирамида и не «доход из воздуха»</strong>
      <p>Сделки Call/Put: шанс ниже 50%, выплата при победе &lt; 100% прибыли. На дистанции математика у платформы. Вы можете потерять всю ставку.</p>
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
        <div class="metric-title">PnL / RTP демо</div>
        <strong class="${stats.pnl >= 0 ? 'pos' : 'neg'}">${stats.pnl >= 0 ? '+' : ''}${moneyPlain(stats.pnl)}</strong>
        <p>Сделок ${stats.trades} · Win ${stats.wins} · RTP ~${expectedRtp(state.user.vip)}%</p>
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
                  return `<div class="history-row">
                    <div><strong>${getAsset(t.assetId).symbol} ${t.direction === 'call' ? 'Call ↑' : 'Put ↓'}</strong>
                    <span>Ставка ${money(t.stake)} · вход ${t.openPrice}</span></div>
                    <div class="history-meta"><span class="status-pill">${left}с</span></div>
                  </div>`;
                })
                .join('')}</div>`
            : `<div class="empty-state compact"><strong>Нет открытых сделок</strong><p>Откройте Call или Put в терминале.</p></div>`
        }
      </section>
      <section class="panel disclosure-panel">
        <div class="panel-heading"><div><p class="eyebrow">ЛЕНТА</p><h2>Последние операции</h2></div></div>
        <div class="mini-feed">
          ${recent
            .map(
              (tx) => `<div class="mini-row">
              <div><strong>${tx.title}</strong><span>${tx.detail}</span></div>
              <b class="${tx.amount >= 0 ? 'pos' : 'neg'}">${tx.amount >= 0 ? '+' : ''}${moneyPlain(tx.amount)} SC</b>
            </div>`
            )
            .join('')}
        </div>
      </section>
    </div>
  `;
}

function renderTrade() {
  ensureTrading();
  const asset = getAsset(state.trading.assetId);
  const tf = getTimeframe(state.trading.timeframeId);
  const payout = payoutRate(state.trading.timeframeId, state.user.vip);
  const series = state.trading.prices[asset.id] || [];
  const price = currentPrice(asset.id);
  const canVip = !state.user.vip && state.balances.trade >= VIP_PACK.price;

  document.querySelector('#trade').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ТЕРМИНАЛ</p>
        <h1>Торговля</h1>
        <p class="muted">Call/Put · шанс ~${Math.round(winChance(state.user.vip) * 100)}% · выплата ${Math.round(payout * 100)}% · RTP ~${expectedRtp(state.user.vip)}%</p>
      </div>
      <div class="balance-chip">Счёт: <b>${money(state.balances.trade)}</b></div>
    </div>

    <div class="vip-pack ${state.user.vip ? 'owned' : ''}">
      <div>
        <p class="eyebrow">VIP ТРЕЙДЕР</p>
        <strong>${VIP_PACK.name} · ${rubMoney(VIP_PACK.priceRub)}</strong>
        <p>${VIP_PACK.desc}</p>
      </div>
      <button class="primary-button compact-btn vip-btn" type="button" id="buy-vip-pack" ${state.user.vip || !canVip ? 'disabled' : ''}>
        ${state.user.vip ? 'VIP активен' : canVip ? `Купить · ${money(VIP_PACK.price, 0)}` : 'Недостаточно SC'}
      </button>
    </div>

    <div class="trade-terminal">
      <section class="panel trade-chart-panel">
        <div class="trade-assets">
          ${TRADE_ASSETS.map(
            (a) => `<button type="button" class="asset-chip ${a.id === asset.id ? 'on' : ''}" data-asset="${a.id}">${a.name}</button>`
          ).join('')}
        </div>
        <div class="trade-price-row">
          <strong id="live-price">${price.toLocaleString('ru-RU')}</strong>
          <span>${asset.name}</span>
        </div>
        <div id="chart-host">${sparkSvg(series)}</div>
        <div class="open-strip">
          ${
            state.trading.open.length
              ? state.trading.open
                  .map((t) => {
                    const left = Math.max(0, Math.ceil((t.expiresAt - Date.now()) / 1000));
                    return `<div class="open-pill">${getAsset(t.assetId).symbol} ${t.direction === 'call' ? '↑' : '↓'} ${money(t.stake)} · <span data-open-timer="${t.id}">${left}с</span></div>`;
                  })
                  .join('')
              : '<span class="muted">Нет активных позиций</span>'
          }
        </div>
      </section>

      <section class="panel trade-ticket">
        <p class="eyebrow">НОВАЯ СДЕЛКА</p>
        <label>Время
          <select id="trade-timeframe">
            ${TIMEFRAMES.map((t) => `<option value="${t.id}" ${t.id === tf.id ? 'selected' : ''}>${t.label} · +${Math.round(payoutRate(t.id, state.user.vip) * 100)}%</option>`).join('')}
          </select>
        </label>
        <label>Ставка SC
          <input id="trade-stake" type="number" min="${MIN_TRADE}" max="${MAX_TRADE}" step="1" value="100" />
        </label>
        <div class="payout-box">
          Прибыль при победе: <strong>+${Math.round(payout * 100)}%</strong><br>
          <span class="muted">Ставка 100 SC → выигрыш +${money(100 * payout, 0)} (итого ${money(100 + 100 * payout, 0)}). Проигрыш = −100 SC.</span>
        </div>
        <div class="trade-actions">
          <button type="button" class="call-btn" id="trade-call">Call ↑</button>
          <button type="button" class="put-btn" id="trade-put">Put ↓</button>
        </div>
        <p class="muted tight">Демо-котировки. Исход с house edge — это не инвестиция и не гарантия дохода.</p>
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
                return `<div class="history-row">
                  <div><strong>${getAsset(t.assetId).symbol} ${t.direction === 'call' ? 'Call' : 'Put'}</strong>
                  <span>${t.openPrice} → ${r?.closePrice ?? '—'} · ${formatDate(t.closedAt || t.openedAt)}</span></div>
                  <div class="history-meta"><b class="${r?.won ? 'pos' : 'neg'}">${r?.won ? `+${moneyPlain(r.profit)}` : `−${moneyPlain(t.stake)}`} SC</b></div>
                </div>`;
              })
              .join('')}</div>`
          : `<div class="empty-state compact"><strong>История пуста</strong><p>Закрытые сделки появятся здесь.</p></div>`
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
        <p class="muted">Сначала переведите SC с торгового счёта на вывод</p>
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
          <small>Минимум ${MIN_WITHDRAW_SC} SC</small>
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
                  (w) => `<div class="history-row">
                  <div><strong>${money(w.amount)}</strong><span>${w.methodLabel} · ≈ ${rubMoney(scToRub(w.amount), 2)}</span></div>
                  <div class="history-meta"><span class="status-pill ${w.status}">${w.statusLabel}</span></div>
                </div>`
                )
                .join('')}</div>`
            : `<div class="empty-state"><strong>Пока пусто</strong><p>Заявки на вывод появятся здесь.</p></div>`
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
  document.querySelector('#partners').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ПАРТНЁРКА</p>
        <h1>Affiliate, не пирамида</h1>
        <p class="muted">Доля от проигрышей рефералов (house share), не % от доната.</p>
      </div>
    </div>
    <div class="referral-hero">
      <div class="referral-copy">
        <span class="eyebrow">ВАША ССЫЛКА</span>
        <h2>Приводите трейдеров,<br>не вкладчиков.</h2>
        <p>Ваш уровень «${tier.name}»: ${(tier.rate * 100).toFixed(0)}% от проигранных ставок приглашённых.</p>
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
      <article><span>С сделками</span><strong>${qualified}</strong><small>квалификация</small></article>
      <article><span>Бонусы</span><strong>${money(bonusTotal)}</strong><small>с проигрышей</small></article>
      <article><span>Уровень</span><strong>${tier.name}</strong><small>${next ? `до ${next.name}: ${next.min}` : 'макс'}</small></article>
    </div>
    <section class="panel funnel-panel">
      <div class="panel-heading"><div><p class="eyebrow">ВОРОНКА</p><h2>Статусы</h2></div></div>
      ${
        state.referrals.length
          ? `<div class="history-list">${state.referrals
              .map((r) => {
                const stageIndex = REFERRAL_STAGES.findIndex((s) => s.id === r.stage);
                return `<div class="history-row referral-row">
                  <div><strong>${r.name}</strong><span>${r.email}</span>
                  <div class="stage-track">${REFERRAL_STAGES.map((s, i) => `<i class="${i <= stageIndex ? 'on' : ''}"></i>`).join('')}</div></div>
                  <div class="history-meta"><span class="status-pill">${REFERRAL_STAGES.find((s) => s.id === r.stage)?.label}</span>
                  <b class="pos">${r.bonus ? `+${money(r.bonus)}` : '—'}</b></div>
                </div>`;
              })
              .join('')}</div>`
          : `<div class="empty-state compact"><strong>Пусто</strong><p>Добавьте демо-реферала.</p></div>`
      }
    </section>
  `;
}

function renderBonuses() {
  const boostOn = state.bonuses?.boostUntil && state.bonuses.boostUntil > Date.now();
  const claimedM = new Set(state.bonuses?.claimedMissions || []);
  const claimedA = new Set(state.bonuses?.claimedAchievements || []);
  document.querySelector('#bonuses').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ПРОГРЕСС</p>
        <h1>Бонусы</h1>
        <p class="muted">Награды за активность. Это не пассивный процент на депозит.</p>
      </div>
      <div class="balance-chip">Lvl <b>${state.bonuses?.level || 1}</b> · XP ${state.bonuses?.xp || 0}</div>
    </div>
    <div class="bonus-hero">
      <div>
        <p class="eyebrow">ЕЖЕДНЕВНЫЙ СТРИК</p>
        <strong>${state.bonuses?.streak || 0} дн.</strong>
        <p>Небольшой SC на торговый счёт. Дальше всё равно нужно рисковать в сделках.</p>
      </div>
      <div class="bonus-actions">
        <button class="primary-button compact-btn" type="button" id="claim-daily" ${canClaimDaily(state) ? '' : 'disabled'}>
          ${canClaimDaily(state) ? `Забрать +${dailyRewardAmount(state)} SC` : 'Уже сегодня'}
        </button>
        <button class="ghost-button" type="button" id="activate-boost" ${boostOn ? 'disabled' : ''}>XP буст ×1.5</button>
      </div>
    </div>
    <div class="two-column partner-tools">
      <section class="panel">
        <div class="panel-heading"><div><p class="eyebrow">МИССИИ</p><h2>На торговый счёт</h2></div></div>
        <div class="mission-list">
          ${MISSIONS.map((m) => {
            const done = m.check(state);
            const claimed = claimedM.has(m.id);
            return `<div class="mission-row ${done ? 'ready' : ''} ${claimed ? 'claimed' : ''}">
              <div><strong>${m.title}</strong><span>${m.detail}</span></div>
              <div class="mission-meta"><b class="pos">+${m.reward} SC</b>
              <button type="button" class="ghost-button" data-claim-mission="${m.id}" ${!done || claimed ? 'disabled' : ''}>${claimed ? 'Получено' : done ? 'Забрать' : 'В процессе'}</button></div>
            </div>`;
          }).join('')}
        </div>
      </section>
      <section class="panel">
        <div class="panel-heading"><div><p class="eyebrow">АЧИВКИ</p><h2>На вывод</h2></div></div>
        <div class="mission-list">
          ${ACHIEVEMENTS.map((m) => {
            const done = m.check(state);
            const claimed = claimedA.has(m.id);
            return `<div class="mission-row ${done ? 'ready' : ''} ${claimed ? 'claimed' : ''}">
              <div><strong>${m.title}</strong><span>${m.detail}</span></div>
              <div class="mission-meta"><b class="pos">+${m.reward} SC</b>
              <button type="button" class="ghost-button" data-claim-achievement="${m.id}" ${!done || claimed ? 'disabled' : ''}>${claimed ? 'Получено' : done ? 'Забрать' : 'Закрыто'}</button></div>
            </div>`;
          }).join('')}
        </div>
      </section>
    </div>
  `;
}

function playBalance() {
  return state.balances.trade;
}

function renderGames() {
  const stats = state.games?.stats || {};
  const mines = state.games?.mines;
  const rtp = wheelRtp();
  const currentMult =
    mines && !mines.busted && !mines.cashed ? minesMultiplier(mines.revealed.length, mines.mineCount, mines.grid) : 1;
  const potential = mines ? Number((mines.bet * currentMult).toFixed(2)) : 0;

  document.querySelector('#games').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">РАЗВЛЕЧЕНИЯ</p>
        <h1>Игры</h1>
        <p class="muted">House edge · не инвестиция. Колесо RTP ~${rtp}%</p>
      </div>
      <div class="balance-chip">Счёт: <b>${money(playBalance())}</b></div>
    </div>
    <div class="games-layout">
      <section class="panel game-panel">
        <div class="panel-heading"><div><p class="eyebrow">КОЛЕСО</p><h2>Фортуна</h2></div><span class="tag">RTP ~${rtp}%</span></div>
        <div class="wheel-wrap">
          <div class="wheel-pointer"></div>
          <div class="wheel" id="fortune-wheel" style="transform: rotate(${wheelAngle}deg); --wheel-bg: ${WHEEL_SEGMENTS.map((seg, i) => {
            const slice = 100 / WHEEL_SEGMENTS.length;
            return `${seg.color} ${i * slice}% ${(i + 1) * slice}%`;
          }).join(', ')}">
            ${WHEEL_SEGMENTS.map((seg, i) => {
              const slice = 360 / WHEEL_SEGMENTS.length;
              return `<span class="wheel-label" style="--rot:${i * slice + slice / 2}deg">${seg.label}</span>`;
            }).join('')}
          </div>
        </div>
        <form id="wheel-form" class="game-form">
          <label>Ставка SC<input name="bet" type="number" min="${MIN_BET}" value="50" required /></label>
          <button class="primary-button" type="submit" ${wheelBusy ? 'disabled' : ''}>${wheelBusy ? 'Крутим…' : 'Крутить'}</button>
        </form>
      </section>
      <section class="panel game-panel">
        <div class="panel-heading"><div><p class="eyebrow">МИНЫ</p><h2>Открывай клетки</h2></div><span class="tag">edge 6%</span></div>
        ${
          mines && !mines.busted && !mines.cashed
            ? `<div class="mines-meta"><span>Ставка <b>${money(mines.bet)}</b></span><span>Мин <b>${mines.mineCount}</b></span>
                <span>×<b>${currentMult}</b></span><span>К выплате <b class="pos">${money(potential)}</b></span></div>
              <div class="mines-grid" style="--n:${mines.grid}">
                ${Array.from({ length: mines.grid * mines.grid }, (_, i) => {
                  const open = mines.revealed.includes(i);
                  return `<button type="button" class="mine-cell ${open ? 'safe' : ''}" data-mine-cell="${i}" ${open ? 'disabled' : ''}>${open ? '◆' : ''}</button>`;
                }).join('')}
              </div>
              <div class="mines-actions">
                <button class="ghost-button" type="button" id="mines-cashout" ${mines.revealed.length ? '' : 'disabled'}>Забрать ${money(potential)}</button>
                <span class="muted">след. ≈ ×${nextMinesMultiplier(mines.revealed.length, mines.mineCount)}</span>
              </div>`
            : `<form id="mines-form" class="game-form">
                <label>Ставка SC<input name="bet" type="number" min="${MIN_BET}" value="50" required /></label>
                <label>Мины<select name="mines">${MINES_OPTIONS.map((n) => `<option value="${n}" ${n === 5 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
                <button class="primary-button" type="submit">Начать</button>
              </form>
              ${mines?.busted ? `<div class="game-result lose">Мина. Ставка сгорела.</div>` : ''}
              ${mines?.cashed ? `<div class="game-result win">Забрано с множителем.</div>` : ''}
              <div class="mines-preview grid-preview" style="--n:${MINES_GRID}">${Array.from({ length: 25 }, () => '<span></span>').join('')}</div>`
        }
        <div class="game-stats"><span>Колесо выиграно: ${money(stats.wheelWon || 0)}</span><span>Мины: ${money(stats.minesWon || 0)}</span></div>
      </section>
    </div>
  `;
}

function renderActivity() {
  document.querySelector('#activity').innerHTML = `
    <div class="welcome-row">
      <div><p class="eyebrow">ИСТОРИЯ</p><h1>Операции</h1><p class="muted">Донаты, сделки, игры, выводы</p></div>
      <select id="activity-filter">
        <option value="all">Все</option>
        <option value="deposit">Донаты</option>
        <option value="trade">Сделки</option>
        <option value="bonus">Бонусы/игры</option>
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
          (tx) => `<div class="history-row">
        <div><strong>${tx.title}</strong><span>${tx.detail}</span></div>
        <div class="history-meta"><b class="${tx.amount >= 0 ? 'pos' : 'neg'}">${tx.amount >= 0 ? '+' : ''}${moneyPlain(tx.amount)} SC</b>
        <time>${formatDate(tx.at)}</time></div>
      </div>`
        )
        .join('')
    : `<div class="empty-state"><strong>Пусто</strong></div>`;
}

function renderFaq() {
  document.querySelector('#faq').innerHTML = `
    <div class="welcome-row"><div><p class="eyebrow">FAQ</p><h1>Частые вопросы</h1></div></div>
    <div class="risk-banner"><strong>Важно</strong><p>Нет гарантированной прибыли. Сделки и игры убыточны на дистанции для игрока. При закрытии сервиса SC могут пропасть.</p></div>
    <div class="faq-list">${FAQ_ITEMS.map((item, i) => `<details class="faq-item" ${i === 0 ? 'open' : ''}><summary>${item.q}</summary><p>${item.a}</p></details>`).join('')}</div>
  `;
}

function renderPrivacy() {
  document.querySelector('#privacy').innerHTML = `
    <div class="welcome-row"><div><p class="eyebrow">ДОКУМЕНТЫ</p><h1>Политика и риски</h1></div></div>
    <article class="legal-doc panel">
      <h2>Модель сервиса</h2>
      <p>SWIPE — демо торгового кабинета. Пользователь донатит ₽ → получает SC → совершает сделки Call/Put или играет в игры с house edge. Пассивного дохода с «карточек» нет.</p>
      <h2>Отказ от ответственности</h2>
      <div class="legal-alert">
        <p><strong>Мы не несём ответственности</strong>, если сайт закроется и SC / заявки на вывод пропадут. Компенсаций нет. Это не инвестиции и не способ гарантированно заработать.</p>
      </div>
      <h2>Контакты</h2>
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
  if (active === 'bonuses') renderBonuses();
  if (active === 'games') renderGames();
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
      <p class="muted">1 ₽ = ${RUB_TO_SC} SC → на торговый счёт. Это не вклад под процент.</p>
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
      <p class="muted">Доступно на торговом счёте: ${money(state.balances.trade)}</p>
      <div class="modal-actions">
        <button class="ghost-button" type="button" data-close-modal>Отмена</button>
        <button class="primary-button" type="submit">Перевести</button>
      </div>
    </form>
  `);
}

function buyVip() {
  if (state.user.vip) return showToast('VIP уже активен');
  if (state.balances.trade < VIP_PACK.price) return showToast('Недостаточно SC');
  openModal(`
    <h2 id="modal-title">VIP Трейдер</h2>
    <div class="prose">
      <p>${VIP_PACK.desc}</p>
      <ul>
        <li>Цена: ${rubMoney(VIP_PACK.priceRub)} (= ${money(VIP_PACK.price, 0)})</li>
        <li>Выплата по сделкам выше на 4 п.п.</li>
        <li>Шанс победы чуть выше, но всё ещё &lt; 50%</li>
      </ul>
      <p><strong>VIP не начисляет деньги сам по себе.</strong></p>
    </div>
    <div class="modal-actions">
      <button class="ghost-button" type="button" data-close-modal>Отмена</button>
      <button class="primary-button" type="button" id="confirm-vip-pack">Купить VIP</button>
    </div>
  `);
}

function confirmVip() {
  if (state.user.vip || state.balances.trade < VIP_PACK.price) return;
  state.balances.trade = Number((state.balances.trade - VIP_PACK.price).toFixed(2));
  state.user.vip = true;
  state.user.status = 'VIP';
  addTransaction({ type: 'purchase', title: 'VIP Трейдер', detail: rubMoney(VIP_PACK.priceRub), amount: -VIP_PACK.price, balance: 'trade' });
  pushNotification('VIP', 'Условия сделок улучшены. Пассивного дохода нет.');
  persist();
  closeModal();
  showToast('VIP активирован');
  render();
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
    showToast(`Реферал сделал сделку · вам +${money(cut)}`);
  }
  persist();
  render();
}

function validateBet(raw) {
  const bet = Number(raw);
  if (!Number.isFinite(bet) || bet < MIN_BET) return { ok: false, reason: `Мин. ${MIN_BET} SC` };
  if (bet > MAX_BET) return { ok: false, reason: `Макс. ${MAX_BET} SC` };
  if (bet > playBalance()) return { ok: false, reason: 'Недостаточно SC' };
  return { ok: true, bet: Number(bet.toFixed(2)) };
}

function spinWheel(bet) {
  if (wheelBusy) return;
  const check = validateBet(bet);
  if (!check.ok) return showToast(check.reason);
  if (!state.games) state.games = { mines: null, stats: {} };
  wheelBusy = true;
  state.balances.trade = Number((state.balances.trade - check.bet).toFixed(2));
  state.games.stats.wheelBets = (state.games.stats.wheelBets || 0) + 1;
  const { segment, index } = pickWheelSegment();
  wheelAngle = wheelRotationForIndex(index, 6);
  persist();
  renderGames();
  const wheel = document.querySelector('#fortune-wheel');
  if (wheel) {
    wheel.style.transition = 'transform 4.2s cubic-bezier(.12,.75,.12,1)';
    wheel.style.transform = `rotate(${wheelAngle}deg)`;
  }
  setTimeout(() => {
    const payout = Number((check.bet * segment.mult).toFixed(2));
    if (payout > 0) {
      state.balances.trade = Number((state.balances.trade + payout).toFixed(2));
      state.games.stats.wheelWon = Number(((state.games.stats.wheelWon || 0) + payout).toFixed(2));
      addTransaction({ type: 'bonus', title: 'Колесо', detail: segment.label, amount: payout - check.bet, balance: 'trade' });
      showToast(`${segment.label} · +${money(payout)}`);
    } else {
      addTransaction({ type: 'bonus', title: 'Колесо', detail: '×0', amount: -check.bet, balance: 'trade' });
      showToast('×0 · ставка сгорела');
    }
    wheelBusy = false;
    persist();
    if (document.querySelector('.page-section.active')?.id === 'games') renderGames();
  }, 4300);
}

function startMines(bet, mineCount) {
  if (!state.games) state.games = { mines: null, stats: {} };
  const check = validateBet(bet);
  if (!check.ok) return showToast(check.reason);
  const mines = Number(mineCount);
  state.balances.trade = Number((state.balances.trade - check.bet).toFixed(2));
  state.games.stats.minesBets = (state.games.stats.minesBets || 0) + 1;
  state.games.mines = { ...createMinesBoard(mines), bet: check.bet };
  addTransaction({ type: 'bonus', title: 'Мины · ставка', detail: `${mines} мин`, amount: -check.bet, balance: 'trade' });
  persist();
  renderGames();
}

function clickMineCell(index) {
  const board = state.games?.mines;
  if (!board || board.busted || board.cashed) return;
  const result = revealMineCell(board, Number(index));
  if (!result.ok) return showToast(result.reason);
  if (result.hit) showToast('Boom! Мина');
  persist();
  renderGames();
}

function doMinesCashout() {
  const board = state.games?.mines;
  if (!board) return;
  const result = cashOutMines(board);
  if (!result.ok) return showToast(result.reason);
  const payout = Number((board.bet * result.multiplier).toFixed(2));
  state.balances.trade = Number((state.balances.trade + payout).toFixed(2));
  state.games.stats.minesWon = Number(((state.games.stats.minesWon || 0) + payout).toFixed(2));
  addTransaction({ type: 'bonus', title: 'Мины · выигрыш', detail: `×${result.multiplier}`, amount: payout - board.bet, balance: 'trade' });
  persist();
  showToast(`Забрано ${money(payout)}`);
  renderGames();
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
      vip: false,
      status: 'Стандарт',
      referralCode: String(data.get('email')).split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16) || 'user',
    };
    state.auth.loggedIn = true;
    state.balances = { trade: rubToSc(250), withdraw: 0 };
    state.trading = { assetId: 'btc', timeframeId: '60', prices: {}, history: [], open: [], stats: { trades: 0, wins: 0, losses: 0, volume: 0, pnl: 0 } };
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
        requisites: String(data.get('requisites')),
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
    if (e.target.id === 'wheel-form') {
      e.preventDefault();
      spinWheel(new FormData(e.target).get('bet'));
    }
    if (e.target.id === 'mines-form') {
      e.preventDefault();
      const data = new FormData(e.target);
      startMines(data.get('bet'), data.get('mines'));
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
    if (e.target.closest('#buy-vip-pack')) buyVip();
    if (e.target.closest('#confirm-vip-pack')) confirmVip();
    if (e.target.closest('#copy-referral')) {
      const url = document.querySelector('#referral-url')?.textContent || '';
      navigator.clipboard?.writeText(`https://${url}`).then(() => showToast('Скопировано'), () => showToast(url));
    }
    if (e.target.closest('#simulate-referral')) simulateReferral();
    if (e.target.closest('#advance-funnel')) advanceFunnel();
    if (e.target.closest('#claim-daily')) {
      const result = claimDailyBonus(state);
      if (!result.ok) return showToast(result.reason);
      addTransaction({ type: 'bonus', title: 'Стрик', detail: `День ${result.streak}`, amount: result.amount, balance: 'trade' });
      persist();
      showToast(`+${money(result.amount)}`);
      render();
    }
    if (e.target.closest('#activate-boost')) {
      const result = activateBoost(state);
      if (!result.ok) return showToast(result.reason);
      persist();
      showToast('XP буст на час');
      render();
    }
    if (e.target.closest('[data-claim-mission]')) {
      const id = e.target.closest('[data-claim-mission]').dataset.claimMission;
      const result = claimMission(state, id);
      if (!result.ok) return showToast(result.reason);
      addTransaction({ type: 'bonus', title: 'Миссия', detail: id, amount: result.amount, balance: 'trade' });
      persist();
      showToast(`+${money(result.amount)}`);
      render();
    }
    if (e.target.closest('[data-claim-achievement]')) {
      const id = e.target.closest('[data-claim-achievement]').dataset.claimAchievement;
      const result = claimAchievement(state, id);
      if (!result.ok) return showToast(result.reason);
      addTransaction({ type: 'bonus', title: 'Ачивка', detail: id, amount: result.amount, balance: 'withdraw' });
      persist();
      showToast(`+${money(result.amount)} на вывод`);
      render();
    }
    if (e.target.closest('#mines-cashout')) doMinesCashout();
    if (e.target.closest('[data-mine-cell]')) clickMineCell(e.target.closest('[data-mine-cell]').dataset.mineCell);
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
      ['v1', 'v2', 'v3', 'v4', 'v5'].forEach((v) => localStorage.removeItem(`swipe-cabinet-${v}`));
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
      openModal(`<h2 id="modal-title">Условия</h2><div class="prose"><p>Торговый демо-кабинет. Нет пассивного дохода. Риск потери ставки. При закрытии сайта средства могут пропасть.</p></div><div class="modal-actions"><button class="primary-button" data-close-modal>OK</button></div>`);
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
