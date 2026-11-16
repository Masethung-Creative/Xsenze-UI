// Typewriter: text that types itself out once, when it scrolls into view (or as the page loads with
// data-xz-typewriter="load"). The full text is in the markup, so it is there without the script, for
// search engines, and for screen readers, which read a hidden copy instead of the half-typed one.
import { $$, ready, fire, motionOn, onMotion, watch, srText, caret } from '../shared.js';

function textNodes(el) {
  const out = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) out.push(walker.currentNode);
  return out;
}

export function initTypewriters(root) {
  for (const el of $$('[data-xz-typewriter]', root)) {
    if (ready(el, 'Type') || !motionOn()) continue;
    const speed = Math.max(10, parseInt(el.getAttribute('data-speed'), 10) || 40);
    const keepCaret = el.getAttribute('data-caret') === 'keep';
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    visual.append(...el.childNodes);
    el.append(srText(visual.textContent.replace(/\s+/g, ' ').trim()), visual);
    const nodes = textNodes(visual);
    const texts = nodes.map((n) => n.data);
    nodes.forEach((n) => (n.data = ''));
    const cursor = caret();
    visual.append(cursor);

    let timer = 0;
    let started = false;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      started = true;
      clearTimeout(timer);
      nodes.forEach((n, i) => (n.data = texts[i]));
      if (!keepCaret) cursor.remove();
      el.classList.add('is-typed');
      fire(el, 'xz:typed');
    };
    const play = () => {
      if (started) return;
      started = true;
      if (!motionOn()) return finish();
      let n = 0;
      let c = 0;
      const tick = () => {
        while (n < nodes.length && c >= texts[n].length) {
          n += 1;
          c = 0;
        }
        if (n >= nodes.length) return finish();
        c += 1;
        nodes[n].data = texts[n].slice(0, c);
        timer = setTimeout(tick, speed);
      };
      timer = setTimeout(tick, 200);
    };
    if (el.getAttribute('data-xz-typewriter') === 'load') play();
    else {
      let io = null;
      io = watch(el, (v) => v && (io?.disconnect(), play()), { threshold: 0.5 });
    }
    onMotion((on) => !on && finish());
    el.xzTypewriter = { play, finish };
  }
}
