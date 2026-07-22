const STORAGE_KEY = 'swipe-cabinet-v1';

export const PRODUCTS = [
  {
    id: 'start',
    name: 'Старт',
    price: 20,
    daily: 0.1,
    days: 30,
    tag: 'НАЧАЛЬНАЯ',
    tier: 'orange',
    letter: 'S',
    desc: 'Базовый вариант для знакомства с механикой сервиса.',
  },
  {
    id: 'plus',
    name: 'Плюс',
    price: 50,
    daily: 0.28,
    days: 30,
    tag: 'РАСШИРЕННАЯ',
    tier: 'purple',
    letter: 'P',
    featured: true,
    desc: 'Для тех, кто уже знаком с правилами и условиями.',
  },
  {
    id: 'momentum',
    name: 'Моментум',
    price: 150,
    daily: 0.9,
    days: 30,
    tag: 'ПРОФЕССИОНАЛЬНАЯ',
    tier: 'blue',
    letter: 'M',
    desc: 'Расширенный лимит с полными условиями в договоре.',
  },
];

export const LEVEL_TARGET = 500;
export const MIN_WITHDRAW = 100;

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function defaultState() {
  const now = Date.now();
  return {
    auth: { loggedIn: false },
    user: {
      name: 'Алексей К.',
      firstName: 'Алексей',
      email: 'alexey@example.com',
      initials: 'АК',
      status: 'Стандарт',
      password: 'demo1234',
      referralCode: 'alexey-k',
      twoFactor: false,
      payoutRequisites: '',
    },
    balances: {
      purchase: 124.5,
      withdraw: 78.2,
    },
    cards: [
      {
        id: 'card_start_1',
        productId: 'start',
        name: 'Старт',
        letter: 'S',
        tier: 'coral',
        purchasedAt: '2026-07-03',
        daily: 0.1,
        days: 30,
        status: 'active',
      },
      {
        id: 'card_plus_1',
        productId: 'plus',
        name: 'Плюс',
        letter: 'P',
        tier: 'violet',
        purchasedAt: '2026-07-10',
        daily: 0.28,
        days: 30,
        status: 'active',
      },
      {
        id: 'card_start_2',
        productId: 'start',
        name: 'Старт',
        letter: 'S',
        tier: 'coral',
        purchasedAt: '2026-07-15',
        daily: 0.1,
        days: 30,
        status: 'active',
      },
    ],
    transactions: [
      {
        id: uid('tx'),
        type: 'accrual',
        title: 'Начисление дохода',
        detail: 'Старт + Плюс + Старт',
        amount: 0.07,
        balance: 'withdraw',
        at: now - 1000 * 60 * 45,
      },
      {
        id: uid('tx'),
        type: 'purchase',
        title: 'Оформление карточки',
        detail: 'Старт',
        amount: -20,
        balance: 'purchase',
        at: Date.parse('2026-07-15T12:00:00'),
      },
      {
        id: uid('tx'),
        type: 'deposit',
        title: 'Пополнение баланса',
        detail: 'Карта ••4582',
        amount: 200,
        balance: 'purchase',
        at: Date.parse('2026-07-02T10:00:00'),
      },
    ],
    withdrawals: [],
    referrals: [],
    notifications: [
      {
        id: uid('n'),
        title: 'Добро пожаловать в SWIPE',
        body: 'Кабинет готов. Оформите карточку или пополните баланс для покупок.',
        read: false,
        at: now - 1000 * 60 * 20,
      },
      {
        id: uid('n'),
        title: 'До минимальной суммы вывода',
        body: 'Осталось 21,80 ₽ до возможности заказать выплату.',
        read: false,
        at: now - 1000 * 60 * 60 * 3,
      },
    ],
    earningsToday: 0.38,
    earningsFromMidnight: 0.07,
    lastTick: now,
    purchasedVolume: 124.5,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed, auth: { ...defaultState().auth, ...parsed.auth }, user: { ...defaultState().user, ...parsed.user }, balances: { ...defaultState().balances, ...parsed.balances } };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  const state = defaultState();
  saveState(state);
  return state;
}

export function makeId(prefix) {
  return uid(prefix);
}

export function activeCards(state) {
  return state.cards.filter((c) => c.status === 'active');
}

export function dailyIncome(state) {
  return activeCards(state).reduce((sum, c) => sum + c.daily, 0);
}

export function daysLeft(card) {
  const start = new Date(card.purchasedAt);
  const end = new Date(start);
  end.setDate(end.getDate() + card.days);
  const ms = end - new Date('2026-07-22T15:00:00');
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function periodProgress(state) {
  const cards = activeCards(state);
  if (!cards.length) return { current: 0, total: 30 };
  const left = Math.min(...cards.map(daysLeft));
  return { current: 30 - left, total: 30 };
}

export function initialsFromName(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function firstNameFrom(name) {
  return String(name).trim().split(/\s+/)[0] || 'пользователь';
}
