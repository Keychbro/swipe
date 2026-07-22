import './style.css';
import {
  PRODUCTS,
  VIP_PACK,
  REFERRAL_TIERS,
  REFERRAL_STAGES,
  LEVEL_TARGET,
  MIN_WITHDRAW,
  BREAK_EVEN_DAYS,
  loadState,
  saveState,
  makeId,
  activeCards,
  dailyIncome,
  daysLeft,
  periodProgress,
  initialsFromName,
  firstNameFrom,
  referralTier,
  nextReferralTier,
  estimateReferralBonus,
  recommendProduct,
  tierClass,
  qualifiedReferrals,
  productEconomics,
  makeCardFromProduct,
} from './state.js';

let state = loadState();
const TITLE_MAP = {
  overview: 'Обзор',
  catalog: 'Карточки',
  withdrawals: 'Вывод средств',
  partners: 'Партнёрская программа',
  activity: 'Операции',
  faq: 'FAQ',
  privacy: 'Конфиденциальность',
  settings: 'Настройки',
};

const HELP = {
  purchase:
    'Баланс для покупок используется только для оформления карточек. Его нельзя вывести напрямую.',
  withdraw:
    'Сюда зачисляется доход по активным карточкам. Вывод доступен от 100 ₽ на указанные реквизиты.',
  level:
    'Уровень растёт от объёма оформленных карточек. Следующий статус открывается при 500 ₽ оборота.',
  live: 'Показатель растёт по активным карточкам. В демо начисление симулируется каждые несколько секунд.',
  referral:
    'Бонус считается как процент от первой покупки приглашённого. Уровень партнёра повышает ставку.',
};

const TERMS_HTML = `
  <h2 id="modal-title">Условия сервиса</h2>
  <div class="prose">
    <p>SWIPE — демонстрационный кабинет. Карточки и доход — учебная механика интерфейса, а не финансовая рекомендация.</p>
    <ul>
      <li>Перед оформлением проверьте стоимость, расчётный доход и срок действия.</li>
      <li>Минимальная сумма вывода — ${MIN_WITHDRAW} ₽.</li>
      <li>Партнёрские бонусы начисляются по правилам программы и могут меняться.</li>
      <li>Сервис не гарантирует доход; показатели носят иллюстративный характер.</li>
      <li>Администрация не несёт ответственности за утрату доступа, закрытие сервиса или потерю средств.</li>
    </ul>
    <p>Продолжая работу в кабинете, вы подтверждаете, что ознакомились с рисками, FAQ и политикой конфиденциальности.</p>
  </div>
`;

const FAQ_ITEMS = [
  {
    q: 'Что такое SWIPE?',
    a: 'Это демонстрационный личный кабинет с учебной механикой карточек и начислений. Интерфейс показывает, как может выглядеть кабинет пользователя, и не является инвестиционным продуктом.',
  },
  {
    q: 'Как оформить карточку?',
    a: 'Пополните баланс для покупок, откройте раздел «Карточки», выберите тариф и подтвердите оформление. Сумма списывается с баланса покупок, карточка появляется в портфеле.',
  },
  {
    q: 'Откуда берётся доход?',
    a: `Каждая карточка каждый день начисляет фиксированный доход на баланс вывода. Правило экономики: примерно за ${BREAK_EVEN_DAYS} дней (около 2 месяцев) вы возвращаете стоимость карточки, а оставшийся срок идёт уже в прибыль.`,
  },
  {
    q: 'Что такое VIP-аккаунт?',
    a: `VIP-аккаунт стоит ${VIP_PACK.price} ₽ со скидкой и сразу включает три VIP-карточки номиналом 1000 ₽, 5000 ₽ и 12 000 ₽ (суммарно ${VIP_PACK.faceValue.toLocaleString('ru-RU')} ₽). Их также можно купить по отдельности по полной цене.`,
  },
  {
    q: 'Как работает партнёрская программа?',
    a: 'Вы делитесь ссылкой. Когда приглашённый регистрируется и оформляет первую карточку, вам начисляется процент от её стоимости. Чем больше квалифицированных рефералов, тем выше ваш партнёрский уровень и ставка.',
  },
  {
    q: 'Когда можно вывести средства?',
    a: `Вывод доступен при балансе от ${MIN_WITHDRAW} ₽. Укажите сумму, способ и реквизиты. В демо заявка сначала уходит «в обработку», затем помечается выполненной.`,
  },
  {
    q: 'Что будет, если сайт закроется?',
    a: 'Сервис может быть остановлен в любой момент без предварительного уведомления. Администрация не компенсирует остатки на балансах, активные карточки, бонусы и заявки на вывод. Используйте кабинет только как демо и не вносите средства, которые не готовы потерять.',
  },
  {
    q: 'Кто отвечает за сохранность денег?',
    a: 'Вы действуете на свой риск. SWIPE не гарантирует сохранность средств, доступность кабинета, исполнение выплат и непрерывность работы. Подробности — в политике конфиденциальности и условиях сервиса.',
  },
  {
    q: 'Как связаться с поддержкой?',
    a: 'Через кнопку «Поддержка» в кабинете или email help@swipe.example. Ответ в демо моделируется уведомлением; реальные сроки и SLA не обещаются.',
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
  })} ₽`;
}

function moneyPlain(value, digits = 2) {
  return Number(value).toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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

function formatDay(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU');
}

function weekdayLabel() {
  return new Date('2026-07-22T15:00:00')
    .toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();
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
  state.notifications.unshift({
    id: makeId('n'),
    title,
    body,
    read: false,
    at: Date.now(),
  });
  persist();
}

function addTransaction(tx) {
  state.transactions.unshift({ id: makeId('tx'), at: Date.now(), ...tx });
}

function openModal(html) {
  els.modalBody.innerHTML = html;
  els.modalRoot.hidden = false;
  document.body.classList.add('modal-open');
  const focusable = els.modalBody.querySelector('button, input, select, textarea');
  focusable?.focus();
}

function closeModal() {
  els.modalRoot.hidden = true;
  document.body.classList.remove('modal-open');
  els.modalBody.innerHTML = '';
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

function closeMenus() {
  els.notifyPanel.hidden = true;
  els.profileMenu.hidden = true;
  document.querySelector('#notify-btn')?.setAttribute('aria-expanded', 'false');
  document.querySelector('#profile-menu-btn')?.setAttribute('aria-expanded', 'false');
}

function updateChrome() {
  const { user } = state;
  document.querySelector('#sidebar-avatar').textContent = user.initials;
  document.querySelector('#top-avatar').textContent = user.initials;
  document.querySelector('#sidebar-name').textContent = user.name;
  document.querySelector('#sidebar-status').textContent = state.user.vip
    ? 'Статус: VIP'
    : `Статус: ${user.status}`;
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
  const cards = activeCards(state);
  const period = periodProgress(state);
  const volume = state.purchasedVolume;
  const progressPct = Math.min(100, (volume / LEVEL_TARGET) * 100);
  const recent = state.transactions.slice(0, 4);

  document.querySelector('#overview').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">${weekdayLabel()}</p>
        <h1>Добрый день, ${firstNameFrom(state.user.name)}</h1>
        <p class="muted">Показатели обновляются в реальном времени (демо-симуляция).</p>
      </div>
      <div class="welcome-actions">
        <button class="outline-button" type="button" id="open-help">⌄ <span>Справка по кабинету</span></button>
        <button class="ghost-button" type="button" data-open-section="faq">Риски и FAQ</button>
      </div>
    </div>

    <div class="hero-card">
      <div class="hero-grid"></div>
      <div class="hero-top"><span>ЗАРАБОТАНО СЕГОДНЯ</span><span class="live"><i></i>ONLINE</span></div>
      <div class="earnings">
        <strong id="today-earnings">${moneyPlain(state.earningsToday)}</strong>
        <span>+ ${moneyPlain(state.earningsFromMidnight)} с 00:00</span>
      </div>
      <div class="hero-bottom">
        <div><span>Активные карточки</span><b>${cards.length}</b></div>
        <div><span>Прогресс периода</span><b>${period.current} / ${period.total} дней</b></div>
        <div><span>Доход в день</span><b>${money(dailyIncome(state))}</b></div>
        <a href="#catalog" class="hero-link" data-open="catalog">Открыть каталог <b>→</b></a>
      </div>
    </div>

    <div class="metric-grid">
      <article class="metric-card">
        <div class="metric-title">Баланс для покупок <button class="info" type="button" data-tip="purchase" aria-label="Подробнее">i</button></div>
        <strong>${moneyPlain(state.balances.purchase)} <small>₽</small></strong>
        <p>Доступен для оформления карточек</p>
        <div class="metric-actions">
          <button class="text-button" type="button" data-open="catalog">Купить карточку <span>→</span></button>
          <button class="ghost-button" type="button" id="open-deposit">Пополнить</button>
        </div>
      </article>
      <article class="metric-card">
        <div class="metric-title">Баланс для вывода <button class="info" type="button" data-tip="withdraw" aria-label="Подробнее">i</button></div>
        <strong>${moneyPlain(state.balances.withdraw)} <small>₽</small></strong>
        <p>Минимальная сумма вывода — ${MIN_WITHDRAW} ₽</p>
        <button class="text-button" type="button" data-open="withdrawals">Условия вывода <span>→</span></button>
      </article>
      <article class="metric-card accent-card">
        <div class="metric-title">До следующего уровня <button class="info" type="button" data-tip="level" aria-label="Подробнее">i</button></div>
        <strong>${moneyPlain(Math.max(0, LEVEL_TARGET - volume))} <small>₽</small></strong>
        <p>Объём оформленных карточек</p>
        <div class="progress-label"><span>${moneyPlain(volume)} ₽</span><span>${LEVEL_TARGET} ₽</span></div>
        <div class="progress"><i style="width:${progressPct}%"></i></div>
      </article>
    </div>

    <div class="two-column">
      <section class="panel portfolio-panel">
        <div class="panel-heading">
          <div><p class="eyebrow">ПОРТФЕЛЬ</p><h2>Ваши карточки</h2></div>
          <a href="#catalog" data-open="catalog">Все карточки →</a>
        </div>
        <div class="portfolio-list">
          ${
            cards.length
              ? cards
                  .map(
                    (card) => `
            <button type="button" class="portfolio-row" data-card-id="${card.id}">
              <div class="card-icon ${card.tier}">${card.letter}</div>
              <div class="portfolio-name"><strong>${card.name}</strong><span>Оформлена ${formatDay(card.purchasedAt)} · осталось ${daysLeft(card)} дн.</span></div>
              <div class="portfolio-income"><span>Доход за день</span><strong>${money(card.daily)}</strong></div>
              <span class="status-pill">Активна</span>
            </button>`
                  )
                  .join('')
              : `<div class="empty-state compact"><strong>Нет активных карточек</strong><p>Оформите первую в каталоге.</p></div>`
          }
        </div>
      </section>
      <section class="panel disclosure-panel">
        <div class="panel-heading"><div><p class="eyebrow">ПРОЗРАЧНОСТЬ</p><h2>Важная информация</h2></div></div>
        <p>Карточки — демонстрационная механика. Перед оформлением ознакомьтесь с условиями, сроками и всеми ограничениями.</p>
        <div class="metric-actions">
          <button class="text-button" type="button" id="open-terms">Узнать об условиях <span>→</span></button>
        </div>
        <div class="mini-feed">
          <p class="eyebrow">ПОСЛЕДНИЕ ОПЕРАЦИИ</p>
          ${
            recent.length
              ? recent
                  .map(
                    (tx) => `
            <div class="mini-row">
              <div><strong>${tx.title}</strong><span>${tx.detail}</span></div>
              <b class="${tx.amount >= 0 ? 'pos' : 'neg'}">${tx.amount >= 0 ? '+' : ''}${moneyPlain(tx.amount)}</b>
            </div>`
                  )
                  .join('')
              : '<p class="muted">Операций пока нет</p>'
          }
        </div>
      </section>
    </div>
  `;
}

