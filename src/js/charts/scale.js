// Number helpers for charts: round-number axis steps and the kit's Indian formats.
import * as format from '../format.js';

/** A round step near range / count: 1, 2, 2.5 or 5 times a power of ten. Gives ₹2.5 L, ₹5 L, ₹1 Cr steps. */
export function niceStep(range, count = 5) {
  if (!(range > 0)) return 1;
  const raw = range / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

/** Axis from min to max, widened to round numbers. Returns { lo, hi, ticks }. */
export function scaleOf(min, max, { count = 5, zero = true } = {}) {
  if (zero) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) [min, max] = [0, 1];
  if (min === max) max = min + (min === 0 ? 1 : Math.abs(min) * 0.1);
  const step = niceStep(max - min, count);
  const lo = Math.floor(min / step + 1e-9) * step;
  const hi = Math.ceil(max / step - 1e-9) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : Number(v.toPrecision(12)));
  return { lo, hi, ticks };
}

/** The formatter for a format name: full values for tooltips, short ones for axes. */
export function formatter(name, { axis = false } = {}) {
  switch (name) {
    case 'inr':
      return axis ? (v) => format.inrCompact(v, { digits: 1 }) : (v) => format.inr(v);
    case 'inr-compact':
      return (v) => format.inrCompact(v, { digits: axis ? 1 : 2 });
    case 'percent':
      return (v) => format.percent(v, { digits: axis ? 0 : 1 });
    case 'compact':
      return (v) => format.compact(v, { digits: axis ? 1 : 2 });
    case 'number':
    default:
      return axis ? (v) => (Math.abs(v) >= 1e5 ? format.compact(v, { digits: 1 }) : format.number(v)) : (v) => format.number(v);
  }
}

export const parseValue = (text) => {
  if (text == null || String(text).trim() === '' || /^[–—-]$/.test(String(text).trim())) return null;
  const n = format.parse(text);
  return Number.isNaN(n) ? null : n;
};
