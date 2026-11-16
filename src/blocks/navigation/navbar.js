// Overlay navbar: adds .is-scrolled after the first few pixels and, with data-xz-navbar="adapt",
// copies data-theme from the band under its bottom edge.
import { $$, ready, perFrame } from '../shared.js';

export function initNavbars(root) {
  for (const nav of $$('[data-xz-navbar]', root)) {
    if (ready(nav, 'Navbar')) continue;
    const adapt = nav.getAttribute('data-xz-navbar') === 'adapt';
    const update = () => {
      nav.classList.toggle('is-scrolled', scrollY > 8);
      if (!adapt) return;
      const y = nav.getBoundingClientRect().bottom + 1;
      const under = document.elementsFromPoint(innerWidth / 2, Math.min(y, innerHeight - 1)).find((el) => !nav.contains(el));
      const band = under?.closest('[data-theme]:not(html)');
      if (band) nav.setAttribute('data-theme', band.getAttribute('data-theme'));
      else nav.removeAttribute('data-theme');
    };
    const onScroll = perFrame(update);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    document.addEventListener('xz:theme', onScroll);
    update();
  }
}
