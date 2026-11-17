// Before and after: two pictures stacked, the second clipped at a line people drag.
// A hidden range input carries the position, so the arrow keys, Home and End work and screen readers hear it.
import { $$, ready, fire, isRtl, clamp } from '../shared.js';

const ARROWS = '<svg class="xz-icon xz-icon--sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>';

export function initBeforeAfter(root) {
  for (const el of $$('[data-xz-beforeafter]', root)) {
    const media = [...el.children].filter((c) => !c.matches('figcaption, .xz-beforeafter__range, .xz-beforeafter__line, .xz-beforeafter__tag')).slice(0, 2);
    if (media.length < 2 || ready(el, 'Beforeafter')) continue;
    const [before, after] = media;
    before.classList.add('xz-beforeafter__before');
    after.classList.add('xz-beforeafter__after');
    const names = [el.dataset.xzBefore || 'Before', el.dataset.xzAfter || 'After'];
    const range = Object.assign(document.createElement('input'), { type: 'range', className: 'xz-beforeafter__range', min: 0, max: 100, step: 1 });
    range.setAttribute('aria-label', el.getAttribute('aria-label') || `${names[0]} and ${names[1]}`);
    const line = Object.assign(document.createElement('span'), { className: 'xz-beforeafter__line' });
    line.innerHTML = `<span class="xz-beforeafter__knob">${ARROWS}</span>`;
    line.setAttribute('aria-hidden', 'true');
    const tags = names.map((n, i) => {
      const t = Object.assign(document.createElement('span'), { className: `xz-beforeafter__tag xz-beforeafter__tag--${i ? 'after' : 'before'}`, textContent: n });
      t.setAttribute('aria-hidden', 'true');
      return t;
    });
    after.after(range, line, ...tags);
    const set = (pct, emit) => {
      const p = Math.round(clamp(pct, 0, 100));
      range.value = String(p);
      el.style.setProperty('--xz-pos', `${p}%`);
      range.setAttribute('aria-valuetext', `${p}% ${names[0].toLowerCase()}, ${100 - p}% ${names[1].toLowerCase()}`);
      if (emit) fire(el, 'xz:compare', { position: p });
    };
    range.addEventListener('input', () => set(Number(range.value), true));
    const at = (e) => {
      const r = el.getBoundingClientRect();
      return ((isRtl(el) ? r.right - e.clientX : e.clientX - r.left) / r.width) * 100;
    };
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('a, button, figcaption')) return;
      e.preventDefault();
      range.focus({ preventScroll: true });
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('is-dragging');
      set(at(e), true);
      const move = (ev) => set(at(ev), true);
      const end = () => {
        el.classList.remove('is-dragging');
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', end);
        el.removeEventListener('pointercancel', end);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    });
    el.xzBeforeafter = { set: (p) => set(p, true), get: () => Number(range.value) };
    set(Number(el.dataset.xzStart ?? 50), false);
  }
}
