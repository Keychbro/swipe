const STORAGE_KEY = 'swipe-cabinet-v4';

/** 1 ₽ = 12 Swape Coin */
export const RUB_TO_SC = 12;
/** Окупаемость ~ за 60 дней, дальше срок идёт в прибыль. */
export const BREAK_EVEN_DAYS = 60;
export const MIN_WITHDRAW_SC = 1200;
export const LEVEL_TARGET = 12000;

function dailyFromPrice(price) {
  return Number((price / BREAK_EVEN_DAYS).toFixed(2));
}

function sc(rub) {
  return rub * RUB_TO_SC;
}

export const PRODUCTS = [
  {
    id: 'micro',
    name: 'Микро',
    price: sc(50),
    daily: dailyFromPrice(sc(50)),
    days: 90,
    tag: 'СТАРТОВАЯ',
    tier: 'mint',
    letter: 'μ',
    desc: 'Входной тариф: окупаемость ~2 месяца, затем прибыль до конца срока.',
  },
  {
    id: 'start',
    name: 'Старт',
    price: sc(100),
    daily: dailyFromPrice(sc(100)),
    days: 90,
    tag: 'БАЗОВАЯ',
    tier: 'orange',
    letter: 'S',
    featured: true,
    desc: 'Ориентир: ≈100 ₽ в SC. Через ~2 месяца выходите в ноль, дальше плюс.',
  },
  {
    id: 'plus',
    name: 'Плюс',
    price: sc(200),
    daily: dailyFromPrice(sc(200)),
    days: 90,
    tag: 'РАСШИРЕННАЯ',
    tier: 'purple',
    letter: 'P',
    desc: 'Удвоенный объём «Старта» с той же логикой окупаемости.',
  },
  {
    id: 'season',
    name: 'Сезон',
    price: sc(300),
    daily: dailyFromPrice(sc(300)),
    days: 100,
    tag: 'СЕЗОН',
    tier: 'amber',
    letter: 'Σ',
    limited: true,
    stock: 37,
    stockMax: 50,
    desc: 'Сезонный тариф с удлинённым хвостом прибыли.',
  },
  {
    id: 'momentum',
    name: 'Моментум',
    price: sc(500),
    daily: dailyFromPrice(sc(500)),
    days: 120,
    tag: 'ПРОФ',
    tier: 'blue',
    letter: 'M',
    desc: '120 дней: 2 месяца до окупаемости и ещё 2 месяца прибыли.',
  },
  {
    id: 'pro',
    name: 'Про',
    price: sc(800),
    daily: dailyFromPrice(sc(800)),
    days: 120,
    tag: 'ПРО',
    tier: 'rose',
    letter: 'Π',
    desc: 'Максимальный обычный тариф на длинной дистанции.',
  },
  {
    id: 'vip-nova',
    name: 'VIP Nova',
    price: sc(1000),
    daily: dailyFromPrice(sc(1000)),
    days: 120,
    tag: 'VIP',
    tier: 'gold',
    letter: 'N',
    vip: true,
    desc: 'VIP-карточка номиналом 1000 ₽ (в SC). Входит в VIP-аккаунт.',
  },
  {
    id: 'vip-orbit',
    name: 'VIP Orbit',
    price: sc(5000),
    daily: dailyFromPrice(sc(5000)),
    days: 120,
    tag: 'VIP',
    tier: 'gold',
    letter: 'O',
    vip: true,
    desc: 'VIP-карточка номиналом 5000 ₽ (в SC).',
  },
  {
    id: 'vip-apex',
    name: 'VIP Apex',
    price: sc(12000),
    daily: dailyFromPrice(sc(12000)),
    days: 120,
    tag: 'VIP',
    tier: 'gold',
    letter: 'A',
    vip: true,
    desc: 'Топ VIP-карточка номиналом 12 000 ₽ (в SC).',
  },
];

