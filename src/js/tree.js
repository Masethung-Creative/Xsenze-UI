// Tree view: nested lists that open and close, with the keyboard pattern people expect from file trees.
// <ul class="xz-tree" data-xz-tree="modules" aria-label="Course modules"> with li > (a | span) + ul.
// Without the script every level shows. A name in data-xz-tree remembers open folders on this device.
import { $$, ready, fire, nextId, store, dirKey } from './shared.js';

export function initTrees(root, { icon = () => '' } = {}) {
  for (const tree of $$('ul[data-xz-tree]', root)) {
    if (ready(tree, 'Tree')) continue;
    setup(tree, icon);
  }
}

function setup(tree, icon) {
  const name = tree.getAttribute('data-xz-tree');
  const key = name ? `xz-tree:${name}` : '';
  const saved = new Set(key ? store.get(key, []) : []);
  tree.classList.add('xz-tree');
  tree.setAttribute('role', 'tree');
  const items = [];
  const walk = (ul, level, parent) => {
    for (const li of ul.children) {
      if (li.tagName !== 'LI') continue;
      li.setAttribute('role', 'none');
      let label = li.firstElementChild;
      if (!label || label.tagName === 'UL') {
        label = document.createElement('span');
        li.prepend(label);
      }
      const group = li.querySelector(':scope > ul');
      const item = { li, label, group, parent, level, path: parent ? `${parent.path}/${label.textContent.trim()}` : label.textContent.trim() };
      items.push(item);
      label.setAttribute('role', 'treeitem');
      label.setAttribute('aria-level', String(level));
      label.tabIndex = -1;
      label.insertAdjacentHTML('afterbegin', `<span class="xz-tree__toggle${group ? '' : ' xz-tree__toggle--leaf'}" aria-hidden="true">${group ? icon('chevron-right', { size: 'xs' }) : ''}</span>`);
      if (group) {
        group.id ||= nextId('tree');
        group.setAttribute('role', 'group');
        label.setAttribute('aria-owns', group.id);
        walk(group, level + 1, item);
      }
    }
  };
  walk(tree, 1, null);
  const byLabel = new Map(items.map((it) => [it.label, it]));

  const isOpen = (it) => it.label.getAttribute('aria-expanded') === 'true';
  const setOpen = (it, open, quiet) => {
    if (!it.group) return;
    it.label.setAttribute('aria-expanded', String(open));
    it.group.hidden = !open;
    if (open) saved.add(it.path);
    else saved.delete(it.path);
    if (key) store.set(key, [...saved]);
    if (!quiet) fire(tree, 'xz:toggle', { item: it.label, open });
  };
  // Start closed, except saved folders, folders marked data-open, and the way to the current page.
  for (const it of items) if (it.group) setOpen(it, saved.has(it.path) || it.li.hasAttribute('data-open'), true);
  const current = items.find((it) => it.label.getAttribute('aria-current') === 'page' || it.label.getAttribute('aria-selected') === 'true');
  for (let p = current?.parent; p; p = p.parent) setOpen(p, true, true);

  const visible = () => items.filter((it) => !it.label.closest('[role="group"][hidden]'));
  let active = current || items[0];
  const focus = (it) => {
    if (!it) return;
    if (active) active.label.tabIndex = -1;
    active = it;
    it.label.tabIndex = 0;
    it.label.focus();
  };
  if (active) active.label.tabIndex = 0;
  const activate = (it, e) => {
    if (it.group && it.label.tagName !== 'A') setOpen(it, !isOpen(it));
    if (!fire(tree, 'xz:select', { item: it.label, label: it.label.textContent.trim() }, true)) e?.preventDefault();
  };

  tree.addEventListener('click', (e) => {
    const label = e.target.closest('[role="treeitem"]');
    const it = label && byLabel.get(label);
    if (!it) return;
    if (e.target.closest('.xz-tree__toggle') && it.group) {
      e.preventDefault();
      setOpen(it, !isOpen(it));
    } else activate(it, e);
    focus(it);
  });
  tree.addEventListener('keydown', (e) => {
    const it = byLabel.get(e.target.closest('[role="treeitem"]'));
    if (!it) return;
    const list = visible();
    const i = list.indexOf(it);
    const dir = dirKey(e, tree);
    let handled = true;
    if (e.key === 'ArrowDown') focus(list[i + 1]);
    else if (e.key === 'ArrowUp') focus(list[i - 1]);
    else if (e.key === 'Home') focus(list[0]);
    else if (e.key === 'End') focus(list[list.length - 1]);
    else if (dir === 'next') {
      if (it.group && !isOpen(it)) setOpen(it, true);
      else if (it.group) focus(items.find((x) => x.parent === it));
    } else if (dir === 'prev') {
      if (it.group && isOpen(it)) setOpen(it, false);
      else focus(it.parent);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (it.label.tagName === 'A' && e.key === 'Enter') return; // the link opens by itself
      activate(it, e);
    } else if (e.key === '*') {
      for (const x of items) if (x.parent === it.parent && x.group) setOpen(x, true);
    } else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Type a letter to jump to the next item that starts with it.
      const ch = e.key.toLowerCase();
      const after = [...list.slice(i + 1), ...list.slice(0, i + 1)];
      focus(after.find((x) => x.label.textContent.trim().toLowerCase().startsWith(ch)));
    } else handled = false;
    if (handled) e.preventDefault();
  });

  tree.xzTree = {
    open: (label) => byLabel.get(label) && setOpen(byLabel.get(label), true),
    close: (label) => byLabel.get(label) && setOpen(byLabel.get(label), false),
    expandAll: () => items.forEach((it) => setOpen(it, true, true)),
    collapseAll: () => items.forEach((it) => setOpen(it, false, true)),
  };
}