function renderCatalog() {
  const tip = recommendProduct(state.balances.purchase);
  const tipEco = productEconomics(tip);
  const canVip = !state.user.vip && state.balances.purchase >= VIP_PACK.price;
  document.querySelector('#catalog').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">КАТАЛОГ</p>
        <h1>Выберите карточку</h1>
        <p class="muted">Окупаемость ≈ ${BREAK_EVEN_DAYS} дней · дальше срок идёт в прибыль.</p>
      </div>
      <div class="balance-chip">Доступно: <b>${money(state.balances.purchase)}</b></div>
    </div>

    <div class="vip-pack ${state.user.vip ? 'owned' : ''}">
      <div>
        <p class="eyebrow">VIP АККАУНТ · СКИДКА</p>
        <strong>${VIP_PACK.name} за ${money(VIP_PACK.price, 0)}</strong>
        <p>Вместо ${money(VIP_PACK.faceValue, 0)} номинала: VIP Nova 1000 ₽ + VIP Orbit 5000 ₽ + VIP Apex 12 000 ₽.</p>
        <p class="vip-note">${state.user.vip ? 'У вас уже активирован VIP-аккаунт.' : 'Одна покупка — три VIP-карточки сразу начисляются в портфель.'}</p>
      </div>
      <button class="primary-button compact-btn vip-btn" type="button" id="buy-vip-pack" ${state.user.vip || !canVip ? 'disabled' : ''}>
        ${state.user.vip ? 'VIP активен' : canVip ? `Купить за ${money(VIP_PACK.price, 0)}` : 'Недостаточно средств'}
      </button>
    </div>

    <div class="recommend-banner">
      <div>
        <p class="eyebrow">РЕКОМЕНДАЦИЯ</p>
        <strong>Вам сейчас ближе «${tip.name}»</strong>
        <p>~${money(tip.price, 0)} вернутся за ${BREAK_EVEN_DAYS} дн. · за весь срок ≈ ${money(tipEco.total)} (плюс ${money(tipEco.profit)}).</p>
      </div>
      <button class="primary-button compact-btn" type="button" data-product="${tip.id}" ${state.balances.purchase >= tip.price ? '' : 'disabled'}>
        Оформить ${money(tip.price, 0)}
      </button>
    </div>
    <div class="catalog-toolbar">
      <label class="search-field">Поиск<input id="catalog-search" type="search" placeholder="Название или тег" /></label>
      <select id="catalog-filter">
        <option value="all">Все карточки</option>
        <option value="affordable">Доступные по балансу</option>
        <option value="standard">Обычные</option>
        <option value="vip">Только VIP</option>
        <option value="featured">Рекомендуемые</option>
        <option value="long">Срок от 100 дней</option>
      </select>
    </div>
    <div class="catalog-grid" id="catalog-grid"></div>
    <div class="notice"><span>i</span><p>Правило ценообразования: дневной доход = цена ÷ ${BREAK_EVEN_DAYS}. Через ~2 месяца карточка окупается, оставшиеся дни — прибыль. Показатели демонстрационные; при закрытии сервиса средства могут быть утрачены без компенсации.</p></div>
  `;
  paintCatalog();
}

function paintCatalog() {
  const grid = document.querySelector('#catalog-grid');
  if (!grid) return;
  const q = (document.querySelector('#catalog-search')?.value || '').trim().toLowerCase();
  const filter = document.querySelector('#catalog-filter')?.value || 'all';
  const items = PRODUCTS.filter((p) => {
    const hay = `${p.name} ${p.tag}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (filter === 'affordable') return state.balances.purchase >= p.price;
    if (filter === 'featured') return Boolean(p.featured || p.limited);
    if (filter === 'standard') return !p.vip;
    if (filter === 'vip') return Boolean(p.vip);
    if (filter === 'long') return p.days >= 100;
    return true;
  });

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state"><strong>Ничего не найдено</strong><p>Измените фильтр или поисковый запрос.</p></div>`;
    return;
  }

  grid.innerHTML = items
    .map((p, index) => {
      const stock = p.limited ? state.seasonStock : null;
      const soldOut = p.limited && stock <= 0;
      const canBuy = !soldOut && state.balances.purchase >= p.price;
      const eco = productEconomics(p);
      return `
      <article class="product-card tone-${p.tier} ${p.featured ? 'featured' : ''} ${p.limited ? 'limited' : ''} ${p.vip ? 'vip-card' : ''}" style="--delay:${index * 40}ms">
        ${p.featured ? '<div class="featured-label">ВЫБОР ПОЛЬЗОВАТЕЛЕЙ</div>' : ''}
        ${p.vip ? '<div class="vip-chip">VIP</div>' : ''}
        ${p.limited ? `<div class="stock-chip">Осталось ${stock} / ${p.stockMax}</div>` : ''}
        <div class="product-top"><span class="tier-icon ${p.tier}">${p.letter}</span><span class="tag">${p.tag}</span></div>
        <h2>${p.name}</h2>
        <p>${p.desc}</p>
        <div class="price-row"><span>Стоимость</span><strong>${money(p.price, 0)}</strong></div>
        <div class="income-row"><span>Доход в день</span><strong>${money(p.daily)}</strong></div>
        <div class="terms">Срок ${p.days} дн. · окупаемость ~${BREAK_EVEN_DAYS} дн. · всего ~${money(eco.total)} · плюс ~${money(eco.profit)}</div>
        <div class="product-actions">
          <button class="ghost-button" type="button" data-detail-product="${p.id}">Подробнее</button>
          <button class="primary-button buy-button" type="button" data-product="${p.id}" ${canBuy ? '' : 'disabled'}>
            ${soldOut ? 'Распродано' : canBuy ? `Оформить за ${money(p.price, 0)} <span>→</span>` : 'Недостаточно средств'}
          </button>
        </div>
      </article>`;
    })
    .join('');
}

