import { expectedRtp } from './trading.js';

const STORAGE_KEY = 'swipe-cabinet-v5';

/** 1 ₽ = 12 Swape Coin */
export const RUB_TO_SC = 12;
export const MIN_WITHDRAW_SC = 1200;
export const LEVEL_TARGET = 12000;

export const VIP_PACK = {
  id: 'vip-pack',
  name: 'VIP Трейдер',
  priceRub: 16000,
  price: 16000 * RUB_TO_SC,
  desc: 'VIP не даёт пассивный доход. Повышает выплату по сделкам, чуть лучше шанс и лимиты — вы всё равно рискуете ставкой.',
};

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

export const MISSIONS = [
  {
    id: 'first_trade',
    title: 'Первая сделка',
    detail: 'Откройте любую Call/Put сделку',
    reward: 40,
    check: (s) => (s.trading?.stats?.trades || 0) >= 1,
  },
  {
    id: 'ten_trades',
    title: 'Разгон',
    detail: 'Совершите 10 сделок',
    reward: 120,
    check: (s) => (s.trading?.stats?.trades || 0) >= 10,
  },
  {
    id: 'daily_streak_3',
    title: 'Серия 3 дня',
    detail: 'Заберите ежедневный бонус 3 дня подряд',
    reward: 80,
    check: (s) => (s.bonuses?.streak || 0) >= 3,
  },
  {
    id: 'first_referral',
    title: 'Первый партнёр',
    detail: 'Доведите приглашённого до первой сделки',
    reward: 150,
    check: (s) => s.referrals.some((r) => ['traded', 'active'].includes(r.stage)),
  },
  {
    id: 'withdraw_ready',
    title: 'Порог вывода',
    detail: `Накопите ${MIN_WITHDRAW_SC} SC на балансе вывода`,
    reward: 100,
    check: (s) => s.balances.withdraw >= MIN_WITHDRAW_SC,
  },
  {
    id: 'vip_owner',
    title: 'VIP кабинет',
    detail: 'Активируйте VIP Трейдер',
    reward: 200,
    check: (s) => Boolean(s.user.vip),
  },
];

export const ACHIEVEMENTS = [
  { id: 'streak_7', title: 'Неделя огня', detail: 'Стрик 7 дней', reward: 200, check: (s) => (s.bonuses?.streak || 0) >= 7 },
  { id: 'volume_12k', title: 'Оборот 12K', detail: 'Торговый оборот от 12 000 SC', reward: 180, check: (s) => (s.trading?.stats?.volume || 0) >= 12000 },
  { id: 'boost_used', title: 'Ускоритель', detail: 'Активируйте буст XP', reward: 60, check: (s) => Boolean(s.bonuses?.boostUsed) },
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
      vip: false,
    },
    balances: {
      /** Trading wallet (ex-purchase): deposit SC here, trade, can move profits to withdraw */
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
        detail: 'Выигрыш · +82%',
        amount: 98.4,
        balance: 'trade',
        at: now - 1000 * 60 * 40,
      },
    ],
    withdrawals: [],
    referrals: [],
    bonuses: defaultBonuses(),
    trading: {
      ...defaultTrading(),
      stats: { trades: 2, wins: 1, losses: 1, volume: 240, pnl: -21.6 },
    },
    games: {
      mines: null,
      stats: { wheelBets: 0, wheelWon: 0, minesBets: 0, minesWon: 0 },
    },
    notifications: [
      {
        id: uid('n'),
        title: 'SWIPE — торговый кабинет',
        body: `Больше нет пассивного дохода с карточек. SC зарабатываются/теряются на сделках Call/Put (RTP ~${expectedRtp()}%).`,
        read: false,
        at: now - 1000 * 60 * 20,
      },
      {
        id: uid('n'),
        title: 'Как это работает',
        body: 'Донат → SC на торговый счёт → сделка с риском ставки → при выигрыше выплата меньше 2×, при проигрыше ставка сгорает.',
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
      localStorage.getItem('swipe-cabinet-v4') ||
      localStorage.getItem('swipe-cabinet-v3');
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
        vip: Boolean(parsed.user?.vip),
        password: parsed.user?.password || fresh.user.password,
        email: parsed.user?.email || fresh.user.email,
        name: parsed.user?.name || fresh.user.name,
        initials: parsed.user?.initials || fresh.user.initials,
      };
      // migrate old purchase balance → trade
      if (parsed.balances?.purchase != null && parsed.balances.trade == null) {
        fresh.balances.trade = Number(parsed.balances.purchase) || fresh.balances.trade;
        fresh.balances.withdraw = Number(parsed.balances.withdraw) || fresh.balances.withdraw;
      }
      return fresh;
    }
    return {
      ...base,
      ...parsed,
      auth: { ...base.auth, ...parsed.auth },
      user: { ...base.user, ...parsed.user, vip: Boolean(parsed.user?.vip) },
      balances: {
        trade: parsed.balances?.trade ?? parsed.balances?.purchase ?? base.balances.trade,
        withdraw: parsed.balances?.withdraw ?? base.balances.withdraw,
      },
      bonuses: { ...defaultBonuses(), ...parsed.bonuses },
      trading: { ...defaultTrading(), ...parsed.trading, stats: { ...defaultTrading().stats, ...parsed.trading?.stats } },
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

/** Affiliate share of friend's lost stake (platform edge share) — not deposit kickback. */
export function referralCutOnLoss(state, lostStake) {
  const tier = referralTier(state);
  return Number((lostStake * tier.rate).toFixed(2));
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
  state.balances.trade = Number((state.balances.trade + amount).toFixed(2));
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
  state.balances.trade = Number((state.balances.trade + mission.reward).toFixed(2));
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

export function moveToWithdraw(state, amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, reason: 'Некорректная сумма' };
  if (value > state.balances.trade) return { ok: false, reason: 'Недостаточно SC на торговом счёте' };
  state.balances.trade = Number((state.balances.trade - value).toFixed(2));
  state.balances.withdraw = Number((state.balances.withdraw + value).toFixed(2));
  return { ok: true, amount: value };
}

export { todayKey, defaultBonuses, expectedRtp };
