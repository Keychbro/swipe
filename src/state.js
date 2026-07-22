const STORAGE_KEY = 'swipe-cabinet-v3';

/** Окупаемость ~ за 60 дней (2 месяца), дальше срок идёт в прибыль. */
export const BREAK_EVEN_DAYS = 60;

function dailyFromPrice(price) {
  return Number((price / BREAK_EVEN_DAYS).toFixed(2));
}

export const PRODUCTS = [
  {
    id: 'micro',
    name: 'Микро',
    price: 50,
    daily: dailyFromPrice(50),
    days: 90,
    tag: 'СТАРТОВАЯ',
    tier: 'mint',
    letter: 'μ',
    desc: 'Входной тариф: около 50 ₽ возвращаются за ~2 месяца, ещё 30 дней — в плюс.',
  },
  {
    id: 'start',
    name: 'Старт',
    price: 100,
    daily: dailyFromPrice(100),
    days: 90,
    tag: 'БАЗОВАЯ',
    tier: 'orange',
    letter: 'S',
    featured: true,
    desc: 'Ориентир экономики SWIPE: вложили 100 ₽ → примерно через 2 месяца вышли в ноль, дальше прибыль.',
  },
  {
    id: 'plus',
    name: 'Плюс',
    price: 200,
    daily: dailyFromPrice(200),
    days: 90,
    tag: 'РАСШИРЕННАЯ',
    tier: 'purple',
    letter: 'P',
    desc: 'Удвоенный объём относительно «Старта»: окупаемость ~60 дней, срок 90 дней.',
  },
  {
    id: 'season',
    name: 'Сезон',
    price: 300,
    daily: dailyFromPrice(300),
    days: 100,
    tag: 'СЕЗОН',
    tier: 'amber',
    letter: 'Σ',
    limited: true,
    stock: 37,
    stockMax: 50,
    desc: 'Сезонный тариф с удлинённым хвостом прибыли после точки окупаемости.',
  },
  {
    id: 'momentum',
    name: 'Моментум',
    price: 500,
    daily: dailyFromPrice(500),
    days: 120,
    tag: 'ПРОФ',
    tier: 'blue',
    letter: 'M',
    desc: 'Длинный горизонт 120 дней: 2 месяца до окупаемости и ещё 2 месяца чистой прибыли.',
  },
  {
    id: 'pro',
    name: 'Про',
    price: 800,
    daily: dailyFromPrice(800),
    days: 120,
    tag: 'ПРО',
    tier: 'rose',
    letter: 'Π',
    desc: 'Максимальный обычный тариф: окупаемость ~60 дней, затем усиленная прибыль до дня 120.',
  },
  {
    id: 'vip-nova',
    name: 'VIP Nova',
    price: 1000,
    daily: dailyFromPrice(1000),
    days: 120,
    tag: 'VIP',
    tier: 'gold',
    letter: 'N',
    vip: true,
    desc: 'VIP-карточка номиналом 1000 ₽. Входит в VIP-аккаунт или покупается отдельно.',
  },
  {
    id: 'vip-orbit',
    name: 'VIP Orbit',
    price: 5000,
    daily: dailyFromPrice(5000),
    days: 120,
    tag: 'VIP',
    tier: 'gold',
    letter: 'O',
    vip: true,
    desc: 'VIP-карточка номиналом 5000 ₽ с длинным периодом после окупаемости.',
  },
  {
    id: 'vip-apex',
    name: 'VIP Apex',
    price: 12000,
    daily: dailyFromPrice(12000),
    days: 120,
    tag: 'VIP',
    tier: 'gold',
    letter: 'A',
    vip: true,
    desc: 'Топ VIP-карточка номиналом 12 000 ₽. Максимальный дневной доход в каталоге.',
  },
];

export const VIP_PACK = {
  id: 'vip-pack',
  name: 'VIP Аккаунт',
  price: 199,
  faceValue: 18000,
  includes: ['vip-nova', 'vip-orbit', 'vip-apex'],
  desc: 'Скидочный VIP-аккаунт за 199 ₽: сразу три VIP-карточки номиналом 1000 ₽, 5000 ₽ и 12 000 ₽.',
};

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

