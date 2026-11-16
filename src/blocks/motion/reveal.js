// Reveal on scroll. Elements already on screen when the page opens should use data-xz-reveal="load",
// which is pure CSS. Everything else waits off screen and rises in as it arrives.
import { $$, ready, fire, motionOn, onMotion } from '../shared.js';

let io = null;
const waiting = new Set();

function show(el) {
  waiting.delete(el);
  io?.unobserve(el);
  el.classList.remove('is-pending');
  if (!motionOn()) return fire(el, 'xz:reveal');
  el.classList.add('is-revealing');
  el.addEventListener(
    'animationend',
    () => {
      el.classList.remove('is-revealing');
      fire(el, 'xz:reveal');
    },
    { once: true },
  );
}

export function initReveal(root) {
  // Number the children of each stagger group, unless the markup already did.
  for (const group of $$('[data-xz-stagger]', root)) {
    const step = group.getAttribute('data-xz-stagger');
    $$('[data-xz-reveal]', group)
      .filter((el) => el.closest('[data-xz-stagger]') === group)
      .forEach((el, i) => {
        if (!el.style.getPropertyValue('--xz-i')) el.style.setProperty('--xz-i', String(i));
        if (step) el.style.setProperty('--xz-stagger', `${parseInt(step, 10) || 80}ms`);
      });
  }
  const items = $$('[data-xz-reveal]', root).filter((el) => el.getAttribute('data-xz-reveal') !== 'load' && !ready(el, 'Reveal'));
  if (!items.length || !motionOn() || typeof IntersectionObserver !== 'function') return;
  io ||= new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && show(e.target)),
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );
  for (const el of items) {
    el.classList.add('is-pending');
    waiting.add(el);
    io.observe(el);
  }
}

// When motion is switched off, show everything that is still waiting.
onMotion((on) => {
  if (!on) [...waiting].forEach(show);
});
