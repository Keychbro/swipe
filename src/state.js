import { expectedRtp } from './trading.js';

const STORAGE_KEY = 'swipe-cabinet-v6';

/** 1 ₽ = 12 Swape Coin */
export const RUB_TO_SC = 12;
export const MIN_WITHDRAW_SC = 1200;
export const LEVEL_TARGET = 12000;

export const REFERRAL_TIERS = [
  { id: 'basic', name: 'Базовый', min: 0, rate: 0.03, nextAt: 5 },
  { id: 'advanced', name: 'Продвинутый', min: 5, rate: 0.05, nextAt: 15 },
  { id: 'pro', name: 'Про', min: 15, rate: 0.07, nextAt: null },
];

export const REFERRAL_STAGES = [
  { id: 'invited', label: 'Приглашён', hint: 'Перешёл по ссылке' },
  { id: 'registered', label: 'Регистрация', hint: 'Создал аккаунт' },
  { id: 'traded', label: 'Сделка', hint: 'Совершил сделку' },
  { id: 'active', label: 'Активен', hint: 'Торгует регулярно' },
];

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function defaultBonuses() {
  return {
    /** Days in a row with at least one trade */
    streak: 0,
    lastTradeDate: null,
    lastBonusDate: null,
  };
}

function defaultTrading() {
  return {
    assetId: 'btc',
    timeframeId: '60',
    prices: {},
    history: [],
    open: [],
    stats: { trades: 0, wins: 0, losses: 0, volume: 0, pnl: 0 },
  };
}

function sc(rub) {
  return rub * RUB_TO_SC;
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
      trade: sc(250),
      withdraw: sc(40),
    },
    transactions: [
      {
        id: uid('tx'),
        type: 'deposit',
        title: 'Донат → SC',
        detail: `250 ₽ × ${RUB_TO_SC}`,
        amount: sc(350),
        balance: 'trade',
        at: Date.parse('2026-06-20T10:00:00'),
      },
      {
        id: uid('tx'),
        type: 'trade',
        title: 'Сделка BTC Call',
        detail: 'Проигрыш · 1 мин',
        amount: -120,
        balance: 'trade',
        at: now - 1000 * 60 * 90,
      },
      {
        id: uid('tx'),
        type: 'trade',
        title: 'Сделка ETH Put',
        detail: 'Выигрыш · +92%',
        amount: 110.4,
        balance: 'trade',
        at: now - 1000 * 60 * 40,
      },
    ],
    withdrawals: [],
    referrals: [],
    bonuses: defaultBonuses(),
    trading: {
      ...defaultTrading(),
      stats: { trades: 2, wins: 1, losses: 1, volume: 240, pnl: -9.6 },
    },
    notifications: [
      {
        id: uid('n'),
        title: 'SWIPE — торговый кабинет',
        body: `Сделки Call/Put с выплатой +92% при победе. RTP ~${expectedRtp()}%. Пассивного дохода нет.`,
        read: false,
        at: now - 1000 * 60 * 20,
      },
      {
        id: uid('n'),
        title: 'Ежедневный бонус',
        body: 'Сделайте хотя бы одну ставку в день — бонус за серию в разделе «Партнёрская программа».',
        read: false,
        at: now - 1000 * 60 * 10,
      },
    ],
  };
}

export function loadState() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('swipe-cabinet-v5') ||
      localStorage.getItem('swipe-cabinet-v4');
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    const fromLegacy = !localStorage.getItem(STORAGE_KEY);
    if (fromLegacy) {
      const fresh = defaultState();
      fresh.auth = { ...fresh.auth, ...parsed.auth };
      fresh.user = {
        ...fresh.user,
        ...parsed.user,
        password: parsed.user?.password || fresh.user.password,
        email: parsed.user?.email || fresh.user.email,
        name: parsed.user?.name || fresh.user.name,
        initials: parsed.user?.initials || fresh.user.initials,
      };
      delete fresh.user.vip;
      if (parsed.balances?.trade != null || parsed.balances?.purchase != null) {
        fresh.balances.trade = Number(parsed.balances.trade ?? parsed.balances.purchase) || fresh.balances.trade;
        fresh.balances.withdraw = Number(parsed.balances.withdraw) || fresh.balances.withdraw;
      }
      return fresh;
    }
    const user = { ...base.user, ...parsed.user };
    delete user.vip;
    return {
      ...base,
      ...parsed,
      auth: { ...base.auth, ...parsed.auth },
      user,
      balances: {
        trade: parsed.balances?.trade ?? parsed.balances?.purchase ?? base.balances.trade,
        withdraw: parsed.balances?.withdraw ?? base.balances.withdraw,
      },
      bonuses: { ...defaultBonuses(), ...parsed.bonuses },
      trading: { ...defaultTrading(), ...parsed.trading, stats: { ...defaultTrading().stats, ...parsed.trading?.stats } },
      referrals: Array.isArray(parsed.referrals)
        ? parsed.referrals.map((r) => ({
            ...r,
            bonus: Number(r.bonus || 0),
            stage: r.stage === 'purchased' ? 'traded' : r.stage || 'invited',
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
  return state.referrals.filter((r) => ['traded', 'active'].includes(r.stage));
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

export function referralCutOnLoss(state, lostStake) {
  const tier = referralTier(state);
  return Number((lostStake * tier.rate).toFixed(2));
}

export function dailyTradeBonusAmount(streak) {
  return 30 + Math.min(7, Math.max(1, streak)) * 15;
}

/** First trade of the day grants streak bonus onto trade balance. */
export function registerDailyTrade(state) {
  const today = todayKey();
  if (state.bonuses.lastBonusDate === today) {
    return { ok: false, reason: 'Бонус за сегодня уже получен' };
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cont = state.bonuses.lastTradeDate === todayKey(yesterday) || state.bonuses.lastBonusDate === todayKey(yesterday);
  state.bonuses.streak = cont ? Math.min(7, (state.bonuses.streak || 0) + 1) : 1;
  state.bonuses.lastTradeDate = today;
  state.bonuses.lastBonusDate = today;
  const amount = dailyTradeBonusAmount(state.bonuses.streak);
  state.balances.trade = Number((state.balances.trade + amount).toFixed(2));
  return { ok: true, amount, streak: state.bonuses.streak };
}

export function canClaimDailyTradeBonus(state) {
  const today = todayKey();
  const tradedToday = state.bonuses.lastTradeDate === today;
  const claimed = state.bonuses.lastBonusDate === today;
  return tradedToday && !claimed;
}

export function moveToWithdraw(state, amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, reason: 'Некорректная сумма' };
  if (value > state.balances.trade) return { ok: false, reason: 'Недостаточно SC на торговом счёте' };
  state.balances.trade = Number((state.balances.trade - value).toFixed(2));
  state.balances.withdraw = Number((state.balances.withdraw + value).toFixed(2));
  return { ok: true, amount: value };
}

export { todayKey, defaultBonuses, expectedRtp };