function renderWithdrawals() {
  const available = state.balances.withdraw;
  const canWithdraw = available >= MIN_WITHDRAW;
  const need = Math.max(0, MIN_WITHDRAW - available);
  const pct = Math.min(100, (available / MIN_WITHDRAW) * 100);

  document.querySelector('#withdrawals').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ФИНАНСЫ</p>
        <h1>Вывод средств</h1>
        <p class="muted">Управляйте доступными к выводу средствами.</p>
      </div>
    </div>
    <div class="withdraw-layout">
      <section class="withdraw-card">
        <div class="withdraw-card-top"><span>ДОСТУПНО К ВЫВОДУ</span><button class="info" type="button" data-tip="withdraw">i</button></div>
        <strong>${moneyPlain(available)} <small>₽</small></strong>
        <div class="withdraw-progress">
          <div><span>До минимальной суммы</span><b>${money(need)}</b></div>
          <div class="progress"><i style="width:${pct}%"></i></div>
          <small>Минимальная сумма выплаты — ${MIN_WITHDRAW} ₽</small>
        </div>
        ${
          canWithdraw
            ? `<form id="withdraw-form" class="withdraw-form">
                <label>Сумма<input name="amount" type="number" min="${MIN_WITHDRAW}" max="${available.toFixed(2)}" step="0.01" value="${available.toFixed(2)}" required /></label>
                <label>Способ
                  <select name="method" required>
                    <option value="card">Банковская карта</option>
                    <option value="sbp">СБП</option>
                    <option value="wallet">Электронный кошелёк</option>
                  </select>
                </label>
                <label>Реквизиты<input name="requisites" type="text" required placeholder="Номер карты или телефона" value="${state.user.payoutRequisites || ''}" /></label>
                <button class="primary-button" type="submit">Заказать выплату</button>
              </form>`
            : `<button class="primary-button disabled-button" disabled>Заказать выплату</button>
               <p class="disabled-note">Кнопка станет доступна при достижении минимальной суммы.</p>`
        }
      </section>
      <section class="panel history-panel">
        <div class="panel-heading"><div><p class="eyebrow">ИСТОРИЯ</p><h2>Последние операции</h2></div></div>
        ${
          state.withdrawals.length
            ? `<div class="history-list">${state.withdrawals
                .map(
                  (w) => `
              <div class="history-row">
                <div><strong>${money(w.amount)}</strong><span>${w.methodLabel} · ${w.requisites}</span></div>
                <div class="history-meta"><span class="status-pill ${w.status}">${w.statusLabel}</span><time>${formatDate(w.at)}</time></div>
              </div>`
                )
                .join('')}</div>`
            : `<div class="empty-state"><span>↗</span><strong>Операций пока нет</strong><p>Здесь появится история ваших заявок на вывод.</p></div>`
        }
      </section>
    </div>
  `;
}

function renderPartners() {
  const url = `swipe.example/r/${state.user.referralCode}`;
  const fullUrl = `https://${url}`;
  const tier = referralTier(state);
  const next = nextReferralTier(state);
  const bonusTotal = state.referrals.reduce((s, r) => s + (r.bonus || 0), 0);
  const qualified = qualifiedReferrals(state).length;
  const progressMax = next ? next.min : tier.min || 1;
  const progressPct = next ? Math.min(100, (qualified / next.min) * 100) : 100;
  const calcProduct = PRODUCTS.find((p) => p.id === 'plus') || PRODUCTS[1];
  const sampleBonus = estimateReferralBonus(state, calcProduct.price);

  document.querySelector('#partners').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ПАРТНЁРСКАЯ ПРОГРАММА</p>
        <h1>Умная рефералка</h1>
        <p class="muted">Процент от покупки, уровни и воронка приглашённых.</p>
      </div>
      <button class="outline-button" type="button" id="open-partner-rules">Правила программы</button>
    </div>

    <div class="referral-hero">
      <div class="referral-copy">
        <span class="eyebrow">ВАША РЕФЕРАЛЬНАЯ ССЫЛКА</span>
        <h2>Делитесь SWIPE<br>с теми, кому доверяете.</h2>
        <p>Бонус = ${(tier.rate * 100).toFixed(0)}% от первой покупки реферала на уровне «${tier.name}».</p>
        <div class="referral-link"><span id="referral-url">${url}</span><button type="button" id="copy-referral">Копировать</button></div>
        <div class="share-row">
          <a class="share-btn tg" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent('Присоединяйся к SWIPE по моей ссылке')}">Telegram</a>
          <a class="share-btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Присоединяйся к SWIPE: ${fullUrl}`)}">WhatsApp</a>
          <button type="button" class="share-btn" id="share-native">Поделиться</button>
        </div>
      </div>
      <div class="orbital"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="ref-symbol">S</div></div>
    </div>

    <div class="partner-stats">
      <article><span>В воронке</span><strong>${state.referrals.length}</strong><small>приглашённых</small></article>
      <article><span>Квалифицировано</span><strong>${qualified}</strong><small>с покупкой</small></article>
      <article><span>Бонусы</span><strong>${money(bonusTotal)}</strong><small>всего начислено</small></article>
      <article><span>Ваш уровень</span><strong>${tier.name}</strong><small>ставка ${(tier.rate * 100).toFixed(0)}% / повтор ${(tier.renewRate * 100).toFixed(0)}%</small></article>
    </div>

    <div class="two-column partner-tools">
      <section class="panel">
        <div class="panel-heading"><div><p class="eyebrow">ПРОГРЕСС УРОВНЯ</p><h2>${tier.name}</h2></div><button class="info" type="button" data-tip="referral">i</button></div>
        <p class="muted tight">Квалифицированные рефералы: ${qualified}${next ? ` из ${next.min} до уровня «${next.name}»` : ' — максимальный уровень'}</p>
        <div class="progress-label"><span>${qualified}</span><span>${next ? next.min : 'max'}</span></div>
        <div class="progress tall"><i style="width:${progressPct}%"></i></div>
        <div class="tier-pills">
          ${REFERRAL_TIERS.map((t) => `<span class="tier-pill ${t.id === tier.id ? 'on' : ''}">${t.name} · ${(t.rate * 100).toFixed(0)}%</span>`).join('')}
        </div>
      </section>
      <section class="panel calc-panel">
        <div class="panel-heading"><div><p class="eyebrow">КАЛЬКУЛЯТОР</p><h2>Сколько можно получить</h2></div></div>
        <form id="referral-calc" class="calc-form">
          <label>Друзей<input name="friends" type="number" min="1" max="50" value="3" /></label>
          <label>Их первая карточка
            <select name="product">
              ${PRODUCTS.map((p) => `<option value="${p.id}" ${p.id === 'plus' ? 'selected' : ''}>${p.name} · ${money(p.price, 0)}</option>`).join('')}
            </select>
          </label>
          <div class="calc-result">Ориентир бонуса: <strong id="calc-bonus">${money(sampleBonus * 3)}</strong></div>
        </form>
        <div class="partner-actions">
          <button class="ghost-button" type="button" id="simulate-referral">Добавить в воронку</button>
          <button class="primary-button compact-btn" type="button" id="advance-funnel">Продвинуть воронку</button>
        </div>
      </section>
    </div>

    <section class="panel funnel-panel">
      <div class="panel-heading"><div><p class="eyebrow">ВОРОНКА</p><h2>Статусы приглашённых</h2></div></div>
      <div class="funnel-legend">
        ${REFERRAL_STAGES.map((s) => `<div><b>${s.label}</b><span>${s.hint}</span></div>`).join('')}
      </div>
      ${
        state.referrals.length
          ? `<div class="history-list">${state.referrals
              .map((r) => {
                const stageIndex = REFERRAL_STAGES.findIndex((s) => s.id === r.stage);
                return `
            <div class="history-row referral-row">
              <div>
                <strong>${r.name}</strong>
                <span>${r.email}</span>
                <div class="stage-track">${REFERRAL_STAGES.map((s, i) => `<i class="${i <= stageIndex ? 'on' : ''}" title="${s.label}"></i>`).join('')}</div>
              </div>
              <div class="history-meta">
                <span class="status-pill">${REFERRAL_STAGES.find((s) => s.id === r.stage)?.label || r.stage}</span>
                <b class="pos">${r.bonus ? `+${money(r.bonus)}` : '—'}</b>
                <time>${formatDate(r.at)}</time>
              </div>
            </div>`;
              })
              .join('')}</div>`
          : `<div class="empty-state compact"><strong>Воронка пуста</strong><p>Добавьте демо-реферала или поделитесь ссылкой.</p></div>`
      }
    </section>
  `;
  bindReferralCalc();
}

function renderActivity() {
  const items = state.transactions;
  document.querySelector('#activity').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ИСТОРИЯ</p>
        <h1>Все операции</h1>
        <p class="muted">Пополнения, покупки, начисления и выводы в одном месте.</p>
      </div>
      <select id="activity-filter">
        <option value="all">Все типы</option>
        <option value="deposit">Пополнения</option>
        <option value="purchase">Покупки</option>
        <option value="accrual">Начисления</option>
        <option value="withdraw">Выводы</option>
        <option value="bonus">Бонусы</option>
      </select>
    </div>
    <section class="panel">
      <div id="activity-list" class="history-list tall"></div>
    </section>
  `;
  paintActivity();
}

