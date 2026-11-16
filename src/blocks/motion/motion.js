// The page's motion switch. A button with data-xz-motion-toggle pauses every animation on the page
// (rotating words, logo rows, demos, backgrounds), and the choice is kept for the next visit.
import { $$, motionOn, notifyMotion } from '../shared.js';

const KEY = 'xz-motion';
const root = () => document.documentElement;
let iconFn = () => '';

export const motion = {
  /** True while animations may run. False when paused here or when the system asks for less motion. */
  enabled: () => motionOn(),
  set(on, { persist = true } = {}) {
    root().setAttribute('data-xz-motion', on ? 'on' : 'off');
    if (persist) {
      try {
        localStorage.setItem(KEY, on ? 'on' : 'off');
      } catch {}
    }
    syncMotionButtons();
    notifyMotion();
    document.dispatchEvent(new CustomEvent('xz:motion', { detail: { on: motionOn() } }));
  },
  toggle() {
    motion.set(root().getAttribute('data-xz-motion') === 'off');
  },
  restore() {
    let saved = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    if (saved === 'off') root().setAttribute('data-xz-motion', 'off');
  },
};

/** The button keeps one name, "Pause animations", and aria-pressed says whether they are paused. */
export function syncMotionButtons() {
  const off = root().getAttribute('data-xz-motion') === 'off';
  for (const btn of $$('[data-xz-motion-toggle]')) {
    btn.classList.add('xz-motion-toggle');
    btn.setAttribute('aria-pressed', String(off));
    if (!btn.hasAttribute('aria-label') && !btn.textContent.trim()) btn.setAttribute('aria-label', 'Pause animations');
    const old = btn.querySelector('svg.xz-icon, [data-xz-icon]');
    if (old) old.outerHTML = iconFn(off ? 'play' : 'pause', { size: old.getAttribute('data-size') || (old.classList.contains('xz-icon--sm') ? 'sm' : undefined) });
  }
}

export function initMotion(root, { icon }) {
  iconFn = icon;
  syncMotionButtons();
}