export const LEVEL_TARGET = 1000;
export const MIN_WITHDRAW = 100;

export function productEconomics(product) {
  const total = Number((product.daily * product.days).toFixed(2));
  return {
    total,
    profit: Number((total - product.price).toFixed(2)),
    breakEvenDays: BREAK_EVEN_DAYS,
    roiPct: Math.round((total / product.price) * 100),
  };
}

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
      vip: false,
    },
    balances: {
      purchase: 250,
      withdraw: 45,
    },
    cards: [
      {
        id: 'card_start_1',
        productId: 'start',
        name: 'Старт',
        letter: 'S',
        tier: 'coral',
        purchasedAt: '2026-06-22',
        daily: dailyFromPrice(100),
        days: 90,
        status: 'active',
      },
    ],
    transactions: [
      {
        id: uid('tx'),
        type: 'accrual',
        title: 'Начисление дохода',
        detail: 'Старт',
        amount: 1.67,
        balance: 'withdraw',
        at: now - 1000 * 60 * 45,
      },
      {
        id: uid('tx'),
        type: 'purchase',
        title: 'Оформление карточки',
        detail: 'Старт',
        amount: -100,
        balance: 'purchase',
        at: Date.parse('2026-06-22T12:00:00'),
      },
      {
        id: uid('tx'),
        type: 'deposit',
        title: 'Пополнение баланса',
        detail: 'Карта ••4582',
        amount: 350,
        balance: 'purchase',
        at: Date.parse('2026-06-20T10:00:00'),
      },
    ],
    withdrawals: [],
    referrals: [],
    seasonStock: 37,
    notifications: [
      {
        id: uid('n'),
        title: 'Добро пожаловать в SWIPE',
        body: 'Экономика карточек: окупаемость около 2 месяцев, дальше срок идёт в прибыль. VIP-аккаунт — 199 ₽.',
        read: false,
        at: now - 1000 * 60 * 20,
      },
      {
        id: uid('n'),
        title: 'До минимальной суммы вывода',
        body: 'Осталось 55,00 ₽ до возможности заказать выплату.',
        read: false,
        at: now - 1000 * 60 * 60 * 3,
      },
    ],
    earningsToday: 1.67,
    earningsFromMidnight: 0.42,
    lastTick: now,
    purchasedVolume: 100,
  };
}

export function loadState() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('swipe-cabinet-v2') ||
      localStorage.getItem('swipe-cabinet-v1');
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      auth: { ...base.auth, ...parsed.auth },
      user: { ...base.user, ...parsed.user, vip: Boolean(parsed.user?.vip) },
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
  if (!cards.length) return { current: 0, total: 90 };
  const totals = cards.map((c) => c.days || 90);
  const lefts = cards.map(daysLeft);
  const idx = lefts.indexOf(Math.min(...lefts));
  const total = totals[idx] || 90;
  return { current: Math.max(0, total - lefts[idx]), total };
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
    if (p.vip) return false;
    if (p.limited && balance < p.price) return false;
    return balance >= p.price;
  }).sort((a, b) => b.price - a.price);
  return affordable[0] || PRODUCTS.find((p) => !p.vip) || PRODUCTS[0];
}

export function tierClass(productTier) {
  const map = {
    orange: 'coral',
    purple: 'violet',
    blue: 'blue',
    mint: 'mint',
    amber: 'amber',
    rose: 'rose',
    gold: 'gold',
  };
  return map[productTier] || productTier;
}

export function makeCardFromProduct(product, purchasedAt = '2026-07-22') {
  return {
    id: uid('card'),
    productId: product.id,
    name: product.name,
    letter: product.letter,
    tier: tierClass(product.tier),
    purchasedAt,
    daily: product.daily,
    days: product.days,
    status: 'active',
    vip: Boolean(product.vip),
  };
}