function paintActivity() {
  const list = document.querySelector('#activity-list');
  if (!list) return;
  const filter = document.querySelector('#activity-filter')?.value || 'all';
  const items = state.transactions.filter((t) => filter === 'all' || t.type === filter);
  if (!items.length) {
    list.innerHTML = `<div class="empty-state"><strong>Операций нет</strong><p>Совершите действие в кабинете.</p></div>`;
    return;
  }
  list.innerHTML = items
    .map(
      (tx) => `
    <div class="history-row">
      <div><strong>${tx.title}</strong><span>${tx.detail} · ${tx.balance === 'purchase' ? 'баланс покупок' : 'баланс вывода'}</span></div>
      <div class="history-meta"><b class="${tx.amount >= 0 ? 'pos' : 'neg'}">${tx.amount >= 0 ? '+' : ''}${moneyPlain(tx.amount)} ₽</b><time>${formatDate(tx.at)}</time></div>
    </div>`
    )
    .join('');
}

function renderFaq() {
  document.querySelector('#faq').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ПОМОЩЬ</p>
        <h1>Частые вопросы</h1>
        <p class="muted">Коротко о кабинете, рисках и ответственности.</p>
      </div>
      <button class="outline-button" type="button" data-open-section="privacy">Политика →</button>
    </div>
    <div class="risk-banner">
      <strong>Важно</strong>
      <p>Если сервис будет закрыт, доступ утрачен или выплаты остановлены — остатки средств, карточки и бонусы могут исчезнуть без компенсации. SWIPE не несёт за это ответственности.</p>
    </div>
    <div class="faq-list">
      ${FAQ_ITEMS.map(
        (item, i) => `
        <details class="faq-item" ${i === 0 ? 'open' : ''}>
          <summary>${item.q}</summary>
          <p>${item.a}</p>
        </details>`
      ).join('')}
    </div>
  `;
}

function renderPrivacy() {
  document.querySelector('#privacy').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ДОКУМЕНТЫ</p>
        <h1>Политика конфиденциальности</h1>
        <p class="muted">Редакция от 22 июля 2026 · демо-сервис SWIPE</p>
      </div>
    </div>
    <article class="legal-doc panel">
      <h2>1. Общие положения</h2>
      <p>Настоящая политика описывает, какие данные может обрабатывать демонстрационный кабинет SWIPE и как пользователь принимает риски, связанные с использованием сервиса.</p>

      <h2>2. Какие данные используются</h2>
      <ul>
        <li>данные профиля: имя, email, настройки безопасности;</li>
        <li>данные кабинета: балансы, карточки, операции, заявки на вывод;</li>
        <li>партнёрские данные: реферальный код, статусы приглашённых, бонусы;</li>
        <li>технические данные демо: состояние интерфейса в localStorage браузера.</li>
      </ul>

      <h2>3. Цели обработки</h2>
      <p>Данные нужны только для работы демо-кабинета: отображения интерфейса, имитации операций и показа партнёрской механики. Мы не продаём персональные данные третьим лицам в рамках этой демонстрации.</p>

      <h2>4. Хранение</h2>
      <p>В текущей версии состояние хранится локально в браузере пользователя. Очистка данных браузера, сброс демо или недоступность устройства могут привести к безвозвратной потере истории и балансов.</p>

      <h2>5. Отказ от ответственности и риски утраты средств</h2>
      <div class="legal-alert">
        <p><strong>SWIPE не несёт никакой ответственности</strong>, если сайт будет закрыт, заблокирован, удалён, недоступен, изменён или прекратит работу по любой причине — включая технические сбои, решение администрации, действия хостинга, третьих лиц или форс-мажор.</p>
        <p>В таких случаях <strong>деньги, остатки на балансах, активные карточки, партнёрские бонусы, заявки на вывод и любые иные начисления могут пропасть полностью</strong>. Компенсации, возвраты, восстановление доступа и гарантии выплат не предоставляются.</p>
        <p>Пользователь подтверждает, что использует сервис добровольно, понимает учебный/демонстрационный характер механики и не предъявляет претензий к администрации в связи с утратой средств или невозможностью вывода.</p>
      </div>

      <h2>6. Нет финансовых гарантий</h2>
      <p>Любые цифры дохода, ROI и бонусов носят иллюстративный характер. Сервис не является банком, платёжным оператором, инвестиционной платформой или гарантированным способом заработка.</p>

      <h2>7. Передача и безопасность</h2>
      <p>Пользователь обязан самостоятельно обеспечивать сохранность пароля и доступа к устройству. Администрация не отвечает за действия, совершённые после компрометации учётной записи.</p>

      <h2>8. Контакты</h2>
      <p>По вопросам политики и поддержки: <a href="mailto:help@swipe.example">help@swipe.example</a>. Отправка обращения не создаёт обязательств по ответу, возврату средств или продолжению работы сервиса.</p>

      <h2>9. Согласие</h2>
      <p>Продолжая пользоваться кабинетом, вы подтверждаете, что прочитали эту политику, FAQ и условия сервиса, принимаете риски утраты средств и соглашаетесь с полным отказом администрации от ответственности в случае закрытия сайта.</p>
    </article>
  `;
}

