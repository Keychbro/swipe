import './style.css';
import {
  PRODUCTS,
  LEVEL_TARGET,
  MIN_WITHDRAW,
  loadState,
  saveState,
  makeId,
  activeCards,
  dailyIncome,
  daysLeft,
  periodProgress,
  initialsFromName,
  firstNameFrom,
} from './state.js';

let state = loadState();
const TITLE_MAP = {
  overview: 'Обзор',
  catalog: 'Карточки',
  withdrawals: 'Вывод средств',
  partners: 'Партнёрская программа',
  activity: 'Операции',
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
    </ul>
    <p>Продолжая работу в кабинете, вы подтверждаете, что ознакомились с рисками и применимым законодательством.</p>
  </div>
`;

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
  document.querySelector('#sidebar-status').textContent = `Статус: ${user.status}`;
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
      <button class="outline-button" type="button" id="open-help">⌄ <span>Справка по кабинету</span></button>
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
  document.querySelector('#catalog').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">КАТАЛОГ</p>
        <h1>Выберите карточку</h1>
        <p class="muted">Все параметры и срок действия указаны до оформления.</p>
      </div>
      <div class="balance-chip">Доступно: <b>${money(state.balances.purchase)}</b></div>
    </div>
    <div class="catalog-toolbar">
      <label class="search-field">Поиск<input id="catalog-search" type="search" placeholder="Название или тег" /></label>
      <select id="catalog-filter">
        <option value="all">Все карточки</option>
        <option value="affordable">Доступные по балансу</option>
        <option value="featured">Рекомендуемые</option>
      </select>
    </div>
    <div class="catalog-grid" id="catalog-grid"></div>
    <div class="notice"><span>i</span><p>Расчётные показатели приведены исключительно для демонстрации интерфейса. Перед любой операцией проверяйте юридические условия, риски и применимое законодательство.</p></div>
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
    if (filter === 'featured') return Boolean(p.featured);
    return true;
  });

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state"><strong>Ничего не найдено</strong><p>Измените фильтр или поисковый запрос.</p></div>`;
    return;
  }

  grid.innerHTML = items
    .map((p) => {
      const canBuy = state.balances.purchase >= p.price;
      return `
      <article class="product-card ${p.featured ? 'featured' : ''}">
        ${p.featured ? '<div class="featured-label">ВЫБОР ПОЛЬЗОВАТЕЛЕЙ</div>' : ''}
        <div class="product-top"><span class="tier-icon ${p.tier}">${p.letter}</span><span class="tag">${p.tag}</span></div>
        <h2>${p.name}</h2>
        <p>${p.desc}</p>
        <div class="price-row"><span>Стоимость</span><strong>${money(p.price, 0)}</strong></div>
        <div class="income-row"><span>Расчётный доход в день</span><strong>${money(p.daily)}</strong></div>
        <div class="terms">Срок действия: ${p.days} дней · ROI ~${((p.daily * p.days) / p.price * 100).toFixed(0)}%</div>
        <div class="product-actions">
          <button class="ghost-button" type="button" data-detail-product="${p.id}">Подробнее</button>
          <button class="primary-button buy-button" type="button" data-product="${p.id}" ${canBuy ? '' : 'disabled'}>
            ${canBuy ? `Оформить за ${money(p.price, 0)} <span>→</span>` : 'Недостаточно средств'}
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
  const bonusTotal = state.referrals.reduce((s, r) => s + r.bonus, 0);
  document.querySelector('#partners').innerHTML = `
    <div class="welcome-row">
      <div>
        <p class="eyebrow">ПАРТНЁРСКАЯ ПРОГРАММА</p>
        <h1>Приглашайте знакомых</h1>
        <p class="muted">Получайте бонусы на условиях программы.</p>
      </div>
      <button class="outline-button" type="button" id="open-partner-rules">Правила программы</button>
    </div>
    <div class="referral-hero">
      <div>
        <span class="eyebrow">ВАША РЕФЕРАЛЬНАЯ ССЫЛКА</span>
        <h2>Делитесь SWIPE<br>с теми, кому доверяете.</h2>
        <p>Условия начисления бонусов описаны в правилах партнёрской программы.</p>
        <div class="referral-link"><span id="referral-url">${url}</span><button type="button" id="copy-referral">Копировать</button></div>
        <div class="partner-actions">
          <button class="ghost-button" type="button" id="simulate-referral">Симулировать приглашение</button>
        </div>
      </div>
      <div class="orbital"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="ref-symbol">S</div></div>
    </div>
    <div class="partner-stats">
      <article><span>Приглашено</span><strong>${state.referrals.length}</strong><small>пользователей</small></article>
      <article><span>Бонусы</span><strong>${money(bonusTotal)}</strong><small>всего начислено</small></article>
      <article><span>Ваш уровень</span><strong>${state.referrals.length >= 5 ? 'Продвинутый' : 'Базовый'}</strong><small>согласно условиям программы</small></article>
    </div>
    <section class="panel partner-list-panel">
      <div class="panel-heading"><div><p class="eyebrow">ПРИГЛАШЁННЫЕ</p><h2>Список рефералов</h2></div></div>
      ${
        state.referrals.length
          ? `<div class="history-list">${state.referrals
              .map(
                (r) => `
            <div class="history-row">
              <div><strong>${r.name}</strong><span>${r.email} · ${r.status}</span></div>
              <div class="history-meta"><b class="pos">+${money(r.bonus)}</b><time>${formatDate(r.at)}</time></div>
            </div>`
              )
              .join('')}</div>`
          : `<div class="empty-state compact"><strong>Пока никого нет</strong><p>Поделитесь ссылкой — приглашённые появятся здесь.</p></div>`
      }
    </section>
  `;
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
  state.balances = { purchase: 100, withdraw: 0 };
  state.cards = [];
  state.purchasedVolume = 0;
  state.earningsToday = 0;
  state.earningsFromMidnight = 0;
  state.transactions = [
    {
      id: makeId('tx'),
      type: 'deposit',
      title: 'Стартовый бонус',
      detail: 'Зачисление на баланс покупок',
      amount: 100,
      balance: 'purchase',
      at: Date.now(),
    },
  ];
  state.notifications = [
    {
      id: makeId('n'),
      title: 'Аккаунт создан',
      body: 'На баланс покупок зачислено 100 ₽ для знакомства с каталогом.',
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
  state.balances.purchase = Number((state.balances.purchase - product.price).toFixed(2));
  state.purchasedVolume = Number((state.purchasedVolume + product.price).toFixed(2));
  const card = {
    id: makeId('card'),
    productId: product.id,
    name: product.name,
    letter: product.letter,
    tier: product.tier === 'orange' ? 'coral' : product.tier === 'purple' ? 'violet' : 'blue',
    purchasedAt: '2026-07-22',
    daily: product.daily,
    days: product.days,
    status: 'active',
  };
  state.cards.unshift(card);
  addTransaction({
    type: 'purchase',
    title: 'Оформление карточки',
    detail: product.name,
    amount: -product.price,
    balance: 'purchase',
  });
  pushNotification('Карточка оформлена', `«${product.name}» активна. Доход начнёт поступать на баланс вывода.`);
  if (state.purchasedVolume >= LEVEL_TARGET && state.user.status === 'Стандарт') {
    state.user.status = 'Плюс';
    pushNotification('Новый статус', 'Вы достигли уровня «Плюс».');
  }
  persist();
  closeModal();
  showToast(`Карточка «${product.name}» оформлена`);
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
  openModal(`
    <h2 id="modal-title">Карточка «${card.name}»</h2>
    <div class="prose">
      <ul>
        <li>Статус: активна</li>
        <li>Оформлена: ${formatDay(card.purchasedAt)}</li>
        <li>Осталось дней: ${left}</li>
        <li>Доход в день: ${money(card.daily)}</li>
        <li>Оценка начислений за период: ~${money(earnedEstimate)}</li>
        ${product ? `<li>Полный расчёт за срок: ${money(product.daily * product.days)}</li>` : ''}
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
  openModal(`
    <h2 id="modal-title">${p.name}</h2>
    <div class="prose">
      <p>${p.desc}</p>
      <ul>
        <li>Стоимость: ${money(p.price, 0)}</li>
        <li>Доход в день: ${money(p.daily)}</li>
        <li>Срок: ${p.days} дней</li>
        <li>Ожидаемый итог: ${money(p.daily * p.days)}</li>
        <li>Ориентир ROI: ${((p.daily * p.days) / p.price * 100).toFixed(0)}%</li>
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
    <h2 id="modal-title">Правила партнёрской программы</h2>
    <div class="prose">
      <ul>
        <li>5% от первой покупки приглашённого — на баланс вывода.</li>
        <li>Бонус начисляется после оформления карточки рефералом.</li>
        <li>С 5 приглашённых открывается уровень «Продвинутый».</li>
        <li>Самоприглашения и накрутка не засчитываются.</li>
      </ul>
    </div>
    <div class="modal-actions"><button class="primary-button" type="button" data-close-modal>Закрыть</button></div>
  `);
}

function simulateReferral() {
  const names = ['Мария С.', 'Игорь В.', 'Ольга Н.', 'Дмитрий П.', 'Елена Р.'];
  const name = names[state.referrals.length % names.length];
  const bonus = 2.5;
  state.referrals.unshift({
    id: makeId('ref'),
    name,
    email: `${name.split(' ')[0].toLowerCase()}@mail.example`,
    status: 'Активирован',
    bonus,
    at: Date.now(),
  });
  state.balances.withdraw = Number((state.balances.withdraw + bonus).toFixed(2));
  addTransaction({
    type: 'bonus',
    title: 'Партнёрский бонус',
    detail: name,
    amount: bonus,
    balance: 'withdraw',
  });
  pushNotification('Новый реферал', `${name} зарегистрировался по вашей ссылке. Бонус ${money(bonus)}.`);
  persist();
  showToast(`Приглашение учтено: +${money(bonus)}`);
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
