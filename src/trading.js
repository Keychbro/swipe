/** Pocket Option–style short trades. Users risk stake; house edge via payout < 100%. */

export const TRADE_ASSETS = [
  { id: 'btc', name: 'BTC/USD', symbol: 'BTC', base: 68450, volatility: 0.0018, decimals: 2 },
  { id: 'eth', name: 'ETH/USD', symbol: 'ETH', base: 3520, volatility: 0.0022, decimals: 2 },
  { id: 'eur', name: 'EUR/USD', symbol: 'EUR', base: 1.0842, volatility: 0.00035, decimals: 5 },
  { id: 'gold', name: 'XAU/USD', symbol: 'XAU', base: 2385, volatility: 0.0009, decimals: 2 },
  { id: 'us100', name: 'US100', symbol: 'NQ', base: 19840, volatility: 0.0011, decimals: 1 },
];

export const TIMEFRAMES = [
  { id: '30', label: '30 сек', seconds: 30, payout: 0.78 },
  { id: '60', label: '1 мин', seconds: 60, payout: 0.82 },
  { id: '300', label: '5 мин', seconds: 300, payout: 0.85 },
];

export const MIN_TRADE = 20;
export const MAX_TRADE = 100000;
/** Slight under-50 win rate so platform is not paying “free money”. */
export const BASE_WIN_CHANCE = 0.47;
export const VIP_WIN_CHANCE = 0.49;
export const VIP_PAYOUT_BONUS = 0.04;

export function getAsset(id) {
  return TRADE_ASSETS.find((a) => a.id === id) || TRADE_ASSETS[0];
}

export function getTimeframe(id) {
  return TIMEFRAMES.find((t) => t.id === id) || TIMEFRAMES[1];
}

export function payoutRate(timeframeId, isVip) {
  const tf = getTimeframe(timeframeId);
  return Number((tf.payout + (isVip ? VIP_PAYOUT_BONUS : 0)).toFixed(2));
}

export function winChance(isVip) {
  return isVip ? VIP_WIN_CHANCE : BASE_WIN_CHANCE;
}

/** Demo price tick around a walk. */
export function nextPrice(asset, lastPrice, random = Math.random) {
  const shock = (random() - 0.5) * 2 * asset.volatility * lastPrice;
  const drift = (random() - 0.5) * asset.volatility * lastPrice * 0.15;
  const price = Math.max(lastPrice * 0.2, lastPrice + shock + drift);
  return Number(price.toFixed(asset.decimals));
}

export function buildSparkline(asset, points = 40, seedPrice) {
  let price = seedPrice ?? asset.base;
  const series = [];
  for (let i = 0; i < points; i += 1) {
    price = nextPrice(asset, price);
    series.push(price);
  }
  return series;
}

/**
 * Settle with explicit house edge: winChance < 50%, win pays stake + stake*payout.
 * Close price is adjusted to match the outcome for the chart story.
 */
export function resolveTrade({ direction, openPrice, stake, payout, isVip, asset, random = Math.random }) {
  const won = random() < winChance(isVip);
  const move = Math.max(openPrice * asset.volatility * (0.4 + random()), openPrice * 0.0002);
  let closePrice;
  if (won) {
    closePrice = direction === 'call' ? openPrice + move : openPrice - move;
  } else {
    closePrice = direction === 'call' ? openPrice - move : openPrice + move;
  }
  closePrice = Number(closePrice.toFixed(asset.decimals));
  const profit = won ? Number((stake * payout).toFixed(2)) : 0;
  const payoutTotal = won ? Number((stake + profit).toFixed(2)) : 0;
  return {
    won,
    openPrice,
    closePrice,
    profit,
    payoutTotal,
    pnl: won ? profit : -stake,
  };
}

export function expectedRtp(isVip = false) {
  const p = winChance(isVip);
  const pay = payoutRate('60', isVip);
  return Number(((p * (1 + pay)) * 100).toFixed(1));
}
