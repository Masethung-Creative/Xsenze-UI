// Curtain: drives --xz-curtain from the band's position on screen. Off when motion is off.
import { $$, ready, clamp, motionOn, onMotion, perFrame } from '../shared.js';

export function initCurtains(root) {
  for (const band of $$('[data-xz-curtain]', root)) {
    if (ready(band, 'Curtain')) continue;
    const update = () => {
      if (!motionOn()) return band.style.setProperty('--xz-curtain', '1');
      const top = band.getBoundingClientRect().top;
      // 0 when the band's top edge enters at the bottom of the screen, 1 when it reaches 40% from the top.
      const t = clamp((innerHeight - top) / (innerHeight * 0.6));
      band.style.setProperty('--xz-curtain', (1 - (1 - t) * (1 - t)).toFixed(3));
    };
    const onScroll = perFrame(update);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    onMotion(update);
    update();
  }
}
