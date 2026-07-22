/** House-edge casino helpers for SWIPE games (SC). */

/** Target RTP ≈ 92–94% so house stays ahead of 50/50. */
export const WHEEL_SEGMENTS = [
  { id: 'lose-a', label: '×0', mult: 0, weight: 34, color: '#2a3148' },
  { id: 'x12', label: '×1.2', mult: 1.2, weight: 22, color: '#2f6f6a' },
  { id: 'lose-b', label: '×0', mult: 0, weight: 12, color: '#3a2430' },
  { id: 'x15', label: '×1.5', mult: 1.5, weight: 16, color: '#3d4ea8' },
  { id: 'x2', label: '×2', mult: 2, weight: 10, color: '#6d4bb0' },
  { id: 'x3', label: '×3', mult: 3, weight: 4, color: '#b07a2c' },
  { id: 'x5', label: '×5', mult: 5, weight: 1.5, color: '#c4698a' },
  { id: 'x10', label: '×10', mult: 10, weight: 0.5, color: '#e0b65c' },
];

export function wheelRtp() {
  const total = WHEEL_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  const ev = WHEEL_SEGMENTS.reduce((s, seg) => s + (seg.weight / total) * seg.mult, 0);
  return Number((ev * 100).toFixed(1));
}

export function pickWheelSegment(random = Math.random()) {
  const total = WHEEL_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  let cursor = random * total;
  for (let i = 0; i < WHEEL_SEGMENTS.length; i += 1) {
    cursor -= WHEEL_SEGMENTS[i].weight;
    if (cursor <= 0) return { segment: WHEEL_SEGMENTS[i], index: i };
  }
  return { segment: WHEEL_SEGMENTS[WHEEL_SEGMENTS.length - 1], index: WHEEL_SEGMENTS.length - 1 };
}

/** Angle for CSS rotation so pointer at top lands on segment index. */
export function wheelRotationForIndex(index, spins = 6) {
  const n = WHEEL_SEGMENTS.length;
  const slice = 360 / n;
  const center = index * slice + slice / 2;
  // pointer at top (0deg); wheel rotates clockwise in CSS positive
  return spins * 360 + (360 - center);
}

export const MINES_GRID = 5;
export const MINES_HOUSE_EDGE = 0.06; // ~6% edge vs fair odds
export const MINES_OPTIONS = [3, 5, 8];

export function createMinesBoard(mineCount, grid = MINES_GRID, random = Math.random) {
  const total = grid * grid;
  const mines = new Set();
  while (mines.size < Math.min(mineCount, total - 1)) {
    mines.add(Math.floor(random() * total));
  }
  return {
    grid,
    mineCount,
    mines: [...mines],
    revealed: [],
    busted: false,
    cashed: false,
  };
}

export function minesMultiplier(revealedCount, mineCount, grid = MINES_GRID, edge = MINES_HOUSE_EDGE) {
  const total = grid * grid;
  let mult = 1;
  for (let i = 0; i < revealedCount; i += 1) {
    const remaining = total - i;
    const safeLeft = total - mineCount - i;
    if (safeLeft <= 0) break;
    mult *= remaining / safeLeft;
  }
  return Number(Math.max(1, mult * (1 - edge)).toFixed(2));
}

export function nextMinesMultiplier(revealedCount, mineCount, grid = MINES_GRID) {
  return minesMultiplier(revealedCount + 1, mineCount, grid);
}

export function revealMineCell(board, index) {
  if (board.busted || board.cashed) return { ok: false, reason: 'Раунд уже завершён' };
  if (board.revealed.includes(index)) return { ok: false, reason: 'Клетка уже открыта' };
  if (board.mines.includes(index)) {
    board.busted = true;
    board.revealed = [...board.revealed, index];
    return { ok: true, hit: true, multiplier: 0 };
  }
  board.revealed = [...board.revealed, index];
  const multiplier = minesMultiplier(board.revealed.length, board.mineCount, board.grid);
  return { ok: true, hit: false, multiplier };
}

export function cashOutMines(board) {
  if (board.busted || board.cashed) return { ok: false, reason: 'Нельзя забрать' };
  if (!board.revealed.length) return { ok: false, reason: 'Откройте хотя бы одну клетку' };
  board.cashed = true;
  const multiplier = minesMultiplier(board.revealed.length, board.mineCount, board.grid);
  return { ok: true, multiplier };
}

export const MIN_BET = 10;
export const MAX_BET = 50000;