function bindReferralCalc() {
  const form = document.querySelector('#referral-calc');
  if (!form) return;
  const update = () => {
    const data = new FormData(form);
    const friends = Math.max(1, Number(data.get('friends') || 1));
    const product = PRODUCTS.find((p) => p.id === data.get('product')) || PRODUCTS[0];
    const one = estimateReferralBonus(state, product.price);
    const el = document.querySelector('#calc-bonus');
    if (el) el.textContent = money(one * friends);
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
}

function renderSettings() {
  const u = state.user;
  document.querySelector('#settings').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">АККАУНТ</p>
        <h1>Настройки</h1>
        <p class="muted">Профиль, безопасность и реквизиты выплат.</p>
      </div>
    </div>
    <div class="settings-grid">
      <form id="profile-form" class="panel settings-form">
        <p class="eyebrow">ПРОФИЛЬ</p>
        <label>Имя<input name="name" type="text" required value="${u.name}" /></label>
        <label>Email<input name="email" type="email" required value="${u.email}" /></label>
        <label>Реквизиты по умолчанию<input name="payoutRequisites" type="text" value="${u.payoutRequisites || ''}" placeholder="Карта или телефон СБП" /></label>
        <button class="primary-button" type="submit">Сохранить профиль</button>
      </form>
      <form id="security-form" class="panel settings-form">
        <p class="eyebrow">БЕЗОПАСНОСТЬ</p>
        <label>Новый пароль<input name="password" type="password" minlength="6" placeholder="Оставьте пустым, чтобы не менять" /></label>
        <label class="check-row"><input name="twoFactor" type="checkbox" ${u.twoFactor ? 'checked' : ''} /> Двухфакторная защита (демо)</label>
        <button class="primary-button" type="submit">Обновить безопасность</button>
        <button class="ghost-button danger-outline" type="button" id="reset-demo">Сбросить демо-данные</button>
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
  if (active === 'catalog') renderCatalog();
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
  }
}

function login(email, password) {
  if (email === state.user.email && password === state.user.password) {
    state.auth.loggedIn = true;
    persist();
    showToast('С возвращением в SWIPE');
    showAuth(true);
    return true;
  }
  showToast('Неверный email или пароль');
  return false;
}

function register({ name, email, password }) {
  state.user = {
    ...state.user,
    name,
    firstName: firstNameFrom(name),
    email,
    password,
    initials: initialsFromName(name),
    referralCode: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16) || 'user',
  };
  state.auth.loggedIn = true;
  state.balances = { purchase: 250, withdraw: 0 };
  state.cards = [];
  state.purchasedVolume = 0;
  state.user.vip = false;
  state.user.status = 'Стандарт';
  state.earningsToday = 0;
  state.earningsFromMidnight = 0;
  state.transactions = [
    {
      id: makeId('tx'),
      type: 'deposit',
      title: 'Стартовый бонус',
      detail: 'Зачисление на баланс покупок',
      amount: 250,
      balance: 'purchase',
      at: Date.now(),
    },
  ];
  state.notifications = [
    {
      id: makeId('n'),
      title: 'Аккаунт создан',
      body: `На баланс зачислено 250 ₽. Карточки окупаются примерно за ${BREAK_EVEN_DAYS} дней. VIP-пакет — ${VIP_PACK.price} ₽.`,
      read: false,
      at: Date.now(),
    },
  ];
  persist();
  showToast('Аккаунт создан');
  showAuth(true);
}

function buyProduct(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;
  if (product.limited && state.seasonStock <= 0) {
    showToast('Сезонная карточка распродана');
    return;
  }
  if (state.balances.purchase < product.price) {
    showToast('Недостаточно средств на балансе покупок');
    return;
  }
  openModal(`
    <h2 id="modal-title">Подтверждение оформления</h2>
    <div class="prose">
      <p>Вы оформляете карточку <strong>${product.name}</strong>.</p>
      <ul>
        <li>Стоимость: ${money(product.price, 0)}</li>
        <li>Расчётный доход: ${money(product.daily)} / день</li>
        <li>Срок: ${product.days} дней</li>
      </ul>
      <p>С баланса покупок будет списано ${money(product.price, 0)}. Операцию нельзя отменить в демо.</p>
    </div>
    <div class="modal-actions">
      <button class="ghost-button" type="button" data-close-modal>Отмена</button>
      <button class="primary-button" type="button" id="confirm-buy" data-product="${product.id}">Подтвердить</button>
    </div>
  `);
}

