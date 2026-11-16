// Pins a floating panel to the viewport next to its anchor, so a scrolling parent
// (a table, a dialog, a docs example) cannot clip it.

const viewport = () => ({ vw: document.documentElement.clientWidth, vh: document.documentElement.clientHeight });

function reset(panel) {
  panel.style.position = 'fixed';
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  panel.style.left = '0px';
  panel.style.top = '0px';
  return panel.getBoundingClientRect();
}

/**
 * Places a panel under its anchor, or above it when there is no room below.
 * `align: 'end'` lines up the right edges instead of the left edges.
 */
export function place(panel, anchor, { align = 'start', gap = 4 } = {}) {
  const a = anchor.getBoundingClientRect();
  const { vw, vh } = viewport();
  const p = reset(panel);
  const below = a.bottom + gap;
  const top = below + p.height <= vh - 8 || a.top - gap - p.height < 8 ? below : a.top - gap - p.height;
  const left = align === 'end' ? a.right - p.width : a.left;
  panel.style.left = `${Math.max(8, Math.min(left, vw - p.width - 8))}px`;
  panel.style.top = `${Math.max(8, top)}px`;
}

/** Places a panel at a point, such as where a right click happened. It stays inside the viewport. */
export function placeAt(panel, x, y) {
  const { vw, vh } = viewport();
  const p = reset(panel);
  panel.style.left = `${Math.max(8, Math.min(x, vw - p.width - 8))}px`;
  const top = y + p.height > vh - 8 ? y - p.height : y;
  panel.style.top = `${Math.max(8, Math.min(top, vh - p.height - 8))}px`;
}
