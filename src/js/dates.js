// Date helpers shared by the date picker and the calendar. Dates are local days; ISO strings are yyyy-mm-dd.
export const pad = (n) => String(n).padStart(2, '0');
export const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromIso = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
export const showDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
/** "5/3/26", "05-03-2026" and "5.3.2026" all mean 5 March 2026. Day comes first. */
export function parseDate(text) {
  const m = /^\s*(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{2}|\d{4})\s*$/.exec(text);
  if (!m) return null;
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(year, Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d : null;
}
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The days to show for a month: whole weeks from the week start, 4 to 6 rows. */
export function monthDays(year, month, weekStart = 1) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const start = addDays(first, -lead);
  const last = new Date(year, month + 1, 0);
  const total = Math.ceil((lead + last.getDate()) / 7) * 7;
  return Array.from({ length: total }, (_, i) => addDays(start, i));
}