function confirmBuy(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product || state.balances.purchase < product.price) return;
  if (product.limited && state.seasonStock <= 0) {
    showToast('Сезонная карточка распродана');
    closeModal();
    return;
  }
  state.balances.purchase = Number((state.balances.purchase - product.price).toFixed(2));
  state.purchasedVolume = Number((state.purchasedVolume + product.price).toFixed(2));
  if (product.limited) state.seasonStock = Math.max(0, state.seasonStock - 1);
  state.cards.unshift(makeCardFromProduct(product));
  addTransaction({
    type: 'purchase',
    title: 'Оформление карточки',
    detail: product.name,
    amount: -product.price,
    balance: 'purchase',
  });
  pushNotification('Карточка оформлена', `«${product.name}» активна. Окупаемость ≈ ${BREAK_EVEN_DAYS} дней, дальше — прибыль.`);
  if (state.purchasedVolume >= LEVEL_TARGET && state.user.status === 'Стандарт') {
    state.user.status = 'Плюс';
    pushNotification('Новый статус', 'Вы достигли уровня «Плюс».');
  }
  persist();
  closeModal();
  showToast(`Карточка «${product.name}» оформлена`);
  render();
}

function buyVipPack() {
  if (state.user.vip) {
    showToast('VIP уже активирован');
    return;
  }
  if (state.balances.purchase < VIP_PACK.price) {
    showToast('Недостаточно средств для VIP-аккаунта');
    return;
  }
  openModal(`
    <h2 id="modal-title">VIP Аккаунт за ${money(VIP_PACK.price, 0)}</h2>
    <div class="prose">
      <p>По скидке вы получаете сразу три VIP-карточки номиналом ${money(VIP_PACK.faceValue, 0)}:</p>
      <ul>
        ${VIP_PACK.includes
          .map((id) => {
            const p = PRODUCTS.find((x) => x.id === id);
            const eco = productEconomics(p);
            return `<li><strong>${p.name}</strong> — номинал ${money(p.price, 0)}, ${money(p.daily)}/день, срок ${p.days} дн., всего ~${money(eco.total)}</li>`;
          })
          .join('')}
      </ul>
      <p>С баланса покупок спишется только ${money(VIP_PACK.price, 0)}. Статус аккаунта станет VIP.</p>
    </div>
    <div class="modal-actions">
      <button class="ghost-button" type="button" data-close-modal>Отмена</button>
      <button class="primary-button" type="button" id="confirm-vip-pack">Активировать VIP</button>
    </div>
  `);
}

function confirmVipPack() {
  if (state.user.vip || state.balances.purchase < VIP_PACK.price) return;
  state.balances.purchase = Number((state.balances.purchase - VIP_PACK.price).toFixed(2));
  state.purchasedVolume = Number((state.purchasedVolume + VIP_PACK.faceValue).toFixed(2));
  state.user.vip = true;
  state.user.status = 'VIP';
  const cards = VIP_PACK.includes.map((id) => makeCardFromProduct(PRODUCTS.find((p) => p.id === id)));
  state.cards = [...cards, ...state.cards];
  addTransaction({
    type: 'purchase',
    title: 'VIP Аккаунт',
    detail: 'Nova + Orbit + Apex',
    amount: -VIP_PACK.price,
    balance: 'purchase',
  });
  pushNotification('VIP активирован', `Три VIP-карточки добавлены в портфель. Экономия относительно номинала — ${money(VIP_PACK.faceValue - VIP_PACK.price, 0)}.`);
  persist();
  closeModal();
  showToast('VIP-аккаунт активирован');
  render();
}

function openDeposit() {
  openModal(`
    <h2 id="modal-title">Пополнение баланса</h2>
    <form id="deposit-form" class="modal-form">
      <label>Сумма<input name="amount" type="number" min="10" step="1" value="100" required /></label>
      <label>Способ
        <select name="method">
          <option value="card">Банковская карта</option>
          <option value="sbp">СБП</option>
        </select>
      </label>
      <p class="muted">Средства поступят на баланс для покупок (демо мгновенно).</p>
      <div class="modal-actions">
        <button class="ghost-button" type="button" data-close-modal>Отмена</button>
        <button class="primary-button" type="submit">Пополнить</button>
      </div>
    </form>
  `);
}

function openCardDetail(cardId) {
  const card = state.cards.find((c) => c.id === cardId);
  if (!card) return;
  const product = PRODUCTS.find((p) => p.id === card.productId);
  const left = daysLeft(card);
  const earnedEstimate = Number((card.daily * (card.days - left)).toFixed(2));
  const eco = product ? productEconomics(product) : null;
  openModal(`
    <h2 id="modal-title">Карточка «${card.name}»</h2>
    <div class="prose">
      <ul>
        <li>Статус: активна${card.vip || product?.vip ? ' · VIP' : ''}</li>
        <li>Оформлена: ${formatDay(card.purchasedAt)}</li>
        <li>Осталось дней: ${left}</li>
        <li>Доход в день: ${money(card.daily)}</li>
        <li>Оценка начислений за прошедший период: ~${money(earnedEstimate)}</li>
        ${eco ? `<li>Окупаемость: ~${BREAK_EVEN_DAYS} дней · всего за срок ~${money(eco.total)} · прибыль ~${money(eco.profit)}</li>` : ''}
      </ul>
      <p>${product?.desc || ''}</p>
    </div>
    <div class="modal-actions">
      <button class="ghost-button" type="button" data-close-modal>Закрыть</button>
      <button class="primary-button" type="button" data-close-modal data-open="catalog">В каталог</button>
    </div>
  `);
}

function openProductDetail(productId) {
  const p = PRODUCTS.find((x) => x.id === productId);
  if (!p) return;
  const eco = productEconomics(p);
  openModal(`
    <h2 id="modal-title">${p.name}</h2>
    <div class="prose">
      <p>${p.desc}</p>
      <ul>
        <li>Стоимость: ${money(p.price, 0)}</li>
        <li>Доход в день: ${money(p.daily)} (= цена ÷ ${BREAK_EVEN_DAYS})</li>
        <li>Срок: ${p.days} дней</li>
        <li>Окупаемость: ~${BREAK_EVEN_DAYS} дней (~2 месяца)</li>
        <li>Всего за срок: ~${money(eco.total)}</li>
        <li>Прибыль после окупаемости: ~${money(eco.profit)}</li>
      </ul>
      <p>Перед оформлением ознакомьтесь с <button type="button" class="inline-link" id="open-terms-from-detail">условиями сервиса</button>.</p>
    </div>
    <div class="modal-actions">
      <button class="ghost-button" type="button" data-close-modal>Закрыть</button>
      <button class="primary-button" type="button" data-product="${p.id}" ${state.balances.purchase >= p.price ? '' : 'disabled'} id="detail-buy">
        ${state.balances.purchase >= p.price ? 'Оформить' : 'Недостаточно средств'}
      </button>
    </div>
  `);
}

function openHelp() {
  openModal(`
    <h2 id="modal-title">Справка по кабинету</h2>
    <div class="prose">
      <p><strong>Обзор</strong> — балансы, активные карточки и свежие операции.</p>
      <p><strong>Карточки</strong> — каталог с поиском и оформлением.</p>
      <p><strong>Вывод</strong> — заявка от ${MIN_WITHDRAW} ₽ и история выплат.</p>
      <p><strong>Партнёры</strong> — ссылка, бонусы и список приглашённых.</p>
      <p><strong>Операции</strong> — полная лента движений по балансам.</p>
      <p><strong>FAQ</strong> — ответы о рисках, выводе и закрытии сервиса.</p>
      <p><strong>Конфиденциальность</strong> — политика и отказ от ответственности.</p>
      <p><strong>Настройки</strong> — профиль, пароль и 2FA (демо).</p>
    </div>
    <div class="modal-actions"><button class="primary-button" type="button" data-close-modal>Понятно</button></div>
  `);
}

