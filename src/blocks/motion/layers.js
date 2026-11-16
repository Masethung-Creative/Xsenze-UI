// Layers: builds the plates and leans the stack towards the pointer (mouse and pen only).
// data-xz-layers="5" sets the number of plates. The nearest [data-xz-tilt-area], or the section, tracks the pointer.
import { $$, ready, clamp, motionOn, finePointer } from '../shared.js';

export function initLayers(root) {
  for (const box of $$('[data-xz-layers]', root)) {
    if (ready(box, 'Layers')) continue;
    const count = clamp(parseInt(box.getAttribute('data-xz-layers'), 10) || 5, 2, 12);
    const face = box.querySelector('.xz-layers__face');
    const stack = document.createElement('div');
    stack.className = 'xz-layers__stack';
    for (let i = 0; i < count; i++) {
      const plate = document.createElement('span');
      plate.className = 'xz-layers__plate';
      plate.style.setProperty('--i', String(i));
      stack.append(plate);
    }
    if (face) stack.lastElementChild.append(face);
    box.append(stack);
    box.style.setProperty('--xz-layers-count', String(count));
    if (box.hasAttribute('aria-label')) box.setAttribute('role', 'img');
    else box.setAttribute('aria-hidden', 'true');

    const area = box.closest('[data-xz-tilt-area]') || box.closest('section') || box;
    let frame = 0;
    let tx = 0;
    let ty = 0;
    const paint = () => {
      frame = 0;
      stack.style.setProperty('--xz-tilt-x', `${tx}deg`);
      stack.style.setProperty('--xz-tilt-y', `${ty}deg`);
    };
    area.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || !finePointer() || !motionOn()) return;
      const r = box.getBoundingClientRect();
      tx = clamp(((e.clientY - (r.top + r.height / 2)) / innerHeight) * 2, -1, 1) * -8;
      ty = clamp(((e.clientX - (r.left + r.width / 2)) / innerWidth) * 2, -1, 1) * 10;
      if (!frame) frame = requestAnimationFrame(paint);
    });
    area.addEventListener('pointerleave', () => {
      tx = 0;
      ty = 0;
      if (!frame) frame = requestAnimationFrame(paint);
    });
  }
}
