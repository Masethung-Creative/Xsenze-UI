// Scroll areas, the sidebar that folds to icons, and the confirm dialog.
import { $$, ready, fire, esc, nextId, store } from './shared.js';

let H = {};

// ---------- scroll area ----------
// .xz-scroll (or data-xz-scroll): a box with its own scrollbar. The script marks the edges that have more to
// scroll to (has-before, has-after) for the --fade style, and lets keyboard users reach a box that scrolls.
function initScrollAreas(root) {
  for (const el of $$('.xz-scroll, [data-xz-scroll]', root)) {
    if (ready(el, 'Scroll')) continue;
    el.classList.add('xz-scroll');
    if (el.hasAttribute('aria-label') && !el.hasAttribute('role')) el.setAttribute('role', 'region');
    const across = () => el.classList.contains('xz-scroll--x');
    const update = () => {
      const x = across();
      const at = x ? Math.abs(el.scrollLeft) : el.scrollTop;
      const end = x ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
      el.classList.toggle('has-before', end > 1 && at > 1);
      el.classList.toggle('has-after', end > 1 && at < end - 1);
      if (end > 1 && !el.hasAttribute('tabindex')) el.tabIndex = 0;
    };
    el.addEventListener('scroll', update, { passive: true });
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      for (const child of el.children) ro.observe(child);
    }
    update();
  }
}

// ---------- sidebar ----------
// A button with data-xz-sidebar-toggle folds the sidebar to a rail of icons and back. With data-xz-sidebar="name"
// on the sidebar, the choice is kept on this device. In the rail, each link shows its name as a tooltip.
const target = (btn) => {
  const sel = btn.getAttribute('data-xz-sidebar-toggle');
  return (sel && document.querySelector(sel)) || btn.closest('.xz-sidebar') || document.querySelector('.xz-shell > .xz-sidebar');
};
function setSidebar(bar, rail, save) {
  bar.classList.toggle('xz-sidebar--rail', rail);
  for (const btn of $$('[data-xz-sidebar-toggle]')) {
    if (target(btn) !== bar) continue;
    btn.setAttribute('aria-expanded', String(!rail));
    btn.setAttribute('aria-label', rail ? 'Expand the menu' : 'Collapse the menu');
    if (btn.hasAttribute('data-xz-tooltip')) btn.setAttribute('data-xz-tooltip', rail ? 'Expand the menu' : 'Collapse the menu');
  }
  for (const link of $$('.xz-sidebar__link', bar)) {
    if (rail && !link.hasAttribute('data-xz-tooltip')) {
      link.setAttribute('data-xz-tooltip', link.textContent.trim());
      link.setAttribute('data-xz-tooltip-place', 'end');
      link.setAttribute('data-xz-tip-auto', '');
    } else if (!rail && link.hasAttribute('data-xz-tip-auto')) {
      for (const a of ['data-xz-tooltip', 'data-xz-tooltip-place', 'data-xz-tip-auto']) link.removeAttribute(a);
    }
  }
  const name = bar.getAttribute('data-xz-sidebar');
  if (save && name) store.set(`xz-sidebar:${name}`, rail ? 'rail' : 'full');
  if (save) fire(bar, 'xz:sidebar', { collapsed: rail });
}
function initSidebars(root) {
  for (const btn of $$('[data-xz-sidebar-toggle]', root)) {
    if (ready(btn, 'Sidebar')) continue;
    const bar = target(btn);
    if (!bar) continue;
    btn.setAttribute('aria-controls', (bar.id ||= nextId('sidebar')));
    const name = bar.getAttribute('data-xz-sidebar');
    const saved = name ? store.get(`xz-sidebar:${name}`) : null;
    setSidebar(bar, saved ? saved === 'rail' : bar.classList.contains('xz-sidebar--rail'), false);
    btn.addEventListener('click', () => setSidebar(bar, !bar.classList.contains('xz-sidebar--rail'), true));
    if (ready(bar, 'SidebarGroups')) continue;
    // Opening a group of links while the sidebar is a rail widens it first.
    bar.addEventListener('click', (e) => {
      const summary = e.target.closest('.xz-sidebar__group > summary');
      if (!summary || !bar.classList.contains('xz-sidebar--rail')) return;
      e.preventDefault();
      setSidebar(bar, false, true);
      summary.parentElement.open = true;
    });
  }
}

// ---------- confirm ----------
// Xsenze.confirm({ title, message, confirm, cancel, danger }) asks before a step that is hard to undo.
// It resolves true or false. Escape and Cancel both answer false, and Cancel has the focus, so Enter is safe.
export function confirm(options = {}) {
  const o = typeof options === 'string' ? { message: options } : options;
  const back = document.activeElement;
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    const titleId = nextId('confirm');
    dlg.className = 'xz-modal xz-modal--sm xz-modal--alert';
    dlg.setAttribute('role', 'alertdialog');
    dlg.setAttribute('data-xz-static', '');
    dlg.setAttribute('aria-labelledby', titleId);
    dlg.setAttribute('aria-describedby', `${titleId}-text`);
    const icon = o.danger ? H.icon?.('triangle-alert') || '' : '';
    dlg.innerHTML = `<div class="xz-modal__body">${icon ? `<span class="xz-modal__icon">${icon}</span>` : ''}<h2 class="xz-modal__title" id="${titleId}">${esc(o.title || 'Are you sure?')}</h2><p id="${titleId}-text">${esc(o.message || '')}</p></div><div class="xz-modal__footer"><button class="xz-btn" type="button" value="">${esc(o.cancel || 'Cancel')}</button><button class="xz-btn ${o.danger ? 'xz-btn--danger' : 'xz-btn--primary'}" type="button" value="ok">${esc(o.confirm || 'Continue')}</button></div>`;
    const done = (yes) => {
      dlg.close();
      dlg.remove();
      back?.focus?.();
      resolve(yes);
    };
    dlg.addEventListener('click', (e) => {
      const b = e.target.closest('button[value]');
      if (b) done(b.value === 'ok');
    });
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      done(false);
    });
    document.body.append(dlg);
    dlg.showModal();
    dlg.querySelector('button').focus();
  });
}

export function initLayout(root, helpers) {
  H = helpers || H;
  initScrollAreas(root);
  initSidebars(root);
}
