import { durationOf, timeToFloat } from './time';

// Board priorities. KEEP is monochrome, so the ramp carries the meaning and
// red-400 (the app's only chromatic accent) is reserved for P0.
export const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];

export const PRIORITY_META = {
  P0: { name: 'P0 Critical', short: 'Critical', color: '#f87171', dot: 'bg-red-400' },
  P1: { name: 'P1 High', short: 'High', color: '#e5e5e5', dot: 'bg-neutral-200' },
  P2: { name: 'P2 Normal', short: 'Normal', color: '#8f8f8f', dot: 'bg-neutral-500' },
  P3: { name: 'P3 Low', short: 'Low', color: '#4a4a4a', dot: 'bg-neutral-700' },
};

// Planner colour presets — the KEEP grey ramp plus the one red accent.
export const SHADE_PRESETS = ['#f5f5f5', '#a3a3a3', '#616161', '#333333', '#f87171'];

/**
 * The clock renders one flat list of blocks that comes from two sources:
 *  - `activities` — free blocks created on the planner itself (key "a:<id>")
 *  - `tasks`      — board cards that carry a start and end time (key "t:<id>")
 *
 * Board cards are never copied into `activities`; they are derived on every
 * render, so a card's schedule has exactly one owner and the two views can
 * never drift apart.
 */
export function buildBlocks(activities = [], tasks = []) {
  const manual = activities.map((a) => ({
    ...a,
    key: `a:${a.id}`,
    source: 'planner',
  }));

  const scheduled = tasks
    .filter((t) => t.start && t.end && t.start !== t.end)
    .map((t) => ({
      id: t.id,
      key: `t:${t.id}`,
      source: 'board',
      taskId: t.id,
      label: t.title || 'Untitled task',
      start: t.start,
      end: t.end,
      priority: t.priority,
      color: PRIORITY_META[t.priority]?.color || '#8f8f8f',
    }));

  return [...manual, ...scheduled];
}

export function parseKey(key) {
  const [kind, ...rest] = String(key).split(':');
  return { kind, id: rest.join(':') };
}

/** Indices of blocks that overlap another block on the 24h face. */
export function computeConflicts(blocks) {
  const segs = [];
  blocks.forEach((b, i) => {
    const s = timeToFloat(b.start);
    const d = durationOf(b);
    if (s + d <= 24) segs.push([s, s + d, i]);
    else {
      segs.push([s, 24, i]);
      segs.push([0, s + d - 24, i]);
    }
  });
  segs.sort((x, y) => x[0] - y[0]);

  const bad = new Set();
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      if (segs[j][0] < segs[i][1] - 1e-9 && segs[i][2] !== segs[j][2]) {
        bad.add(segs[i][2]);
        bad.add(segs[j][2]);
      }
    }
  }
  return bad;
}

/** Unclaimed stretches of the day, used to place a new block sensibly. */
export function computeFreeGaps(blocks) {
  const segs = [];
  blocks.forEach((b) => {
    const s = timeToFloat(b.start);
    const d = durationOf(b);
    if (s + d <= 24) segs.push([s, s + d]);
    else {
      segs.push([s, 24]);
      segs.push([0, s + d - 24]);
    }
  });
  segs.sort((x, y) => x[0] - y[0]);
  if (!segs.length) return [[0, 24]];

  const merged = [];
  segs.forEach(([s, e]) => {
    const last = merged[merged.length - 1];
    if (last && s <= last[1] + 1e-9) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  });

  const gaps = [];
  let cursor = 0;
  merged.forEach(([s, e]) => {
    if (s - cursor > 1e-6) gaps.push([cursor, s]);
    cursor = Math.max(cursor, e);
  });
  if (24 - cursor > 1e-6) gaps.push([cursor, 24]);

  if (gaps.length > 1 && gaps[0][0] === 0 && gaps[gaps.length - 1][1] === 24) {
    const first = gaps.shift();
    const last = gaps.pop();
    gaps.push([last[0], 24 + first[1]]);
  }
  return gaps;
}
