// Dot field: follows the pointer over its section with a soft light. Mouse and pen only.
import { $$, ready, motionOn, finePointer } from '../shared.js';

export function initDotfields(root) {
  for (const field of $$('.xz-dotfield', root)) {
    if (ready(field, 'Dots')) continue;
    field.setAttribute('aria-hidden', 'true');
    const host = field.parentElement;
    if (!host) continue;
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      field.style.setProperty('--xz-x', `${x}px`);
      field.style.setProperty('--xz-y', `${y}px`);
    };
    host.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || !finePointer() || !motionOn()) return;
      const r = field.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      field.classList.add('is-lit');
      if (!frame) frame = requestAnimationFrame(paint);
    });
    host.addEventListener('pointerleave', () => field.classList.remove('is-lit'));
  }
}
