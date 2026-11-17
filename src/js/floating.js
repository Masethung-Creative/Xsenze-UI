// One floating panel at a time.
// Popovers, the mega menu, context menus, search suggestions and table menus share this,
// so opening one closes the others.
import { fire, nextId } from './shared.js';

let current = null;
export function openFloating(entry) {
  if (current && current.panel !== entry.panel) current.close(false);
  current = entry;
}
export function releaseFloating(panel) {
  if (current?.panel === panel) current = null;
}
/** Close whatever panel is open, for example before a dialog opens over the page. */
export function closeAll() {
  current?.close(false);
  current = null;
}

let bound = false;
export function bindGlobal() {
  if (bound) return;
  bound = true;
  document.addEventListener('pointerdown', (e) => {
    if (current && !current.panel.contains(e.target) && !current.trigger?.contains(e.target)) current.close(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && current) {
      e.preventDefault();
      current.close(true);
    }
  });
  // Panels are pinned to the viewport. When the page moves under them, most close;
  // search suggestions follow their field instead, because phones scroll the page as the keyboard opens.
  const moved = (e) => {
    if (!current || (e && e.target !== document && current.panel.contains(e.target))) return;
    if (current.follow) current.follow();
    else current.close(false);
  };
  addEventListener('resize', () => moved());
  document.addEventListener('scroll', moved, true);
}

/** Shared open and close logic for a button that shows a panel. */
export function floating({ wrapper, trigger, panel, position, focusPanel }) {
  panel.id ||= nextId('panel');
  panel.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', panel.id);
  const close = (refocus) => {
    if (panel.hidden) return;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    wrapper.classList.remove('is-open');
    releaseFloating(panel);
    if (refocus) trigger.focus();
    fire(wrapper, 'xz:close');
  };
  const open = () => {
    openFloating({ panel, trigger, close });
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    wrapper.classList.add('is-open');
    position();
    if (focusPanel) (panel.querySelector('[autofocus]') || panel).focus({ preventScroll: true });
    fire(wrapper, 'xz:open');
  };
  trigger.addEventListener('click', () => (panel.hidden ? open() : close(false)));
  // Leaving with Tab closes the panel.
  panel.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== trigger) close(false);
  });
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-xz-popover-close]')) close(true);
  });
  wrapper.xzPopover = { open, close };
  return { open, close };
}
