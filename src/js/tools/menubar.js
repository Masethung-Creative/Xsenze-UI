// Menu bar (the WAI-ARIA menubar pattern): File, Edit, View menus for editor screens.
// Left and Right move along the bar, Down opens a menu, Right and Left open and close submenus,
// Escape closes, letters jump to an item. Tick items (menuitemcheckbox) and dot items (menuitemradio)
// change without closing the menu. Every choice fires xz:action, like the context menu.
import { $$, ready, fire, nextId, dirKey, isRtl, shortcutLabel, ariaShortcut } from '../shared.js';

const usable = (list) => $$(':scope > li > .xz-menu__item, :scope > li > .xz-menu__group > li > .xz-menu__item', list).filter((i) => !i.disabled);
const labelOf = (item) =>
  item.dataset.action ||
  [...item.childNodes]
    .filter((n) => !(n.nodeType === 1 && n.classList.contains('xz-menu__shortcut')))
    .map((n) => n.textContent)
    .join('')
    .trim();

function setupItem(item) {
  if (!item.hasAttribute('role')) item.setAttribute('role', 'menuitem');
  if (item.tagName === 'BUTTON') item.type = 'button';
  item.tabIndex = -1;
  const sc = item.getAttribute('data-xz-shortcut');
  if (sc && !item.querySelector('.xz-menu__shortcut')) {
    const k = Object.assign(document.createElement('kbd'), { className: 'xz-menu__shortcut', textContent: shortcutLabel(sc) });
    k.setAttribute('aria-hidden', 'true');
    item.append(k);
    item.setAttribute('aria-keyshortcuts', ariaShortcut(sc));
  }
  if (/^menuitem(checkbox|radio)$/.test(item.getAttribute('role')) && !item.hasAttribute('aria-checked')) item.setAttribute('aria-checked', 'false');
}

function setupList(list, parent) {
  list.setAttribute('role', 'menu');
  list.hidden = true;
  list.id ||= nextId('menu');
  parent.id ||= nextId('menuitem');
  list.setAttribute('aria-labelledby', parent.id);
  parent.setAttribute('aria-haspopup', 'menu');
  parent.setAttribute('aria-expanded', 'false');
  parent.xzSub = list;
  list.xzParent = parent;
  for (const li of $$(':scope > li', list)) {
    if (li.classList.contains('xz-menu__separator')) {
      li.setAttribute('role', 'separator');
      continue;
    }
    li.setAttribute('role', 'none');
    const group = li.querySelector(':scope > .xz-menu__group');
    if (group) {
      group.setAttribute('role', 'group');
      for (const g of $$(':scope > li', group)) {
        g.setAttribute('role', 'none');
        const item = g.querySelector(':scope > .xz-menu__item');
        if (item) setupItem(item);
      }
      continue;
    }
    const item = li.querySelector(':scope > .xz-menu__item');
    if (!item) continue;
    setupItem(item);
    const sub = li.querySelector(':scope > .xz-menu__list');
    if (sub) setupList(sub, item);
  }
}

// Pinned to the viewport, under a bar item or beside a menu item, flipped when there is no room.
function position(list, anchor, beside) {
  Object.assign(list.style, { left: '0px', top: '0px', right: 'auto', bottom: 'auto' });
  const a = anchor.getBoundingClientRect();
  const p = list.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const rtl = isRtl(anchor);
  let left;
  let top;
  if (beside) {
    left = rtl ? a.left - p.width + 2 : a.right - 2;
    if (!rtl && left + p.width > vw - 8) left = a.left - p.width + 2;
    if (rtl && left < 8) left = a.right - 2;
    top = Math.min(a.top - 5, vh - p.height - 8);
  } else {
    left = rtl ? a.right - p.width : a.left;
    top = a.bottom;
    if (top + p.height > vh - 8 && a.top - p.height > 8) top = a.top - p.height;
  }
  list.style.left = `${Math.max(8, Math.min(left, vw - p.width - 8))}px`;
  list.style.top = `${Math.max(8, top)}px`;
}

