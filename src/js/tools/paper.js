// Paper: radio buttons for a paper size and an orientation reshape a measure box and fill in the sizes.
// Known sizes: A3, A4, A5, Letter, Legal and ID card. Any other radio can say data-mm="85.6x54".
import { $, $$, ready, fire } from '../shared.js';

const SIZES = { A3: [297, 420], A4: [210, 297], A5: [148, 210], LETTER: [215.9, 279.4], LEGAL: [215.9, 355.6], ID: [54, 85.6] };
const mmOf = (input) => {
  const own = /^([\d.]+)\s*[x×]\s*([\d.]+)$/i.exec(input.dataset.mm || '');
  if (own) return [Number(own[1]), Number(own[2])];
  return SIZES[String(input.value).toUpperCase().replace(/[\s-]+CARD$/, '')] || null;
};
const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('en-IN');
const px = (mm) => Math.round((mm / 25.4) * 96);

export function initPapers(root) {
  for (const el of $$('[data-xz-paper]', root)) {
    if (ready(el, 'Paper')) continue;
    const radios = $$('input[type="radio"]', el);
    const sizes = radios.filter((r) => mmOf(r));
    const turns = radios.filter((r) => /^(portrait|landscape)$/i.test(r.value));
    const measure = $('.xz-measure', el);
    const out = (name) => $$(`[data-xz-paper-out="${name}"]`, el);
    const update = (emit) => {
      const size = sizes.find((r) => r.checked) || sizes[0];
      if (!size) return;
      let [w, h] = mmOf(size);
      const landscape = (turns.find((r) => r.checked)?.value || '').toLowerCase() === 'landscape';
      if (landscape !== w > h) [w, h] = [h, w];
      el.dataset.orientation = landscape ? 'landscape' : 'portrait';
      if (measure) {
        measure.style.setProperty('--xz-ratio', `${w} / ${h}`);
        const x = $('.xz-measure__x', measure);
        const y = $('.xz-measure__y', measure);
        if (x) x.textContent = `${fmt(w)} mm`;
        if (y) {
          const span = $('span', y) || y.appendChild(document.createElement('span'));
          span.textContent = `${fmt(h)} mm`;
        }
      }
      out('width').forEach((o) => (o.textContent = `${fmt(w)} mm`));
      out('height').forEach((o) => (o.textContent = `${fmt(h)} mm`));
      out('pixels').forEach((o) => (o.textContent = `${px(w)} × ${px(h)} px`));
      out('name').forEach((o) => (o.textContent = size.dataset.name || size.value));
      if (emit) fire(el, 'xz:paper', { size: size.value, orientation: el.dataset.orientation, mm: [w, h], px: [px(w), px(h)] });
    };
    el.addEventListener('change', (e) => e.target.matches?.('input[type="radio"]') && update(true));
    update(false);
  }
}
