// Depth: tips list items back near the edges of the screen as the page scrolls.
// Items are the [data-xz-depth-item] elements inside, or else the direct children.
// Native scrolling is never taken over; positions are measured once and on resize, not every frame.
import { $$, ready, clamp, motionOn, onMotion, perFrame } from '../shared.js';

export function initDepth(root) {
  for (const box of $$('[data-xz-depth]', root)) {
    if (ready(box, 'Depth')) continue;
    const media = matchMedia('(min-width: 1024px) and (pointer: fine)');
    const strength = clamp(parseFloat(box.getAttribute('data-xz-depth')) || 1, 0.2, 2);
    const items = () => {
      const marked = $$('[data-xz-depth-item]', box);
      return marked.length ? marked : Array.from(box.children);
    };
    let list = [];
    let active = false;

    const clear = () =>
      items().forEach((el) => {
        el.style.transform = '';
        el.style.opacity = '';
      });
    const measure = () => {
      clear();
      list = items().map((el) => {
        const r = el.getBoundingClientRect();
        return { el, mid: r.top + scrollY + r.height / 2 };
      });
    };
    const update = () => {
      if (!active) return;
      const half = innerHeight / 2;
      for (const item of list) {
        const d = (item.mid - scrollY - half) / half;
        if (Math.abs(d) > 1.4) continue;
        const bend = clamp((Math.abs(d) - 0.55) / 0.45) * strength;
        item.el.style.transform = bend ? `perspective(900px) rotateX(${(-Math.sign(d) * bend * 36).toFixed(2)}deg) translateZ(${(-bend * bend * 80).toFixed(1)}px)` : '';
        item.el.style.opacity = bend ? String(1 - Math.min(bend, 1) * 0.6) : '';
      }
    };
    const sync = () => {
      active = media.matches && motionOn();
      box.classList.toggle('is-depth', active);
      if (!active) return clear();
      measure();
      update();
    };
    const onScroll = perFrame(update);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', perFrame(sync));
    media.addEventListener('change', sync);
    onMotion(sync);
    document.fonts?.ready.then(sync);
    addEventListener('load', sync, { once: true });
    // Content that loads later moves the list down the page; measure again when the page grows.
    if (typeof ResizeObserver === 'function') new ResizeObserver(perFrame(sync)).observe(document.body);
    sync();
  }
}
