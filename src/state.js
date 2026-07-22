const STORAGE_KEY = 'swipe-cabinet-v2';

export const PRODUCTS = [
  {
    id: 'micro',
    name: 'Микро',
    price: 10,
    daily: 0.04,
    days: 14,
    tag: 'МИКРО',
    tier: 'mint',
    letter: 'μ',
    desc: 'Короткий входной тариф, чтобы проверить механику без крупной суммы.',
  },
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
    id: 'season',
    name: 'Сезон',
    price: 80,
    daily: 0.55,
    days: 21,
    tag: 'ЛИМИТ',
    tier: 'amber',
    letter: 'Σ',
    limited: true,
    stock: 37,
    stockMax: 50,
    desc: 'Сезонное предложение с ограниченным количеством и ускоренным сроком.',
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
  {
    id: 'pro',
    name: 'Про',
    price: 300,
    daily: 2.1,
    days: 45,
    tag: 'ПРО',
    tier: 'rose',
    letter: 'Π',
    desc: 'Длинный горизонт и максимальный расчётный дневной доход в каталоге.',
  },
];

export const REFERRAL_TIERS = [
  { id: 'basic', name: 'Базовый', min: 0, rate: 0.05, renewRate: 0.01, nextAt: 5 },
  { id: 'advanced', name: 'Продвинутый', min: 5, rate: 0.08, renewRate: 0.02, nextAt: 15 },
  { id: 'pro', name: 'Про', min: 15, rate: 0.12, renewRate: 0.03, nextAt: null },
];

export const REFERRAL_STAGES = [
  { id: 'invited', label: 'Приглашён', hint: 'Перешёл по ссылке' },
  { id: 'registered', label: 'Регистрация', hint: 'Создал аккаунт' },
  { id: 'purchased', label: 'Покупка', hint: 'Оформил карточку' },
  { id: 'active', label: 'Активен', hint: 'Карточка работает' },
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
    seasonStock: 37,
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
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('swipe-cabinet-v1');
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      auth: { ...base.auth, ...parsed.auth },
      user: { ...base.user, ...parsed.user },
      balances: { ...base.balances, ...parsed.balances },
      seasonStock: parsed.seasonStock ?? base.seasonStock,
      referrals: Array.isArray(parsed.referrals)
        ? parsed.referrals.map((r) => ({
            ...r,
            bonus: Number(r.bonus || 0),
            purchaseAmount: Number(r.purchaseAmount || 0),
            stage: r.stage || (Number(r.bonus) > 0 ? 'active' : 'invited'),
          }))
        : [],
    };
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

export function qualifiedReferrals(state) {
  return state.referrals.filter((r) => ['purchased', 'active'].includes(r.stage));
}

export function referralTier(state) {
  const count = qualifiedReferrals(state).length;
  let current = REFERRAL_TIERS[0];
  for (const tier of REFERRAL_TIERS) {
    if (count >= tier.min) current = tier;
  }
  return { ...current, count };
}

export function nextReferralTier(state) {
  const current = referralTier(state);
  return REFERRAL_TIERS.find((t) => t.min > current.min) || null;
}

export function estimateReferralBonus(state, purchaseAmount) {
  const tier = referralTier(state);
  return Number((purchaseAmount * tier.rate).toFixed(2));
}

export function recommendProduct(balance) {
  const affordable = PRODUCTS.filter((p) => {
    if (p.limited && balance < p.price) return false;
    return balance >= p.price;
  }).sort((a, b) => b.price - a.price);
  return affordable[0] || PRODUCTS[0];
}

export function tierClass(productTier) {
  const map = {
    orange: 'coral',
    purple: 'violet',
    blue: 'blue',
    mint: 'mint',
    amber: 'amber',
    rose: 'rose',
  };
  return map[productTier] || productTier;
}
