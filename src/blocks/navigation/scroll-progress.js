// Scroll progress: sets --xz-progress (0 to 1) on .xz-scroll-progress bars. Decorative, so hidden from screen readers.
import { $$, ready, perFrame } from '../shared.js';

const bars = new Set();
const update = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  bars.forEach((bar) => bar.style.setProperty('--xz-progress', p.toFixed(4)));
};
let bound = false;

export function initScrollProgress(root) {
  for (const bar of $$('[data-xz-scroll-progress]', root)) {
    if (ready(bar, 'Progress')) continue;
    bar.classList.add('xz-scroll-progress');
    bar.setAttribute('aria-hidden', 'true');
    bars.add(bar);
  }
  if (bars.size && !bound) {
    bound = true;
    const onScroll = perFrame(update);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
  }
  update();
}