export const VIP_PACK = {
  id: 'vip-pack',
  name: 'VIP Аккаунт',
  /** Цена пакета: 16 000 ₽ */
  priceRub: 16000,
  price: sc(16000),
  faceValueRub: 18000,
  faceValue: sc(18000),
  includes: ['vip-nova', 'vip-orbit', 'vip-apex'],
  desc: 'VIP-аккаунт за 16 000 ₽ (в SC со скидкой к номиналу 18 000 ₽): сразу Nova, Orbit и Apex.',
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

export const MISSIONS = [
  {
    id: 'first_card',
    title: 'Первая карточка',
    detail: 'Оформите любую карточку',
    reward: 60,
    check: (s) => s.cards.length >= 1,
  },
  {
    id: 'three_cards',
    title: 'Коллекционер',
    detail: 'Держите 3 активные карточки',
    reward: 150,
    check: (s) => s.cards.filter((c) => c.status === 'active').length >= 3,
  },
  {
    id: 'daily_streak_3',
    title: 'Серия 3 дня',
    detail: 'Заберите ежедневный бонус 3 дня подряд',
    reward: 120,
    check: (s) => (s.bonuses?.streak || 0) >= 3,
  },
  {
    id: 'first_referral',
    title: 'Первый реферал',
    detail: 'Доведите приглашённого до покупки',
    reward: 200,
    check: (s) => s.referrals.some((r) => ['purchased', 'active'].includes(r.stage)),
  },
  {
    id: 'withdraw_ready',
    title: 'Порог вывода',
    detail: `Накопите ${MIN_WITHDRAW_SC} SC на балансе вывода`,
    reward: 180,
    check: (s) => s.balances.withdraw >= MIN_WITHDRAW_SC,
  },
  {
    id: 'vip_owner',
    title: 'Клуб VIP',
    detail: 'Активируйте VIP-аккаунт',
    reward: 500,
    check: (s) => Boolean(s.user.vip),
  },
];

export const ACHIEVEMENTS = [
  { id: 'streak_7', title: 'Неделя огня', detail: 'Стрик 7 дней', reward: 300, check: (s) => (s.bonuses?.streak || 0) >= 7 },
  { id: 'volume_12k', title: 'Объём 12K', detail: 'Оборот карточек от 12 000 SC', reward: 250, check: (s) => s.purchasedVolume >= 12000 },
  { id: 'boost_used', title: 'Ускоритель', detail: 'Активируйте буст дохода', reward: 80, check: (s) => Boolean(s.bonuses?.boostUsed) },
];

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function defaultBonuses() {
  return {
    streak: 0,
    lastClaimDate: null,
    boostUntil: null,
    boostMult: 1,
    boostUsed: false,
    claimedMissions: [],
    claimedAchievements: [],
    xp: 0,
    level: 1,
  };
}

function defaultState() {
  const now = Date.now();
  const start = PRODUCTS.find((p) => p.id === 'start');
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
      purchase: sc(250),
      withdraw: sc(40),
    },
    cards: [
      {
        id: 'card_start_1',
        productId: 'start',
        name: 'Старт',
        letter: 'S',
        tier: 'coral',
        purchasedAt: '2026-06-22',
        daily: start.daily,
        days: start.days,
        status: 'active',
      },
    ],
    transactions: [
      {
        id: uid('tx'),
        type: 'accrual',
        title: 'Начисление дохода',
        detail: 'Старт',
        amount: start.daily,
        balance: 'withdraw',
        at: now - 1000 * 60 * 45,
      },
      {
        id: uid('tx'),
        type: 'purchase',
        title: 'Оформление карточки',
        detail: 'Старт',
        amount: -start.price,
        balance: 'purchase',
        at: Date.parse('2026-06-22T12:00:00'),
      },
      {
        id: uid('tx'),
        type: 'deposit',
        title: 'Донат → SC',
        detail: `350 ₽ × ${RUB_TO_SC}`,
        amount: sc(350),
        balance: 'purchase',
        at: Date.parse('2026-06-20T10:00:00'),
      },
    ],
    withdrawals: [],
    referrals: [],
    seasonStock: 37,
    bonuses: defaultBonuses(),
    games: {
      mines: null,
      stats: { wheelBets: 0, wheelWon: 0, minesBets: 0, minesWon: 0 },
    },
    notifications: [
      {
        id: uid('n'),
        title: 'Добро пожаловать в SWIPE',
        body: `Валюта кабинета — Swape Coin. Курс доната: 1 ₽ = ${RUB_TO_SC} SC. Вывод от ${MIN_WITHDRAW_SC} SC.`,
        read: false,
        at: now - 1000 * 60 * 20,
      },
      {
        id: uid('n'),
        title: 'Бонусы открыты',
        body: 'Забирайте ежедневный стрик, выполняйте миссии и включайте буст дохода.',
        read: false,
        at: now - 1000 * 60 * 60,
      },
    ],
    earningsToday: start.daily,
    earningsFromMidnight: Number((start.daily * 0.25).toFixed(2)),
    lastTick: now,
    purchasedVolume: start.price,
  };
}

