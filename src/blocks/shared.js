// Helpers shared by the blocks. The general ones live with the rest of the kit's helpers.
export { $$, ready, fire, clamp, motionOn, finePointer, onMotion, notifyMotion, watch, perFrame } from '../js/shared.js';

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
