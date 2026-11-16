// Marquee: repeats the items once so the row can loop, sets the speed from data-speed (pixels per second,
// default 40) and pauses while off screen. The repeated items are hidden from screen readers and the tab order.
import { $$, ready, watch, perFrame } from '../shared.js';

export function initMarquees(root) {
  for (const box of $$('.xz-marquee', root)) {
    if (ready(box, 'Marquee')) continue;
    const track = box.querySelector('.xz-marquee__track');
    if (!track || !track.children.length) continue;
    for (const item of Array.from(track.children)) {
      const copy = item.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.setAttribute('data-xz-clone', '');
      for (const el of copy.querySelectorAll('a, button, input, select, textarea, [tabindex]')) el.tabIndex = -1;
      track.append(copy);
    }
    const speed = Math.max(5, parseFloat(box.getAttribute('data-speed')) || 40);
    const size = () => box.style.setProperty('--xz-marquee-duration', `${(track.scrollWidth / 2 / speed).toFixed(1)}s`);
    size();
    addEventListener('resize', perFrame(size));
    document.fonts?.ready.then(size);
    box.classList.add('is-ready');
    let held = false;
    let visible = true;
    const sync = () => box.classList.toggle('is-paused', held || !visible);
    watch(box, (v) => ((visible = v), sync()));
    box.xzMarquee = { pause: () => ((held = true), sync()), play: () => ((held = false), sync()) };
  }
}
