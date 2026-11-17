// Shared by search suggestions and the command palette: matching and ranking typed text,
// highlighting the matched parts, recent items and fetching results from a server.
import { esc, store } from './shared.js';

/** Lower case, without accents, so "Résumé" matches "resume". */
export const normalize = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** The typed text as separate words. Every word has to match. */
export const termsOf = (query) => normalize(query).split(/\s+/).filter(Boolean);

const splitWords = (s) => s.split(/[\s\-_/.,:;()[\]|]+/).filter(Boolean);

/**
 * How well an item matches the words. 0 means it does not match.
 * Each word scores: whole label 100, start of the label 80, start of a word 60, initials 50,
 * anywhere in the label 30, start of a keyword 25, anywhere in the keywords, meta or group 10.
 */
export function rank(item, terms) {
  if (!terms.length) return 1;
  const label = normalize(item.label);
  const words = splitWords(label);
  const initials = words.map((w) => w[0]).join('');
  const extra = normalize([item.keywords, item.meta, item.group].filter(Boolean).join(' '));
  const extraWords = splitWords(extra);
  let score = 0;
  let last = -1;
  let inOrder = true;
  for (const t of terms) {
    let s;
    if (label === t) s = 100;
    else if (label.startsWith(t)) s = 80;
    else if (words.some((w) => w.startsWith(t))) s = 60;
    else if (t.length > 1 && initials.startsWith(t)) s = 50;
    else if (label.includes(t)) s = 30;
    else if (extraWords.some((w) => w.startsWith(t))) s = 25;
    else if (extra.includes(t)) s = 10;
    else return 0;
    const at = label.indexOf(t);
    if (at >= 0) {
      if (at < last) inOrder = false;
      last = at;
    }
    score += s;
  }
  if (terms.length > 1) {
    if (inOrder) score += 10;
    if (label === terms.join(' ')) score += 50;
  }
  return score;
}

/**
 * Items that match, best first. Ties keep the shorter label, then the original order.
 * `boost(item)` adds to the score, for example for recent items.
 */
export function ranked(items, terms, { boost } = {}) {
  const out = [];
  items.forEach((item, i) => {
    const base = rank(item, terms);
    if (base > 0) out.push({ item, i, score: base + (boost ? boost(item) : 0) });
  });
  return out.sort((a, b) => b.score - a.score || a.item.label.length - b.item.label.length || a.i - b.i).map((r) => r.item);
}

/** The label as HTML, with the parts that match the words wrapped in <mark>. */
export function highlight(label, terms) {
  const text = String(label);
  const lower = text.toLowerCase();
  const ranges = [];
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0) ranges.push([i, i + t.length]);
  }
  if (!ranges.length) return esc(text);
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0]];
  for (const r of ranges.slice(1)) {
    const prev = merged[merged.length - 1];
    if (r[0] <= prev[1]) prev[1] = Math.max(prev[1], r[1]);
    else merged.push(r);
  }
  let html = '';
  let at = 0;
  for (const [s, e] of merged) {
    html += esc(text.slice(at, s)) + '<mark>' + esc(text.slice(s, e)) + '</mark>';
    at = e;
  }
  return html + esc(text.slice(at));
}

/** Recent items saved on this device under `key`, newest first. `same(a, b)` decides what counts as a repeat. */
export function recentList(key, { max = 5, same = (a, b) => a === b } = {}) {
  return {
    get: () => (key ? store.get(key, []) : []).slice(0, max),
    add(value) {
      if (!key || !value) return;
      const list = [value, ...store.get(key, []).filter((v) => !same(v, value))].slice(0, max);
      store.set(key, list);
    },
    clear: () => key && store.remove(key),
  };
}

/** Fetch results from a URL with {q} in it (or the text added to the end). Expects JSON: [{ label, group, href, meta }]. */
export async function fetchItems(url, q, signal) {
  const res = await fetch(url.includes('{q}') ? url.replace('{q}', encodeURIComponent(q)) : url + encodeURIComponent(q), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((d) => ({ label: String(d.label ?? ''), group: d.group || '', href: d.href || '', meta: d.meta || '', icon: d.icon || '', keywords: d.keywords || '' }));
}

/** Keep the active option in view inside a scrolling list. */
export function keepInView(list, el) {
  if (!el) return;
  const top = el.offsetTop;
  if (top < list.scrollTop) list.scrollTop = top;
  else if (top + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + el.offsetHeight - list.clientHeight;
}
