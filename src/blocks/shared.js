// Helpers shared by the blocks.
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** True the second time it is called for the same element and key, so each block starts once. */
export const ready = (el, key) => {
  const k = `xz${key}Ready`;
  if (el.dataset[k]) return true;
  el.dataset[k] = '1';
  return false;
};

export const fire = (el, type, detail) => el.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

const query = (q) => (typeof matchMedia === 'function' ? matchMedia(q) : { matches: false, addEventListener() {} });
const reducedQuery = query('(prefers-reduced-motion: reduce)');
const fineQuery = query('(pointer: fine)');

/** Motion runs unless the person asked for less motion, in the system or with the page's motion button. */
export const motionOn = () => !reducedQuery.matches && document.documentElement.getAttribute('data-xz-motion') !== 'off';
export const finePointer = () => fineQuery.matches;

const motionListeners = new Set();
/** Call cb(on) whenever motion is switched on or off. */
export const onMotion = (cb) => motionListeners.add(cb);
export const notifyMotion = () => {
  const on = motionOn();
  motionListeners.forEach((cb) => cb(on));
};
reducedQuery.addEventListener('change', notifyMotion);

/** Call cb(visible, entry) as the element enters and leaves the screen. */
export function watch(el, cb, options = {}) {
  if (typeof IntersectionObserver !== 'function') {
    cb(true);
    return null;
  }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting, e)), options);
  io.observe(el);
  return io;
}

/** Run fn at most once per frame. */
export function perFrame(fn) {
  let frame = 0;
  return () => {
    if (!frame) frame = requestAnimationFrame(() => ((frame = 0), fn()));
  };
}

/** A visually hidden copy of the text, for screen readers, while the visible copy animates. */
export function srText(text) {
  return Object.assign(document.createElement('span'), { className: 'xz-sr-only', textContent: text });
}

export function caret() {
  const c = document.createElement('span');
  c.className = 'xz-caret';
  c.setAttribute('aria-hidden', 'true');
  return c;
}
