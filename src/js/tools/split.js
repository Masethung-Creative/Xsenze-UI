// Split view: two panes and a handle between them (the WAI-ARIA window splitter).
// Drag the handle, or focus it and use the arrow keys (Shift for bigger steps), Home and End.
// Enter folds the first pane away and brings it back. A name remembers the size on this device.
import { $$, ready, fire, clamp, store, isRtl, dirKey, nextId } from '../shared.js';

export function initSplits(root) {
  for (const el of $$('[data-xz-split]', root)) {
    if (ready(el, 'Split')) continue;
    const panes = $$(':scope > .xz-split__pane', el);
    if (panes.length < 2) continue;
    const rows = el.classList.contains('xz-split--rows');
    const name = el.getAttribute('data-xz-split');
    const key = name ? `xz-split:${name}` : '';
    const min = Number(el.dataset.xzMin ?? 15);
    const max = Number(el.dataset.xzMax ?? 85);
    let handle = el.querySelector(':scope > .xz-split__handle');
    if (!handle) {
      handle = Object.assign(document.createElement('div'), { className: 'xz-split__handle' });
      panes[0].after(handle);
    }
    panes[0].id ||= nextId('pane');
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', rows ? 'horizontal' : 'vertical');
    handle.setAttribute('aria-controls', panes[0].id);
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    if (!handle.hasAttribute('aria-label') && !handle.hasAttribute('aria-labelledby')) handle.setAttribute('aria-label', el.dataset.xzLabel || 'Resize panes');
    handle.tabIndex = 0;

    const start = parseFloat(getComputedStyle(el).getPropertyValue('--xz-split')) || 50;
    let size = clamp(Number(key ? store.get(key, start) : start) || start, min, max);
    let before = size;
    const set = (value, { save = true, emit = true } = {}) => {
      const folded = el.classList.contains('is-collapsed');
      size = folded ? 0 : Math.round(clamp(value, min, max) * 10) / 10;
      el.style.setProperty('--xz-split', `${size}%`);
      handle.setAttribute('aria-valuenow', String(Math.round(size)));
      handle.setAttribute('aria-valuetext', folded ? 'Folded away' : `${Math.round(size)}%`);
      if (save && key && !folded) store.set(key, size);
      if (emit) fire(el, 'xz:resize', { size, collapsed: folded });
    };
    const collapse = () => {
      if (el.classList.contains('is-collapsed')) return;
      before = size;
      el.classList.add('is-collapsed');
      set(0, { save: false });
    };
    const restore = () => {
      if (!el.classList.contains('is-collapsed')) return;
      el.classList.remove('is-collapsed');
      set(before);
    };
    const toggle = () => (el.classList.contains('is-collapsed') ? restore() : collapse());

    handle.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 2;
      let next = null;
      if (rows) next = { ArrowDown: size + step, ArrowUp: size - step }[e.key] ?? null;
      else {
        const d = dirKey(e, el);
        if (d) next = d === 'next' ? size + step : size - step;
      }
      if (e.key === 'Home') next = min;
      if (e.key === 'End') next = max;
      if (e.key === 'Enter') {
        e.preventDefault();
        toggle();
        return;
      }
      if (next === null) return;
      e.preventDefault();
      el.classList.remove('is-collapsed');
      set(next);
    });
    handle.addEventListener('dblclick', toggle);
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      handle.focus({ preventScroll: true });
      handle.setPointerCapture?.(e.pointerId);
      el.classList.add('is-dragging');
      const move = (ev) => {
        const r = el.getBoundingClientRect();
        const at = rows ? (ev.clientY - r.top) / r.height : (isRtl(el) ? r.right - ev.clientX : ev.clientX - r.left) / r.width;
        el.classList.remove('is-collapsed');
        set(at * 100, { save: false });
      };
      const end = () => {
        el.classList.remove('is-dragging');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        if (key) store.set(key, size);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    });

    el.xzSplit = { set: (v) => (el.classList.remove('is-collapsed'), set(v)), get: () => size, collapse, restore, toggle };
    set(size, { save: false, emit: false });
  }
}
