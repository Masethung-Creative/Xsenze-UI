// Readout: digits drawn as seven lit segments, for timers and counters. The text stays for screen readers.
// Timer: a readout with start, pause and reset, counting down from data-xz-timer seconds, or up from 0.
import { $, $$, ready, fire } from '../shared.js';

// Segments a to g in a 12 by 20 box: top, upper right, lower right, bottom, lower left, upper left, middle.
const h = (y, x1 = 1.3, x2 = 10.7) => `M${x1} ${y}L${x1 + 1} ${y - 1}H${x2 - 1}L${x2} ${y}L${x2 - 1} ${y + 1}H${x1 + 1}Z`;
const v = (x, y1, y2) => `M${x} ${y1}L${x + 1} ${y1 + 1}V${y2 - 1}L${x} ${y2}L${x - 1} ${y2 - 1}V${y1 + 1}Z`;
const SEGS = [h(1), v(11, 1.3, 9.7), v(11, 10.3, 18.7), h(19), v(1, 10.3, 18.7), v(1, 1.3, 9.7), h(10)];
const MASKS = { 0: 0b1111110, 1: 0b0110000, 2: 0b1101101, 3: 0b1111001, 4: 0b0110011, 5: 0b1011011, 6: 0b1011111, 7: 0b1110000, 8: 0b1111111, 9: 0b1111011, '-': 0b0000001, ' ': 0 };
const NS = 'http://www.w3.org/2000/svg';

function charSvg(ch) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'xz-readout__char');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (ch === ':' || ch === '.') {
    svg.setAttribute('viewBox', '0 0 4 20');
    svg.classList.add('xz-readout__char--narrow');
    for (const y of ch === ':' ? [5, 13] : [17.6]) {
      const r = document.createElementNS(NS, 'rect');
      Object.entries({ x: 1, y, width: 2, height: 2, class: 'xz-readout__seg is-on' }).forEach(([k, val]) => r.setAttribute(k, val));
      svg.append(r);
    }
    return svg;
  }
  svg.setAttribute('viewBox', '0 0 12 20');
  for (const d of SEGS) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', 'xz-readout__seg');
    svg.append(p);
  }
  svg.xzChar = '';
  return svg;
}

function paint(svg, ch) {
  if (svg.xzChar === ch) return;
  svg.xzChar = ch;
  const mask = MASKS[ch] ?? 0;
  [...svg.children].forEach((p, i) => p.classList.toggle('is-on', Boolean(mask & (1 << (6 - i)))));
}

export function initReadouts(root) {
  for (const el of $$('[data-xz-readout]', root)) {
    if (ready(el, 'Readout')) continue;
    const text = Object.assign(document.createElement('span'), { className: 'xz-sr-only' });
    const digits = Object.assign(document.createElement('span'), { className: 'xz-readout__digits' });
    digits.setAttribute('aria-hidden', 'true');
    let chars = [];
    const set = (value) => {
      const s = String(value);
      text.textContent = s;
      const shape = s.replace(/[0-9 -]/g, '8');
      if (shape !== chars.map((c) => c.xzShape).join('')) {
        digits.textContent = '';
        chars = [...s].map((c) => {
          const svg = charSvg(/[:.]/.test(c) ? c : '8');
          svg.xzShape = /[:.]/.test(c) ? c : '8';
          digits.append(svg);
          return svg;
        });
      }
      [...s].forEach((c, i) => !/[:.]/.test(c) && paint(chars[i], c));
    };
    const start = el.textContent.trim();
    el.textContent = '';
    el.append(text, digits);
    set(start);
    el.xzReadout = { set, get: () => text.textContent };
  }
}

const two = (n) => String(Math.floor(n)).padStart(2, '0');
function clock(ms, tenths) {
  const total = Math.max(0, ms) / 1000;
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);
  let s = hours ? `${hours}:${two(mins)}:${two(secs)}` : `${two(mins)}:${two(secs)}`;
  if (tenths) s += `.${two(Math.floor((total * 100) % 100))}`;
  return s;
}
const words = (secs) => (secs >= 60 ? `${Math.round(secs / 60)} minute${Math.round(secs / 60) === 1 ? '' : 's'}` : `${secs} second${secs === 1 ? '' : 's'}`);

export function initTimers(root) {
  for (const el of $$('[data-xz-timer]', root)) {
    if (ready(el, 'Timer')) continue;
    const display = $('.xz-readout', el);
    const toggleBtn = $('[data-xz-timer-start]', el);
    const resetBtn = $('[data-xz-timer-reset]', el);
    const duration = Number(el.getAttribute('data-xz-timer')) * 1000 || 0;
    const down = duration > 0;
    const tenths = el.hasAttribute('data-xz-tenths');
    const warnAt = Number(el.dataset.xzWarn || 0) * 1000;
    const labels = (el.dataset.xzLabels || 'Start|Pause|Resume').split('|');
    const status = Object.assign(document.createElement('span'), { className: 'xz-sr-only' });
    status.setAttribute('role', 'status');
    el.append(status);
    let elapsed = 0;
    let since = 0;
    let timer = 0;
    let warned = false;
    const now = () => elapsed + (since ? performance.now() - since : 0);
    const show = () => {
      const ms = down ? duration - now() : now();
      const text = clock(down ? Math.ceil(ms / (tenths ? 10 : 1000)) * (tenths ? 10 : 1000) : ms, tenths);
      if (display?.xzReadout) display.xzReadout.set(text);
      else if (display) display.textContent = text;
      if (down && warnAt && !warned && since && ms <= warnAt && ms > 0) {
        warned = true;
        display?.classList.add('is-warning');
        status.textContent = `${words(Math.round(warnAt / 1000))} left`;
      }
      if (down && ms <= 0) finish();
    };
    const label = () => {
      if (!toggleBtn) return;
      const text = since ? labels[1] : elapsed ? labels[2] : labels[0];
      const span = $('span', toggleBtn);
      (span || toggleBtn).textContent = text;
      el.classList.toggle('is-running', Boolean(since));
    };
    const start = () => {
      if (since || (down && now() >= duration)) return;
      since = performance.now();
      timer = setInterval(show, tenths ? 50 : 200);
      label();
      fire(el, 'xz:timer', { state: 'running' });
    };
    const pause = () => {
      if (!since) return;
      elapsed = now();
      since = 0;
      clearInterval(timer);
      show();
      label();
      fire(el, 'xz:timer', { state: 'paused', seconds: Math.round(elapsed / 1000) });
    };
    const finish = () => {
      elapsed = duration;
      since = 0;
      clearInterval(timer);
      label();
      el.classList.add('is-done');
      if (toggleBtn) toggleBtn.disabled = true;
      status.textContent = el.dataset.xzDone || 'Time is up';
      fire(el, 'xz:timeup', {});
    };
    const reset = () => {
      clearInterval(timer);
      elapsed = 0;
      since = 0;
      warned = false;
      el.classList.remove('is-done');
      display?.classList.remove('is-warning');
      if (toggleBtn) toggleBtn.disabled = false;
      show();
      label();
      fire(el, 'xz:timer', { state: 'reset' });
    };
    toggleBtn?.addEventListener('click', () => (since ? pause() : start()));
    resetBtn?.addEventListener('click', reset);
    el.xzTimer = { start, pause, reset, seconds: () => Math.round((down ? duration - now() : now()) / 1000) };
    show();
    label();
    if (el.hasAttribute('data-xz-autostart')) start();
  }
}
