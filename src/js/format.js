// Indian number, currency and date formats.
const LOCALE = 'en-IN';
const toDate = (d) => (d instanceof Date ? d : new Date(d));
const trim = (n, digits) => String(Number(n.toFixed(digits)));

/** 1234567.5 -> "12,34,567.5" (lakh and crore grouping) */
export function number(value, { decimals } = {}) {
  return new Intl.NumberFormat(LOCALE, decimals === undefined ? { maximumFractionDigits: 2 } : { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

/** 1234567 -> "₹12,34,567". Paise are shown only when present, or always with { decimals: 2 }. */
export function inr(value, { decimals } = {}) {
  const hasPaise = Math.round(value * 100) % 100 !== 0;
  const d = decimals ?? (hasPaise ? 2 : 0);
  const sign = value < 0 ? '−' : '';
  return `${sign}₹${number(Math.abs(value), { decimals: d })}`;
}

/** 12500000 -> "1.25 Cr", 250000 -> "2.5 L", 4500 -> "4,500" */
export function compact(value, { digits = 2 } = {}) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}${trim(abs / 1e7, digits)} Cr`;
  if (abs >= 1e5) return `${sign}${trim(abs / 1e5, digits)} L`;
  return `${sign}${number(abs, { decimals: 0 })}`;
}

/** 12500000 -> "₹1.25 Cr" */
export function inrCompact(value, options) {
  const sign = value < 0 ? '−' : '';
  return `${sign}₹${compact(Math.abs(value), options)}`;
}

/** 12500000 -> "crore", 250000 -> "lakh" */
export function unit(value) {
  const abs = Math.abs(value);
  return abs >= 1e7 ? 'crore' : abs >= 1e5 ? 'lakh' : abs >= 1e3 ? 'thousand' : '';
}

/** 0.125 -> "12.5%" */
export function percent(value, { digits = 1 } = {}) {
  return `${trim(value * 100, digits)}%`;
}

/** "2026-11-15" -> "15 Nov 2026" */
export function date(value) {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }).format(toDate(value));
}

/** "2026-11-15" -> "15/11/2026" (day first, always) */
export function dateShort(value) {
  return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(toDate(value));
}

/** "2026-11-15T14:30" -> "15 Nov 2026, 2:30 pm" */
export function dateTime(value) {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(toDate(value));
}

/** "14:30" style time -> "2:30 pm" */
export function time(value) {
  return new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: true }).format(toDate(value));
}

/** Date -> "2 days ago", "in 3 hours" */
export function relative(value, now = new Date()) {
  const diff = (toDate(value) - toDate(now)) / 1000;
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
  for (const [unitName, seconds] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(diff) >= seconds) return rtf.format(Math.round(diff / seconds), unitName);
  }
  return 'just now';
}

/** Indian financial year, April to March: 15 Nov 2026 -> "FY 2026-27" */
export function financialYear(value = new Date()) {
  const d = toDate(value);
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `FY ${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/**
 * Reads a number back from text the kit or a person wrote:
 * "₹1,24,999" -> 124999, "−₹4,500" -> -4500, "₹1.25 Cr" -> 12500000, "2.5 L" -> 250000, "12.5%" -> 0.125.
 * Returns NaN when there is no number.
 */
export function parse(value) {
  if (typeof value === 'number') return value;
  const s = String(value ?? '').trim();
  const m = s.replace(/,/g, '').match(/([−-]?)\s*[₹$]?\s*(\d+(?:\.\d+)?|\.\d+)\s*(cr|crore|l|lakh|lac|k|%)?/i);
  if (!m) return NaN;
  const scale = { cr: 1e7, crore: 1e7, l: 1e5, lakh: 1e5, lac: 1e5, k: 1e3, '%': 0.01 }[(m[3] || '').toLowerCase()] || 1;
  const sign = m[1] || /^[−-]/.test(s) ? -1 : 1;
  return sign * Number(m[2]) * scale;
}

/** "9876543210" -> "+91 98765 43210" */
export function phone(value) {
  const digits = String(value).replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : String(value);
}