export function initMenubars(root) {
  for (const bar of $$('[data-xz-menubar]', root)) {
    if (ready(bar, 'Menubar')) continue;
    bar.setAttribute('role', 'menubar');
    const tops = [];
    for (const li of $$(':scope > li', bar)) {
      li.setAttribute('role', 'none');
      const t = li.querySelector(':scope > .xz-menubar__trigger');
      if (!t) continue;
      t.setAttribute('role', 'menuitem');
      if (t.tagName === 'BUTTON') t.type = 'button';
      t.tabIndex = -1;
      const list = li.querySelector(':scope > .xz-menu__list');
      if (list) setupList(list, t);
      tops.push(t);
    }
    if (!tops.length) continue;
    tops[0].tabIndex = 0;
    let current = null;

    const focusTop = (t) => {
      for (const x of tops) x.tabIndex = x === t ? 0 : -1;
      t.focus();
    };
    const closeList = (list) => {
      for (const it of usable(list)) if (it.xzSub && !it.xzSub.hidden) closeList(it.xzSub);
      list.hidden = true;
      list.xzParent.setAttribute('aria-expanded', 'false');
    };
    const closeAll = () => {
      if (!current) return;
      if (current.xzSub) closeList(current.xzSub);
      current = null;
    };
    const openTop = (t, focus) => {
      if (current && current !== t) closeAll();
      if (!t.xzSub) return;
      current = t;
      t.setAttribute('aria-expanded', 'true');
      t.xzSub.hidden = false;
      position(t.xzSub, t, false);
      const all = usable(t.xzSub);
      if (focus === 'first') all[0]?.focus();
      if (focus === 'last') all[all.length - 1]?.focus();
    };
    const openSub = (item, focusFirst) => {
      const list = item.closest('[role="menu"]');
      for (const sib of usable(list)) if (sib !== item && sib.xzSub && !sib.xzSub.hidden) closeList(sib.xzSub);
      item.setAttribute('aria-expanded', 'true');
      item.xzSub.hidden = false;
      position(item.xzSub, item, true);
      if (focusFirst) usable(item.xzSub)[0]?.focus();
    };
    const step = (t, by) => tops[(tops.indexOf(t) + by + tops.length) % tops.length];
    const isTopList = (list) => tops.includes(list.xzParent);
    const typeahead = (list, from, key) => {
      const k = key.toLowerCase();
      const i = list.indexOf(from);
      const order = [...list.slice(i + 1), ...list.slice(0, i + 1)];
      return order.find((x) => labelOf(x).toLowerCase().startsWith(k));
    };

    const activate = (item) => {
      if (item.xzSub) return openSub(item, true);
      const role = item.getAttribute('role');
      if (role === 'menuitemcheckbox') {
        const on = item.getAttribute('aria-checked') !== 'true';
        item.setAttribute('aria-checked', String(on));
        fire(item, 'xz:action', { action: labelOf(item), item, checked: on });
        return;
      }
      if (role === 'menuitemradio') {
        const menu = item.closest('[role="menu"]');
        const scope = item.closest('[role="group"]') || menu;
        for (const r of $$('[role="menuitemradio"]', scope)) if (r.closest('[role="menu"]') === menu) r.setAttribute('aria-checked', String(r === item));
        fire(item, 'xz:action', { action: labelOf(item), item, checked: true });
        return;
      }
      const top = current;
      closeAll();
      if (top) focusTop(top);
      fire(item, 'xz:action', { action: labelOf(item), item });
    };

    bar.addEventListener('click', (e) => {
      const t = e.target.closest('.xz-menubar__trigger');
      if (t && tops.includes(t)) {
        if (current === t) closeAll();
        else openTop(t, e.detail === 0 ? 'first' : null);
        return;
      }
      const item = e.target.closest('.xz-menu__item');
      if (!item || item.disabled || !bar.contains(item)) return;
      activate(item);
    });

    bar.addEventListener('keydown', (e) => {
      const t = e.target.closest('.xz-menubar__trigger');
      if (t && tops.includes(t)) {
        const d = dirKey(e, bar);
        let to = null;
        if (d) to = step(t, d === 'next' ? 1 : -1);
        else if (e.key === 'Home') to = tops[0];
        else if (e.key === 'End') to = tops[tops.length - 1];
        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          openTop(t, e.key === 'ArrowDown' ? 'first' : 'last');
          return;
        } else if (e.key === 'Escape') {
          closeAll();
          return;
        } else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) to = typeahead(tops, t, e.key);
        if (!to) return;
        e.preventDefault();
        const wasOpen = Boolean(current);
        focusTop(to);
        if (wasOpen) openTop(to, null);
        return;
      }
      const item = e.target.closest('.xz-menu__item');
      if (!item || !bar.contains(item)) return;
      const list = item.closest('[role="menu"]');
      const all = usable(list);
      const i = all.indexOf(item);
      const d = dirKey(e, bar);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        const n = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key];
        all[(n + all.length) % all.length]?.focus();
      } else if (d === 'next' && item.xzSub) {
        e.preventDefault();
        openSub(item, true);
      } else if (d && isTopList(list)) {
        e.preventDefault();
        const to = step(current, d === 'next' ? 1 : -1);
        closeAll();
        focusTop(to);
        openTop(to, 'first');
      } else if (d === 'prev' || e.key === 'Escape') {
        e.preventDefault();
        if (isTopList(list)) {
          const top = current;
          closeAll();
          if (top) focusTop(top);
        } else {
          closeList(list);
          list.xzParent.focus();
        }
      } else if (e.key === 'Tab') {
        closeAll();
      } else if (e.key === ' ' && item.tagName !== 'BUTTON') {
        e.preventDefault();
        item.click();
      } else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        typeahead(all, item, e.key)?.focus();
      }
    });

    // Pointer: moving across the bar while a menu is open switches menus; resting on an item opens its submenu.
    bar.addEventListener('pointerover', (e) => {
      if (e.pointerType === 'touch') return;
      const t = e.target.closest('.xz-menubar__trigger');
      if (t && current && current !== t && tops.includes(t)) {
        focusTop(t);
        openTop(t, null);
        return;
      }
      const item = e.target.closest('.xz-menu__item');
      if (!item || item.disabled || !bar.contains(item) || item === document.activeElement) return;
      item.focus({ preventScroll: true });
      const list = item.closest('[role="menu"]');
      for (const sib of usable(list)) if (sib !== item && sib.xzSub && !sib.xzSub.hidden) closeList(sib.xzSub);
      if (item.xzSub && item.xzSub.hidden) openSub(item, false);
    });
    bar.addEventListener('focusout', (e) => {
      if (current && !bar.contains(e.relatedTarget)) closeAll();
    });
    document.addEventListener('pointerdown', (e) => {
      if (current && !bar.contains(e.target)) closeAll();
    });
    addEventListener('resize', closeAll);
    document.addEventListener('scroll', (e) => current && !(e.target instanceof Node && bar.contains(e.target)) && closeAll(), true);

    bar.xzMenubar = { close: closeAll, open: (label) => openTop(tops.find((t) => labelOf(t) === label) || tops[0], null) };
  }
}
