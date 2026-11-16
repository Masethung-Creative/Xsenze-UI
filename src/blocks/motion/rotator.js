// Rotator: a word that rolls through a list. Pauses while the pointer is on it, while it is off screen,
// while the tab is hidden and whenever motion is off. Screen readers get the whole list once, as text.
import { $$, ready, fire, motionOn, onMotion, watch, perFrame, srText, caret } from '../shared.js';

const listFormat = (words) => {
  try {
    return new Intl.ListFormat(document.documentElement.lang || 'en', { type: 'disjunction' }).format(words);
  } catch {
    return words.join(', ');
  }
};

export function initRotators(root) {
  for (const rot of $$('[data-xz-rotator]', root)) {
    if (ready(rot, 'Rotator')) continue;
    const items = $$(':scope > .xz-rotator__item', rot);
    if (items.length < 2) continue;
    const words = items.map((el) => el.textContent.trim());
    const win = document.createElement('span');
    win.className = 'xz-rotator__window';
    win.setAttribute('aria-hidden', 'true');
    const track = document.createElement('span');
    track.className = 'xz-rotator__track';
    // Rolling on to a copy of the first word means the last word never has to scroll back past the others.
    const loop = items[0].cloneNode(true);
    track.append(...items, loop);
    win.append(track);
    rot.prepend(srText(listFormat(words)), win);
    if (rot.hasAttribute('data-caret') && !rot.querySelector('.xz-caret')) rot.append(caret());
    rot.classList.add('is-ready');

    const all = [...items, loop];
    const interval = Math.max(1200, parseInt(rot.getAttribute('data-interval'), 10) || 2600);
    let index = 0;
    let timer = 0;
    let visible = true;
    let hover = false;
    let paused = false;

    const place = (instant) => {
      const el = all[index];
      if (instant) rot.classList.add('is-jumping');
      all.forEach((item, i) => item.classList.toggle('is-current', i === index || (index === words.length && i === 0)));
      win.style.width = el.offsetWidth ? `${el.offsetWidth}px` : '';
      track.style.transform = `translateY(${-el.offsetTop}px)`;
      if (instant) {
        void track.offsetWidth;
        rot.classList.remove('is-jumping');
      }
    };
    // After landing on the copy, swap to the real first word without moving.
    const settle = () => {
      if (index !== words.length) return;
      index = 0;
      place(true);
    };
    track.addEventListener('transitionend', (e) => e.target === track && e.propertyName === 'transform' && settle());

    const show = (i) => {
      settle();
      index = Math.min(i, words.length);
      place(false);
      const n = index % words.length;
      fire(rot, 'xz:rotate', { index: n, word: words[n] });
    };
    const next = () => {
      settle();
      show(index + 1);
    };
    const stop = () => {
      clearInterval(timer);
      timer = 0;
    };
    const start = () => {
      stop();
      if (motionOn() && visible && !hover && !paused && !document.hidden) timer = setInterval(next, interval);
    };

    rot.addEventListener('pointerenter', () => ((hover = true), stop()));
    rot.addEventListener('pointerleave', () => ((hover = false), start()));
    document.addEventListener('visibilitychange', start);
    watch(rot, (v) => {
      visible = v;
      if (v) place(true);
      start();
    });
    onMotion((on) => {
      if (on) return start();
      stop();
      index = 0;
      place(true);
    });
    const refit = perFrame(() => place(true));
    addEventListener('resize', refit);
    document.fonts?.ready.then(refit);
    place(true);

    rot.xzRotator = {
      next,
      go: (i) => show(((i % words.length) + words.length) % words.length),
      pause: () => ((paused = true), stop()),
      play: () => ((paused = false), start()),
    };
  }
}
