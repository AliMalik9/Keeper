// Shared time helpers. Times are stored as "HH:MM" strings and reasoned about
// as floats in [0, 24) so that blocks can wrap past midnight.

export const SNAP = 0.25; // 15 minutes

export function timeToFloat(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':');
  return Number(h) + Number(m) / 60;
}

export function floatToTime(f) {
  f = ((f % 24) + 24) % 24;
  let h = Math.floor(f);
  let m = Math.round((f - h) * 60);
  if (m === 60) {
    m = 0;
    h = (h + 1) % 24;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function fmt12(f) {
  f = ((f % 24) + 24) % 24;
  let h = Math.floor(f);
  let m = Math.round((f - h) * 60);
  if (m === 60) {
    m = 0;
    h = (h + 1) % 24;
  }
  const ap = h >= 12 ? 'PM' : 'AM';
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}

export const fmtTime12 = (t) => fmt12(timeToFloat(t));

export function durationOf(block) {
  let d = timeToFloat(block.end) - timeToFloat(block.start);
  if (d <= 0) d += 24;
  return d;
}

export function fmtDur(d) {
  const h = Math.floor(d + 1e-9);
  const m = Math.round((d - h) * 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function circDist(a, b) {
  const d = Math.abs(a - b) % 24;
  return Math.min(d, 24 - d);
}

export function inSpan(h, s, d) {
  let x = h - s;
  x = ((x % 24) + 24) % 24;
  return x < d;
}

export function snap(h) {
  return (((Math.round(h / SNAP) * SNAP) % 24) + 24) % 24;
}

export function nowFloat() {
  const n = new Date();
  return n.getHours() + n.getMinutes() / 60 + n.getSeconds() / 3600;
}