function openSupport() {
  openModal(`
    <h2 id="modal-title">Поддержка</h2>
    <form id="support-form" class="modal-form">
      <label>Тема
        <select name="topic">
          <option>Вопрос по балансу</option>
          <option>Оформление карточки</option>
          <option>Вывод средств</option>
          <option>Партнёрская программа</option>
          <option>Другое</option>
        </select>
      </label>
      <label>Сообщение<textarea name="message" rows="4" required placeholder="Опишите вопрос"></textarea></label>
      <p class="muted">Ответ придёт на ${state.user.email}. Можно также написать на help@swipe.example.</p>
      <div class="modal-actions">
        <a class="ghost-button" href="mailto:help@swipe.example">Email</a>
        <button class="primary-button" type="submit">Отправить</button>
      </div>
    </form>
  `);
}

function openPartnerRules() {
  openModal(`
    <h2 id="modal-title">Правила умной рефералки</h2>
    <div class="prose">
      <ul>
        <li>Бонус начисляется после первой покупки приглашённого: процент зависит от вашего уровня.</li>
        <li>Базовый ${(REFERRAL_TIERS[0].rate * 100).toFixed(0)}% · Продвинутый ${(REFERRAL_TIERS[1].rate * 100).toFixed(0)}% · Про ${(REFERRAL_TIERS[2].rate * 100).toFixed(0)}%.</li>
        <li>Уровень считается по квалифицированным рефералам (стадии «Покупка» и «Активен»).</li>
        <li>Повторные покупки могут давать меньший процент (${(REFERRAL_TIERS[0].renewRate * 100).toFixed(0)}–${(REFERRAL_TIERS[2].renewRate * 100).toFixed(0)}%).</li>
        <li>Саморефералы и накрутка не засчитываются.</li>
        <li>Бонусы также могут быть утрачены при закрытии сервиса — без компенсации.</li>
      </ul>
    </div>
    <div class="modal-actions"><button class="primary-button" type="button" data-close-modal>Закрыть</button></div>
  `);
}

function simulateReferral() {
  const names = ['Мария С.', 'Игорь В.', 'Ольга Н.', 'Дмитрий П.', 'Елена Р.', 'Кирилл А.', 'Анна М.'];
  const name = names[state.referrals.length % names.length];
  state.referrals.unshift({
    id: makeId('ref'),
    name,
    email: `${name.split(' ')[0].toLowerCase()}@mail.example`,
    stage: 'invited',
    bonus: 0,
    purchaseAmount: 0,
    at: Date.now(),
  });
  pushNotification('Новый переход', `${name} открыл(а) вашу ссылку. Продвиньте воронку до покупки.`);
  persist();
  showToast(`${name} добавлен(а) в воронку`);
  render();
}

function advanceFunnel() {
  const target = state.referrals.find((r) => r.stage !== 'active');
  if (!target) {
    showToast('Добавьте реферала в воронку');
    return;
  }
  const order = ['invited', 'registered', 'purchased', 'active'];
  const idx = order.indexOf(target.stage);
  const next = order[Math.min(order.length - 1, idx + 1)];
  target.stage = next;

  if (next === 'registered') {
    pushNotification('Регистрация реферала', `${target.name} создал(а) аккаунт.`);
  }

  if (next === 'purchased') {
    const product = PRODUCTS[1 + (state.referrals.length % 3)];
    const bonus = estimateReferralBonus(state, product.price);
    target.purchaseAmount = product.price;
    target.bonus = Number(((target.bonus || 0) + bonus).toFixed(2));
    state.balances.withdraw = Number((state.balances.withdraw + bonus).toFixed(2));
    addTransaction({
      type: 'bonus',
      title: 'Партнёрский бонус',
      detail: `${target.name} · ${product.name}`,
      amount: bonus,
      balance: 'withdraw',
    });
    const tier = referralTier(state);
    pushNotification('Покупка реферала', `${target.name} оформил(а) «${product.name}». Вам +${money(bonus)} (${(tier.rate * 100).toFixed(0)}%).`);
    showToast(`Бонус ${money(bonus)} зачислен`);
  }

  if (next === 'active') {
    const renew = Number(((target.purchaseAmount || 50) * referralTier(state).renewRate).toFixed(2));
    if (renew > 0) {
      target.bonus = Number(((target.bonus || 0) + renew).toFixed(2));
      state.balances.withdraw = Number((state.balances.withdraw + renew).toFixed(2));
      addTransaction({
        type: 'bonus',
        title: 'Повторный партнёрский бонус',
        detail: target.name,
        amount: renew,
        balance: 'withdraw',
      });
      showToast(`Реферал активен · +${money(renew)}`);
    } else {
      showToast(`${target.name} теперь активен`);
    }
  }

  persist();
  render();
}

