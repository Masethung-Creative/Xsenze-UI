// Checks the colour pairs the kit relies on against WCAG 2.2 AA.
// Text pairs need 4.5:1. Control outlines and focus rings need 3:1.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const load = (p) => JSON.parse(fs.readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8'));
const flat = load('../dist/tokens/tokens.json');
const themes = ['light', 'dark'];

const parse = (c) => {
  if (c.startsWith('#')) return [...[1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), 1];
  const m = c.match(/[\d.]+/g).map(Number);
  return [m[0], m[1], m[2], m[3] ?? 1];
};
const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3])).concat(1);
const lum = ([r, g, b]) => {
  const f = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, minimum]. A background may be [soft, base] when the soft colour is translucent.
const text = 4.5, ui = 3;
const pairs = [
  ['text', 'bg', text], ['text', 'surface', text], ['text', 'surface-2', text], ['text', 'surface-3', text],
  ['text-muted', 'bg', text], ['text-muted', 'surface', text], ['text-muted', 'surface-2', text],
  ['text-subtle', 'bg', text], ['text-subtle', 'surface', text], ['text-subtle', 'surface-2', text],
  ['on-accent', 'accent', text], ['on-accent', 'accent-hover', text], ['on-accent', 'accent-active', text],
  ['accent-text', 'bg', text], ['accent-text', 'surface', text], ['accent-text', 'surface-2', text], ['accent-text', ['accent-soft', 'surface'], text],
  ['on-success', 'success', text], ['success-text', 'surface', text], ['success-text', ['success-soft', 'surface'], text],
  ['on-warning', 'warning', text], ['warning-text', 'surface', text], ['warning-text', ['warning-soft', 'surface'], text],
  ['on-danger', 'danger', text], ['danger-text', 'surface', text], ['danger-text', ['danger-soft', 'surface'], text],
  ['on-info', 'info', text], ['info-text', 'surface', text], ['info-text', ['info-soft', 'surface'], text],
  ['on-inverse', 'inverse', text],
  ['on-accent-2', 'accent-2', text], ['accent-2-text', 'surface', text], ['accent-2-text', ['accent-2-soft', 'surface'], text],
  ['border-control', 'bg', ui], ['border-control', 'surface', ui],
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`viz-${n}`, 'surface', ui]),
  ['focus', 'bg', ui], ['focus', 'surface', ui], ['accent-strong', 'surface', ui], ['danger', 'surface', ui],
];

let failed = 0;
for (const theme of themes) {
  const t = flat[theme];
  console.log(`\n${theme}`);
  for (const [fg, bg, min] of pairs) {
    const bgColor = Array.isArray(bg) ? over(parse(t[bg[0]]), parse(t[bg[1]])) : parse(t[bg]);
    const value = ratio(over(parse(t[fg]), bgColor), bgColor);
    const ok = value >= min;
    if (!ok) failed++;
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${value.toFixed(2).padStart(5)} (min ${min})  ${fg} on ${Array.isArray(bg) ? bg.join(' over ') : bg}`);
  }
}
console.log(failed ? `\n${failed} pair(s) below AA` : '\nAll pairs meet WCAG AA');
process.exit(failed ? 1 : 0);
