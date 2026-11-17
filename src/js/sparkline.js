// Sparkline: a small trend line inside a sentence, a table cell or a stat card.
// <span class="xz-sparkline" data-xz-sparkline="12 18 9 24 31" aria-label="Enrolments, rising over 5 months"></span>
// Add data-xz-sparkline-area for a soft fill under the line.
import { $$ } from './shared.js';

export function initSparklines(root) {
  for (const el of $$('[data-xz-sparkline]', root)) {
    const values = el.getAttribute('data-xz-sparkline').split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isFinite);
    if (values.length < 2) continue;
    const w = 100;
    const h = 30;
    const min = Math.min(...values);
    const span = Math.max(...values) - min || 1;
    const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 4)]);
    const d = 'M' + pts.map((p) => p.map((n) => Math.round(n * 10) / 10).join(' ')).join('L');
    const area = el.hasAttribute('data-xz-sparkline-area') ? `<path class="xz-sparkline__area" d="${d}L${w} ${h}L0 ${h}Z"/>` : '';
    const [, lastY] = pts[pts.length - 1];
    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${area}<path class="xz-sparkline__line" d="${d}" vector-effect="non-scaling-stroke"/></svg><i class="xz-sparkline__dot" style="top:${Math.round((lastY / h) * 1000) / 10}%"></i>`;
    if (!el.hasAttribute('role')) el.setAttribute('role', 'img');
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', `Trend: ${values.join(', ')}`);
  }
}