export function loadState() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('swipe-cabinet-v3') ||
      localStorage.getItem('swipe-cabinet-v2') ||
      localStorage.getItem('swipe-cabinet-v1');
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    // Force fresh economy defaults when migrating from pre-SC versions
    const fromLegacy = !localStorage.getItem(STORAGE_KEY);
    if (fromLegacy) {
      const fresh = defaultState();
      fresh.auth = { ...fresh.auth, ...parsed.auth };
      fresh.user = {
        ...fresh.user,
        ...parsed.user,
        vip: Boolean(parsed.user?.vip),
        password: parsed.user?.password || fresh.user.password,
        email: parsed.user?.email || fresh.user.email,
        name: parsed.user?.name || fresh.user.name,
        initials: parsed.user?.initials || fresh.user.initials,
      };
      return fresh;
    }
    return {
      ...base,
      ...parsed,
      auth: { ...base.auth, ...parsed.auth },
      user: { ...base.user, ...parsed.user, vip: Boolean(parsed.user?.vip) },
      balances: { ...base.balances, ...parsed.balances },
      bonuses: { ...defaultBonuses(), ...parsed.bonuses },
      games: {
        mines: parsed.games?.mines || null,
        stats: {
          wheelBets: 0,
          wheelWon: 0,
          minesBets: 0,
          minesWon: 0,
          ...parsed.games?.stats,
        },
      },
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

export function rubToSc(rubAmount) {
  return Number((Number(rubAmount) * RUB_TO_SC).toFixed(2));
}

export function scToRub(scAmount) {
  return Number((Number(scAmount) / RUB_TO_SC).toFixed(2));
}

export function activeCards(state) {
  return state.cards.filter((c) => c.status === 'active');
}

export function incomeMultiplier(state) {
  let mult = 1;
  const active = activeCards(state).length;
  if (active >= 3) mult += 0.05;
  if (active >= 5) mult += 0.05;
  if (state.user.vip) mult += 0.1;
  if (state.bonuses?.boostUntil && state.bonuses.boostUntil > Date.now()) {
    mult *= state.bonuses.boostMult || 1.5;
  }
  const levelBonus = Math.min(0.2, ((state.bonuses?.level || 1) - 1) * 0.02);
  mult += levelBonus;
  return Number(mult.toFixed(3));
}

export function dailyIncome(state) {
  const base = activeCards(state).reduce((sum, c) => sum + c.daily, 0);
  return Number((base * incomeMultiplier(state)).toFixed(2));
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

export function productEconomics(product) {
  const total = Number((product.daily * product.days).toFixed(2));
  return {
    total,
    profit: Number((total - product.price).toFixed(2)),
    breakEvenDays: BREAK_EVEN_DAYS,
    roiPct: Math.round((total / product.price) * 100),
  };
}

export function canClaimDaily(state) {
  return state.bonuses?.lastClaimDate !== todayKey();
}

export function dailyRewardAmount(state) {
  const streak = state.bonuses?.streak || 0;
  const nextStreak = canClaimDaily(state) ? Math.min(7, streak + 1) : streak;
  return 24 + nextStreak * 12;
}

export function claimDailyBonus(state) {
  if (!canClaimDaily(state)) return { ok: false, reason: 'Уже получено сегодня' };
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cont = state.bonuses.lastClaimDate === todayKey(yesterday);
  state.bonuses.streak = cont ? Math.min(7, (state.bonuses.streak || 0) + 1) : 1;
  state.bonuses.lastClaimDate = todayKey();
  const amount = 24 + state.bonuses.streak * 12;
  state.balances.purchase = Number((state.balances.purchase + amount).toFixed(2));
  state.bonuses.xp = (state.bonuses.xp || 0) + 15;
  syncLevel(state);
  return { ok: true, amount, streak: state.bonuses.streak };
}

export function activateBoost(state) {
  if (state.bonuses.boostUntil && state.bonuses.boostUntil > Date.now()) {
    return { ok: false, reason: 'Буст уже активен' };
  }
  state.bonuses.boostUntil = Date.now() + 60 * 60 * 1000;
  state.bonuses.boostMult = 1.5;
  state.bonuses.boostUsed = true;
  state.bonuses.xp = (state.bonuses.xp || 0) + 10;
  syncLevel(state);
  return { ok: true, until: state.bonuses.boostUntil };
}

export function syncLevel(state) {
  const xp = state.bonuses.xp || 0;
  state.bonuses.level = Math.max(1, Math.floor(xp / 100) + 1);
}

export function claimMission(state, missionId) {
  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) return { ok: false, reason: 'Миссия не найдена' };
  if (state.bonuses.claimedMissions.includes(missionId)) return { ok: false, reason: 'Уже получено' };
  if (!mission.check(state)) return { ok: false, reason: 'Ещё не выполнено' };
  state.bonuses.claimedMissions.push(missionId);
  state.balances.purchase = Number((state.balances.purchase + mission.reward).toFixed(2));
  state.bonuses.xp = (state.bonuses.xp || 0) + 25;
  syncLevel(state);
  return { ok: true, amount: mission.reward };
}

export function claimAchievement(state, achievementId) {
  const item = ACHIEVEMENTS.find((m) => m.id === achievementId);
  if (!item) return { ok: false, reason: 'Не найдено' };
  if (state.bonuses.claimedAchievements.includes(achievementId)) return { ok: false, reason: 'Уже получено' };
  if (!item.check(state)) return { ok: false, reason: 'Ещё не открыто' };
  state.bonuses.claimedAchievements.push(achievementId);
  state.balances.withdraw = Number((state.balances.withdraw + item.reward).toFixed(2));
  state.bonuses.xp = (state.bonuses.xp || 0) + 40;
  syncLevel(state);
  return { ok: true, amount: item.reward };
}

export { todayKey, defaultBonuses };
