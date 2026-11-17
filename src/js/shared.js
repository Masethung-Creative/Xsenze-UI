// Helpers shared by the kit's behaviours and blocks. No dependencies.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** True the second time it is called for the same element and key, so each behaviour starts once. */
export const ready = (el, key) => {
  const k = `xz${key}Ready`;
  if (el.dataset[k]) return true;
  el.dataset[k] = '1';
  return false;
};

/** Fire a bubbling `xz:*` event. Returns false when a listener called preventDefault(). */
export const fire = (el, type, detail, cancelable = false) => el.dispatchEvent(new CustomEvent(type, { bubbles: true, cancelable, detail }));
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
let uid = 0;
export const nextId = (p) => `xz-${p}-s${++uid}`;

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

/** Saved settings on this device. Never throws, for private windows and blocked storage. */
export const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

/** Right-to-left text at this element. */
export const isRtl = (el = document.documentElement) => getComputedStyle(el).direction === 'rtl';

/** ArrowLeft and ArrowRight as 'prev' and 'next' along the line of text, mirrored in right-to-left text. */
export function dirKey(e, el) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return null;
  const forward = e.key === 'ArrowRight';
  return forward !== isRtl(el) ? 'next' : 'prev';
}

/** True while an input method (for Hindi, Tamil and other scripts) is still composing text. Enter then confirms the text, not the form. */
export const composing = (e) => e.isComposing || e.keyCode === 229;

/** Focus is in a place where typing goes, so single-key and Ctrl shortcuts should not fire. */
export const typing = (t) => Boolean(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)));

// ---------- keyboard shortcuts ----------
// "mod+k" means Ctrl+K, or ⌘K on Apple devices. Either modifier works everywhere.
const apple = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');

export function parseShortcut(s) {
  if (!s || s === 'none') return null;
  const parts = String(s).toLowerCase().split('+').map((p) => p.trim()).filter(Boolean);
  const key = parts.pop();
  const has = (m) => parts.includes(m);
  return { key, mod: has('mod'), ctrl: has('ctrl'), meta: has('meta') || has('cmd'), alt: has('alt'), shift: has('shift') };
}

export function matchShortcut(e, sc) {
  if (!sc || !e.key || e.key.toLowerCase() !== sc.key) return false;
  if (e.altKey !== sc.alt || e.shiftKey !== sc.shift) return false;
  if (sc.mod) return e.ctrlKey !== e.metaKey; // one of them, not both
  return e.ctrlKey === sc.ctrl && e.metaKey === sc.meta;
}

/** The shortcut as people read it: "Ctrl K" on Windows and Linux, "⌘K" on Apple devices. */
export function shortcutLabel(s) {
  const sc = typeof s === 'string' ? parseShortcut(s) : s;
  if (!sc) return '';
  const mac = apple();
  const parts = [];
  if (sc.mod || sc.meta) parts.push(mac ? '⌘' : sc.mod ? 'Ctrl' : 'Win');
  if (sc.ctrl) parts.push(mac ? '⌃' : 'Ctrl');
  if (sc.alt) parts.push(mac ? '⌥' : 'Alt');
  if (sc.shift) parts.push(mac ? '⇧' : 'Shift');
  parts.push(sc.key.length === 1 ? sc.key.toUpperCase() : sc.key[0].toUpperCase() + sc.key.slice(1));
  return mac ? parts.join('') : parts.join(' ');
}

/** The value for aria-keyshortcuts, for example "Control+K Meta+K". */
export function ariaShortcut(s) {
  const sc = typeof s === 'string' ? parseShortcut(s) : s;
  if (!sc) return '';
  const key = sc.key.length === 1 ? sc.key.toUpperCase() : sc.key[0].toUpperCase() + sc.key.slice(1);
  const extra = [sc.alt && 'Alt', sc.shift && 'Shift'].filter(Boolean);
  const join = (m) => [...m, ...extra, key].join('+');
  if (sc.mod) return `${join(['Control'])} ${join(['Meta'])}`;
  return join([sc.ctrl && 'Control', sc.meta && 'Meta'].filter(Boolean));
}