function tickEarnings() {
  if (!state.auth.loggedIn) return;
  const income = dailyIncome(state);
  if (income <= 0) return;
  const perTick = income / (24 * 60 * 12);
  const add = Number(perTick.toFixed(4));
  if (add <= 0) return;
  state.earningsToday = Number((state.earningsToday + add).toFixed(4));
  state.earningsFromMidnight = Number((state.earningsFromMidnight + add).toFixed(4));
  state.balances.withdraw = Number((state.balances.withdraw + add).toFixed(4));
  state.lastTick = Date.now();
  if (Math.random() < 0.08) {
    addTransaction({
      type: 'accrual',
      title: 'Начисление дохода',
      detail: `${activeCards(state).length} карт.`,
      amount: Number((add * 8).toFixed(4)),
      balance: 'withdraw',
    });
  }
  persist();
  const active = document.querySelector('.page-section.active')?.id;
  if (active === 'overview' || active === 'withdrawals') render();
  else updateChrome();
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
    login(String(data.get('email')).trim().toLowerCase(), String(data.get('password')));
  });

  document.querySelector('#register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    register({
      name: String(data.get('name')).trim(),
      email: String(data.get('email')).trim().toLowerCase(),
      password: String(data.get('password')),
    });
  });

  document.querySelector('#login-form').email.value = 'alexey@example.com';
  document.querySelector('#login-form').password.value = 'demo1234';

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open], a[href^="#"], [data-open-section], [data-close-modal], [data-product], [data-detail-product], [data-card-id], [data-tip], [data-notify-id]');
    if (e.target.closest('#notify-btn')) {
      const open = els.notifyPanel.hidden;
      closeMenus();
      els.notifyPanel.hidden = !open;
      document.querySelector('#notify-btn').setAttribute('aria-expanded', String(open));
      return;
    }
    if (e.target.closest('#profile-menu-btn') || e.target.closest('#top-avatar')) {
      if (window.matchMedia('(max-width: 700px)').matches && e.target.closest('#top-avatar')) {
        showSection('settings');
        return;
      }
      const open = els.profileMenu.hidden;
      closeMenus();
      els.profileMenu.hidden = !open;
      document.querySelector('#profile-menu-btn').setAttribute('aria-expanded', String(open));
      return;
    }
    if (!e.target.closest('.notify-panel') && !e.target.closest('.profile-menu')) {
      if (!els.notifyPanel.hidden || !els.profileMenu.hidden) closeMenus();
    }

    if (!t) return;

    if (t.hasAttribute('data-close-modal') || t.dataset.closeModal !== undefined) {
      closeModal();
      if (t.dataset.open) showSection(t.dataset.open);
      return;
    }

    if (t.dataset.openSection) {
      showSection(t.dataset.openSection);
      return;
    }

    if (t.dataset.open || (t.getAttribute('href') || '').startsWith('#')) {
      const id = t.dataset.open || t.getAttribute('href').slice(1);
      if (document.getElementById(id)) {
        e.preventDefault();
        showSection(id);
      }
      return;
    }

    if (t.dataset.product && t.id !== 'confirm-buy' && t.id !== 'detail-buy') {
      buyProduct(t.dataset.product);
      return;
    }

    if (t.dataset.detailProduct) {
      openProductDetail(t.dataset.detailProduct);
      return;
    }

    if (t.dataset.cardId) {
      openCardDetail(t.dataset.cardId);
      return;
    }

    if (t.dataset.tip) {
      const tip = HELP[t.dataset.tip];
      if (!tip) return;
      const tipEl = els.tooltip;
      tipEl.hidden = false;
      tipEl.textContent = tip;
      const rect = t.getBoundingClientRect();
      tipEl.style.left = `${Math.min(window.innerWidth - 260, Math.max(8, rect.left))}px`;
      tipEl.style.top = `${rect.bottom + 8 + window.scrollY}px`;
      clearTimeout(bindGlobal._tip);
      bindGlobal._tip = setTimeout(() => {
        tipEl.hidden = true;
      }, 4000);
      return;
    }

    if (t.dataset.notifyId) {
      const n = state.notifications.find((x) => x.id === t.dataset.notifyId);
      if (n) {
        n.read = true;
        persist();
        renderNotifications();
        updateChrome();
      }
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'withdraw-form') {
      e.preventDefault();
      const data = new FormData(e.target);
      const amount = Number(data.get('amount'));
      const method = String(data.get('method'));
      const requisites = String(data.get('requisites')).trim();
      if (amount < MIN_WITHDRAW || amount > state.balances.withdraw) {
        showToast('Проверьте сумму вывода');
        return;
      }
      if (!requisites) {
        showToast('Укажите реквизиты');
        return;
      }
      const methodLabel = { card: 'Карта', sbp: 'СБП', wallet: 'Кошелёк' }[method] || method;
      state.balances.withdraw = Number((state.balances.withdraw - amount).toFixed(2));
      state.user.payoutRequisites = requisites;
      state.withdrawals.unshift({
        id: makeId('w'),
        amount,
        method,
        methodLabel,
        requisites: requisites.replace(/(\d{4})\d+(\d{4})/, '$1••$2'),
        status: 'pending',
        statusLabel: 'В обработке',
        at: Date.now(),
      });
      addTransaction({
        type: 'withdraw',
        title: 'Заявка на вывод',
        detail: methodLabel,
        amount: -amount,
        balance: 'withdraw',
      });
      pushNotification('Заявка на вывод', `Запрошено ${money(amount)}. Статус: в обработке.`);
      persist();
      showToast('Заявка на вывод создана');
      setTimeout(() => {
        const w = state.withdrawals[0];
        if (w && w.status === 'pending') {
          w.status = 'done';
          w.statusLabel = 'Выполнено';
          pushNotification('Выплата отправлена', `${money(w.amount)} отправлены на указанные реквизиты.`);
          persist();
          if (document.querySelector('.page-section.active')?.id === 'withdrawals') render();
        }
      }, 4000);
      render();
    }

    if (e.target.id === 'deposit-form') {
      e.preventDefault();
      const data = new FormData(e.target);
      const amount = Number(data.get('amount'));
      if (amount < 10) {
        showToast('Минимум 10 ₽');
        return;
      }
      state.balances.purchase = Number((state.balances.purchase + amount).toFixed(2));
      addTransaction({
        type: 'deposit',
        title: 'Пополнение баланса',
        detail: data.get('method') === 'sbp' ? 'СБП' : 'Карта',
        amount,
        balance: 'purchase',
      });
      pushNotification('Баланс пополнен', `+${money(amount)} на баланс покупок.`);
      persist();
      closeModal();
      showToast(`Зачислено ${money(amount)}`);
      render();
    }

    if (e.target.id === 'support-form') {
      e.preventDefault();
      const data = new FormData(e.target);
      pushNotification('Обращение принято', `Тема: ${data.get('topic')}. Мы ответим на ${state.user.email}.`);
      persist();
      closeModal();
      showToast('Сообщение отправлено в поддержку');
      renderNotifications();
      updateChrome();
    }

    if (e.target.id === 'profile-form') {
      e.preventDefault();
      const data = new FormData(e.target);
      const name = String(data.get('name')).trim();
      state.user.name = name;
      state.user.firstName = firstNameFrom(name);
      state.user.email = String(data.get('email')).trim().toLowerCase();
      state.user.initials = initialsFromName(name);
      state.user.payoutRequisites = String(data.get('payoutRequisites') || '').trim();
      persist();
      showToast('Профиль сохранён');
      render();
    }

    if (e.target.id === 'security-form') {
      e.preventDefault();
      const data = new FormData(e.target);
      const password = String(data.get('password') || '');
      if (password) state.user.password = password;
      state.user.twoFactor = Boolean(data.get('twoFactor'));
      persist();
      showToast('Настройки безопасности обновлены');
      render();
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'catalog-search') paintCatalog();
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'catalog-filter') paintCatalog();
    if (e.target.id === 'activity-filter') paintActivity();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#copy-referral')) {
      const url = document.querySelector('#referral-url')?.textContent || '';
      navigator.clipboard?.writeText(`https://${url}`).then(
        () => showToast('Ссылка скопирована'),
        () => showToast(`Ваша ссылка: ${url}`)
      );
    }
    if (e.target.closest('#open-deposit')) openDeposit();
    if (e.target.closest('#open-help')) openHelp();
    if (e.target.closest('#open-support')) openSupport();
    if (e.target.closest('#open-terms') || e.target.closest('#open-terms-btn') || e.target.closest('#open-terms-from-detail')) {
      openModal(TERMS_HTML + `<div class="modal-actions"><button class="primary-button" type="button" data-close-modal>Закрыть</button></div>`);
    }
    if (e.target.closest('#open-partner-rules')) openPartnerRules();
    if (e.target.closest('#simulate-referral')) simulateReferral();
    if (e.target.closest('#advance-funnel')) advanceFunnel();
    if (e.target.closest('#share-native')) {
      const url = `https://${document.querySelector('#referral-url')?.textContent || ''}`;
      if (navigator.share) {
        navigator.share({ title: 'SWIPE', text: 'Присоединяйся к SWIPE', url }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(url).then(() => showToast('Ссылка скопирована'));
      }
    }
    if (e.target.closest('#buy-vip-pack')) buyVipPack();
    if (e.target.closest('#confirm-vip-pack')) confirmVipPack();
    if (e.target.closest('#confirm-buy')) confirmBuy(e.target.closest('#confirm-buy').dataset.product);
    if (e.target.closest('#detail-buy')) {
      const id = e.target.closest('#detail-buy').dataset.product;
      closeModal();
      buyProduct(id);
    }
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
      showToast('Вы вышли из аккаунта');
    }
    if (e.target.closest('#reset-demo')) {
      localStorage.removeItem('swipe-cabinet-v1');
      localStorage.removeItem('swipe-cabinet-v2');
      localStorage.removeItem('swipe-cabinet-v3');
      state = loadState();
      state.auth.loggedIn = true;
      persist();
      showToast('Демо-данные сброшены');
      showSection('overview');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeMenus();
      els.tooltip.hidden = true;
    }
  });
}

bindGlobal();
showAuth(state.auth.loggedIn);
setInterval(tickEarnings, 5000);
