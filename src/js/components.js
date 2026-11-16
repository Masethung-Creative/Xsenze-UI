// Phase 2 components: popover, notification centre, mega menu, context menu, search with
// suggestions, bottom sheet, wizard, carousel, lightbox, video and audio player, pricing switch.
// Everything starts from data attributes. Markup without the script still shows its content.
import { place, placeAt } from './place.js';

const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const ready = (el) => {
  if (el.dataset.xzReady) return true;
  el.dataset.xzReady = '1';
  return false;
};
const fire = (el, type, detail, cancelable = false) => el.dispatchEvent(new CustomEvent(type, { bubbles: true, cancelable, detail }));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let uid = 0;
const nextId = (p) => `xz-${p}-c${++uid}`;

let icon = () => '';
let validateField = () => true;

// ---------- one floating panel at a time ----------
// Popovers, the mega menu, context menus and search suggestions share this, so opening one closes the others.
let current = null;
function openFloating(entry) {
  if (current && current.panel !== entry.panel) current.close(false);
  current = entry;
}
function releaseFloating(panel) {
  if (current?.panel === panel) current = null;
}
let bound = false;
function bindGlobal() {
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
function floating({ wrapper, trigger, panel, position, focusPanel }) {
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

// ---------- popover ----------
function initPopovers(root) {
  for (const pop of $$('[data-xz-popover]', root)) {
    if (ready(pop)) continue;
    const trigger = pop.querySelector(':scope > button, :scope > [data-xz-popover-trigger]');
    const panel = pop.querySelector(':scope > .xz-popover__panel');
    if (!trigger || !panel) continue;
    panel.tabIndex = -1;
    if (!panel.hasAttribute('role')) panel.setAttribute('role', 'dialog');
    const title = panel.querySelector('.xz-popover__title');
    if (title) {
      title.id ||= nextId('popover-title');
      panel.setAttribute('aria-labelledby', title.id);
    } else if (!panel.hasAttribute('aria-label')) {
      panel.setAttribute('aria-label', trigger.getAttribute('aria-label') || trigger.textContent.trim());
    }
    const align = pop.getAttribute('data-xz-popover') === 'end' ? 'end' : 'start';
    floating({ wrapper: pop, trigger, panel, focusPanel: true, position: () => place(panel, trigger, { align, gap: 6 }) });
  }
}

// ---------- notification centre ----------
function initNotifications(root) {
  for (const box of $$('[data-xz-notifications]', root)) {
    if (box.dataset.xzNotifyReady) continue;
    box.dataset.xzNotifyReady = '1';
    const trigger = box.querySelector(':scope > button');
    const list = box.querySelector('.xz-notifications__list');
    if (!trigger || !list) continue;
    const label = trigger.getAttribute('aria-label') || 'Notifications';
    let count = box.querySelector('.xz-notify-count');
    if (!count) {
      count = Object.assign(document.createElement('span'), { className: 'xz-notify-count' });
      count.setAttribute('aria-hidden', 'true');
      trigger.append(count);
    }
    const markAll = box.querySelector('[data-xz-mark-all]');
    const sync = () => {
      const items = $$('.xz-notification', list);
      const unread = items.filter((n) => n.classList.contains('is-unread'));
      for (const n of items) {
        let flag = n.querySelector(':scope .xz-notification__flag');
        if (n.classList.contains('is-unread') && !flag) {
          flag = Object.assign(document.createElement('span'), { className: 'xz-sr-only xz-notification__flag', textContent: 'Unread. ' });
          (n.querySelector('.xz-notification__body') || n).prepend(flag);
        } else if (!n.classList.contains('is-unread') && flag) flag.remove();
      }
      count.textContent = unread.length > 9 ? '9+' : String(unread.length);
      count.hidden = unread.length === 0;
      trigger.setAttribute('aria-label', unread.length ? `${label}, ${unread.length} unread` : label);
      if (markAll) markAll.disabled = unread.length === 0;
      box.querySelector('.xz-notifications__empty')?.toggleAttribute('hidden', items.length > 0);
    };
    const read = (items) => {
      const changed = items.filter((n) => n.classList.contains('is-unread'));
      if (!changed.length) return;
      changed.forEach((n) => n.classList.remove('is-unread'));
      sync();
      fire(box, 'xz:read', { items: changed });
    };
    list.addEventListener('click', (e) => {
      const n = e.target.closest('.xz-notification');
      if (n) read([n]);
    });
    markAll?.addEventListener('click', () => read($$('.xz-notification', list)));
    box.xzNotifications = { sync, read };
    sync();
  }
}

// ---------- mega menu ----------
function initMegaMenus(root) {
  for (const menu of $$('[data-xz-megamenu]', root)) {
    if (ready(menu)) continue;
    const trigger = menu.querySelector(':scope > button');
    const panel = menu.querySelector(':scope > .xz-megamenu__panel');
    if (!trigger || !panel) continue;
    floating({
      wrapper: menu,
      trigger,
      panel,
      focusPanel: false,
      position: () => {
        // Full width, directly under the bar the menu sits in.
        const bar = trigger.closest('.xz-navbar') || trigger;
        const top = bar.getBoundingClientRect().bottom;
        Object.assign(panel.style, { position: 'fixed', top: `${top}px`, left: '0px', right: '0px', maxHeight: `calc(100dvh - ${top}px)` });
      },
    });
  }
}

// ---------- context menu ----------
function menuKeys(list, close) {
  list.addEventListener('keydown', (e) => {
    const all = $$('.xz-menu__item:not(:disabled)', list);
    const i = all.indexOf(document.activeElement);
    if (e.key === 'Tab') return close(false);
    const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    all[(next + all.length) % all.length]?.focus();
  });
}
function initContextMenus(root) {
  for (const target of $$('[data-xz-context-menu]', root)) {
    if (ready(target)) continue;
    const list = document.querySelector(target.getAttribute('data-xz-context-menu'));
    if (!list) continue;
    if (!list.dataset.xzContextReady) {
      list.dataset.xzContextReady = '1';
      list.hidden = true;
      list.setAttribute('role', 'menu');
      list.classList.add('xz-context-menu');
      for (const item of $$('.xz-menu__item', list)) {
        item.setAttribute('role', 'menuitem');
        item.tabIndex = -1;
        if (item.parentElement.tagName === 'LI') item.parentElement.setAttribute('role', 'none');
      }
      // Keep the list at the end of the page, so no parent can clip or transform it.
      document.body.append(list);
      const close = (refocus) => {
        if (list.hidden) return;
        list.hidden = true;
        releaseFloating(list);
        if (refocus) list.xzTarget?.focus();
      };
      list.xzClose = close;
      menuKeys(list, close);
      list.addEventListener('click', (e) => {
        const item = e.target.closest('.xz-menu__item');
        if (!item || item.disabled) return;
        const t = list.xzTarget;
        close(true);
        fire(t, 'xz:action', { action: item.dataset.action || item.textContent.trim(), item });
      });
    }
    if (!target.hasAttribute('tabindex') && !target.matches('a, button, input, select, textarea')) target.tabIndex = 0;
    target.setAttribute('aria-haspopup', 'menu');
    const open = (x, y) => {
      openFloating({ panel: list, trigger: null, close: list.xzClose });
      list.xzTarget = target;
      list.hidden = false;
      placeAt(list, x, y);
      fire(target, 'xz:open');
      list.querySelector('.xz-menu__item:not(:disabled)')?.focus({ preventScroll: true });
    };
    target.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (list.hidden || list.xzTarget !== target) open(e.clientX, e.clientY);
    });
    target.addEventListener('keydown', (e) => {
      if (e.target !== target) return;
      if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
        e.preventDefault();
        const r = target.getBoundingClientRect();
        open(r.left + 8, r.top + Math.min(r.height, 32));
      }
    });
    // Long press on touch screens that do not send a contextmenu event.
    let timer;
    let start;
    target.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      start = [e.clientX, e.clientY];
      timer = setTimeout(() => open(start[0], start[1]), 550);
    });
    target.addEventListener('pointermove', (e) => {
      if (timer && start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 10) clearTimeout(timer);
    });
    for (const type of ['pointerup', 'pointercancel']) target.addEventListener(type, () => clearTimeout(timer));
  }
}

// ---------- search with suggestions ----------
const RECENT_MAX = 5;
const recentKey = (name) => `xz-search-recent:${name}`;
function readRecent(name) {
  try {
    return JSON.parse(localStorage.getItem(recentKey(name)) || '[]').slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}
function saveRecent(name, query) {
  if (!name || !query) return;
  try {
    const list = [query, ...readRecent(name).filter((q) => q.toLowerCase() !== query.toLowerCase())].slice(0, RECENT_MAX);
    localStorage.setItem(recentKey(name), JSON.stringify(list));
  } catch {}
}
function mark(label, query) {
  const i = query ? label.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return esc(label);
  return esc(label.slice(0, i)) + '<mark>' + esc(label.slice(i, i + query.length)) + '</mark>' + esc(label.slice(i + query.length));
}

function initSearches(root) {
  for (const box of $$('[data-xz-search]', root)) {
    if (ready(box)) continue;
    const input = box.querySelector('input[type="search"], input[type="text"]');
    if (!input) continue;
    const group = input.closest('.xz-input-group') || input;
    const recentName = box.getAttribute('data-xz-recent');
    const url = box.getAttribute('data-xz-search-url');
    const max = Number(box.getAttribute('data-xz-max') || 8);
    const source = $$('.xz-search__source > li', box).map((li) => ({ label: li.textContent.trim(), group: li.dataset.group || '', href: li.dataset.href || '', meta: li.dataset.meta || '', keywords: li.dataset.keywords || '' }));

    const list = Object.assign(document.createElement('ul'), { className: 'xz-search__list', id: nextId('search') });
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Suggestions');
    list.hidden = true;
    box.append(list);
    const status = Object.assign(document.createElement('div'), { className: 'xz-sr-only' });
    status.setAttribute('aria-live', 'polite');
    box.append(status);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', list.id);
    input.autocomplete = 'off';

    let options = [];
    let active = -1;
    let pending;
    let timer;

    const setActive = (i) => {
      active = i;
      $$('[role="option"]', list).forEach((el, n) => el.classList.toggle('is-active', n === i));
      const el = list.querySelectorAll('[role="option"]')[i];
      if (el) {
        input.setAttribute('aria-activedescendant', el.id);
        if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
        else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
      } else input.removeAttribute('aria-activedescendant');
    };
    const close = () => {
      if (list.hidden) return;
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
      releaseFloating(list);
    };
    const show = () => {
      openFloating({ panel: list, trigger: group, close, follow: () => place(list, group) });
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      list.style.width = `${Math.max(group.getBoundingClientRect().width, 240)}px`;
      place(list, group);
    };
    const row = (cls, html) => `<li role="presentation" class="${cls}">${html}</li>`;
    const render = (items, query, note) => {
      options = items;
      let html = '';
      let last = null;
      items.forEach((o, i) => {
        if (o.group !== last) {
          last = o.group;
          if (o.group) html += row('xz-search__group', esc(o.group));
        }
        const lead = o.kind === 'recent' ? icon('history', { size: 'sm' }) : o.kind === 'query' ? icon('search', { size: 'sm' }) : '';
        html += `<li role="option" id="${list.id}-${i}" class="xz-search__option" data-index="${i}">${lead}<span class="xz-search__label">${o.kind === 'query' ? `Search for “${esc(query)}”` : mark(o.label, query)}</span>${o.meta ? `<span class="xz-search__meta">${esc(o.meta)}</span>` : ''}</li>`;
      });
      if (note) html += row('xz-search__note', esc(note));
      list.innerHTML = html;
      active = -1;
      if (!html) return close();
      show();
      const n = items.filter((o) => o.kind !== 'query').length;
      status.textContent = query ? (n ? `${n} suggestion${n === 1 ? '' : 's'}` : 'No suggestions') : '';
    };

    const local = (q) => {
      const needle = q.toLowerCase();
      return source.filter((o) => (o.label + ' ' + o.meta + ' ' + o.keywords).toLowerCase().includes(needle)).slice(0, max);
    };
    const update = () => {
      const q = input.value.trim();
      clearTimeout(timer);
      pending?.abort();
      if (!q) {
        const recent = recentName ? readRecent(recentName).map((label) => ({ label, group: 'Recent searches', kind: 'recent' })) : [];
        return recent.length ? render(recent, '') : close();
      }
      // The last option always searches for exactly what was typed.
      const withQuery = (items) => [...items, { label: q, group: '', kind: 'query' }];
      if (!url) return render(withQuery(local(q)), q);
      render(withQuery(local(q)), q, 'Searching…');
      timer = setTimeout(async () => {
        pending = new AbortController();
        try {
          const res = await fetch(url.includes('{q}') ? url.replace('{q}', encodeURIComponent(q)) : url + encodeURIComponent(q), { signal: pending.signal, headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(res.statusText);
          const data = await res.json();
          if (input.value.trim() !== q) return;
          render(withQuery([...local(q), ...data.map((d) => ({ label: String(d.label), group: d.group || '', href: d.href || '', meta: d.meta || '' }))].slice(0, max)), q);
        } catch (err) {
          if (err.name !== 'AbortError') render(withQuery(local(q)), q, 'Could not load more suggestions.');
        }
      }, 200);
    };

    const submit = (query) => {
      input.value = query;
      saveRecent(recentName, query);
      close();
      // A form fires xz:search from its submit handler below.
      const form = box.tagName === 'FORM' ? box : null;
      if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
      else fire(box, 'xz:search', { query }, true);
    };
    const choose = (o) => {
      if (!o) return;
      if (o.kind === 'recent' || o.kind === 'query') return submit(o.kind === 'query' ? input.value.trim() : o.label);
      saveRecent(recentName, o.label);
      close();
      if (!fire(box, 'xz:select', { item: o }, true)) return;
      if (o.href) location.href = o.href;
      else submit(o.label);
    };

    input.addEventListener('input', update);
    input.addEventListener('focus', () => !input.value.trim() && update());
    input.addEventListener('keydown', (e) => {
      const count = options.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (list.hidden) return update();
        if (!count) return;
        setActive(e.key === 'ArrowDown' ? (active + 1) % count : (active - 1 + count) % count);
      } else if (e.key === 'Enter') {
        if (!list.hidden && active >= 0) {
          e.preventDefault();
          choose(options[active]);
        } else if (box.tagName !== 'FORM') {
          e.preventDefault();
          submit(input.value.trim());
        }
      } else if (e.key === 'Escape') {
        if (!list.hidden) {
          e.preventDefault();
          e.stopPropagation();
          close();
        } else if (input.value) {
          e.preventDefault();
          input.value = '';
        }
      }
    });
    // Keep focus in the field while an option is pressed.
    list.addEventListener('pointerdown', (e) => e.preventDefault());
    list.addEventListener('click', (e) => {
      const el = e.target.closest('[role="option"]');
      if (el) choose(options[Number(el.dataset.index)]);
    });
    input.addEventListener('blur', () => setTimeout(() => document.activeElement !== input && close(), 0));
    if (box.tagName === 'FORM') {
      box.addEventListener('submit', (e) => {
        const query = input.value.trim();
        saveRecent(recentName, query);
        close();
        if (!fire(box, 'xz:search', { query }, true)) e.preventDefault();
      });
    }

    const key = box.getAttribute('data-xz-shortcut');
    if (key) {
      document.addEventListener('keydown', (e) => {
        if (e.key !== key || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target;
        if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
        e.preventDefault();
        input.focus();
      });
    }
  }
}

// ---------- bottom sheet ----------
function initSheets(root) {
  for (const sheet of $$('dialog.xz-sheet', root)) {
    if (ready(sheet)) continue;
    const grip = sheet.querySelector('.xz-sheet__handle');
    const zones = [grip, sheet.querySelector('.xz-sheet__header')].filter(Boolean);
    let startY = null;
    let startT = 0;
    let dy = 0;
    let dragged = false;
    const settle = () => {
      sheet.style.transform = '';
      sheet.style.transition = '';
      sheet.classList.remove('is-dragging');
    };
    sheet.addEventListener('close', settle);
    for (const zone of zones) {
      zone.addEventListener('pointerdown', (e) => {
        const control = e.target.closest('button, a, input, select, textarea');
        if (e.button !== 0 || (control && control !== grip)) return;
        startY = e.clientY;
        startT = performance.now();
        dy = 0;
        dragged = false;
        try {
          zone.setPointerCapture(e.pointerId);
        } catch {}
        sheet.classList.add('is-dragging');
      });
      zone.addEventListener('pointermove', (e) => {
        if (startY === null) return;
        dy = Math.max(0, e.clientY - startY);
        if (dy > 4) dragged = true;
        sheet.style.transform = `translateY(${dy}px)`;
      });
      const end = () => {
        if (startY === null) return;
        startY = null;
        const fast = dy / Math.max(1, performance.now() - startT) > 0.5;
        if (dy > Math.min(120, sheet.offsetHeight * 0.25) || (fast && dy > 24)) {
          sheet.style.transition = reduced() ? 'none' : 'transform var(--xz-duration-base) var(--xz-ease-in)';
          sheet.style.transform = 'translateY(100%)';
          setTimeout(() => sheet.close(), reduced() ? 0 : 200);
        } else {
          sheet.style.transition = 'transform var(--xz-duration-base) var(--xz-ease-out)';
          sheet.style.transform = '';
          setTimeout(settle, 200);
        }
      };
      zone.addEventListener('pointerup', end);
      zone.addEventListener('pointercancel', end);
    }
    // The handle is also a close button for keyboard and screen reader users.
    // A drag that snaps back is not a click.
    if (grip && grip.tagName === 'BUTTON') grip.addEventListener('click', () => (dragged ? (dragged = false) : sheet.close()));
  }
}

// ---------- wizard ----------
function initWizards(root) {
  for (const form of $$('[data-xz-wizard]', root)) {
    if (ready(form)) continue;
    const panels = $$('.xz-wizard__panel', form);
    const stepItems = $$('.xz-wizard__steps > li', form);
    if (!panels.length) continue;
    if (form.tagName === 'FORM') form.noValidate = true;
    const back = form.querySelector('[data-xz-wizard-back]');
    const next = form.querySelector('[data-xz-wizard-next]');
    const done = form.querySelector('[data-xz-wizard-submit]');
    const count = form.querySelector('.xz-wizard__count');
    let at = 0;
    let furthest = 0;

    // Each step label becomes a button, so finished steps can be revisited.
    const stepButtons = stepItems.map((li, i) => {
      const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'xz-wizard__step-btn' });
      btn.innerHTML = `<span class="xz-wizard__marker" aria-hidden="true">${i + 1}</span><span class="xz-wizard__label">${li.innerHTML}</span>`;
      li.replaceChildren(btn);
      btn.addEventListener('click', () => go(i));
      return btn;
    });
    const fields = (panel) => $$('input, select, textarea', panel).filter((f) => f.willValidate);
    const check = (panel) => {
      const bad = fields(panel).filter((f) => !validateField(f));
      if (bad[0]) (bad[0].hidden ? panel.querySelector('[role="combobox"]') || bad[0] : bad[0]).focus();
      return !bad.length;
    };
    const show = (i, focus = true) => {
      const from = at;
      at = i;
      furthest = Math.max(furthest, i);
      panels.forEach((p, n) => (p.hidden = n !== i));
      stepItems.forEach((li, n) => {
        // A step is done once the person has moved past it.
        const isDone = n !== i && n < furthest;
        li.classList.toggle('is-done', isDone);
        li.classList.toggle('is-current', n === i);
        const b = stepButtons[n];
        if (n === i) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
        b.disabled = n > furthest;
        const state = n === i ? 'current step' : isDone ? 'done' : n <= furthest ? 'visited' : 'not started';
        b.setAttribute('aria-label', `Step ${n + 1}: ${b.querySelector('.xz-wizard__label').textContent.trim()}, ${state}`);
      });
      if (back) back.hidden = i === 0;
      if (next) next.hidden = i === panels.length - 1;
      if (done) done.hidden = i !== panels.length - 1;
      if (count) count.textContent = `Step ${i + 1} of ${panels.length}`;
      form.style.setProperty('--xz-wizard-progress', `${(i / Math.max(1, panels.length - 1)) * 100}%`);
      if (focus) {
        const title = panels[i].querySelector('.xz-wizard__title, legend, h2, h3') || panels[i];
        title.tabIndex = -1;
        title.focus({ preventScroll: false });
      }
      if (from !== i) fire(form, 'xz:step', { step: i, from });
    };
    const go = (i) => {
      if (i === at || i < 0 || i >= panels.length) return;
      // Going forward checks every step on the way.
      if (i > at) for (let n = at; n < i; n++) if (!check(panels[n])) return show(n, false);
      show(i);
    };
    back?.addEventListener('click', () => go(at - 1));
    next?.addEventListener('click', () => go(at + 1));
    // Enter in a field moves to the next step instead of sending the form early.
    form.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || at === panels.length - 1) return;
      const t = e.target;
      if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON' || t.getAttribute('role') === 'combobox' || t.isContentEditable) return;
      if (t.tagName === 'INPUT') {
        e.preventDefault();
        go(at + 1);
      }
    });
    // Capture phase, so the steps are checked before any other submit listener on the form runs.
    form.addEventListener('submit', (e) => {
      for (let n = 0; n < panels.length; n++) {
        if (!fields(panels[n]).every((f) => f.checkValidity())) {
          e.preventDefault();
          e.stopImmediatePropagation();
          show(n, false);
          check(panels[n]);
          return;
        }
      }
    }, true);
    form.xzWizard = { go, get step() { return at; } };
    show(0, false);
  }
}

// ---------- carousel ----------
function initCarousels(root) {
  for (const car of $$('[data-xz-carousel]', root)) {
    if (ready(car)) continue;
    const track = car.querySelector('.xz-carousel__track');
    if (!track) continue;
    const slides = Array.from(track.children);
    car.setAttribute('aria-roledescription', 'carousel');
    track.tabIndex = 0;
    track.setAttribute('aria-label', 'Slides. Use the arrow keys to scroll.');
    slides.forEach((s, i) => {
      s.setAttribute('role', 'group');
      s.setAttribute('aria-roledescription', 'slide');
      s.setAttribute('aria-label', `${i + 1} of ${slides.length}`);
    });
    const controls = Object.assign(document.createElement('div'), { className: 'xz-carousel__controls' });
    controls.innerHTML = `<button type="button" class="xz-btn xz-btn--icon xz-btn--sm xz-carousel__prev" aria-label="Previous slide">${icon('chevron-left', { size: 'sm' })}</button><div class="xz-carousel__dots">${slides.map((_, i) => `<button type="button" class="xz-carousel__dot" aria-label="Go to slide ${i + 1}"></button>`).join('')}</div><button type="button" class="xz-btn xz-btn--icon xz-btn--sm xz-carousel__next" aria-label="Next slide">${icon('chevron-right', { size: 'sm' })}</button>`;
    car.append(controls);
    const prev = controls.querySelector('.xz-carousel__prev');
    const nextBtn = controls.querySelector('.xz-carousel__next');
    const dots = $$('.xz-carousel__dot', controls);
    const step = () => (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth);
    const index = () => Math.round(track.scrollLeft / Math.max(1, step()));
    const to = (i) => track.scrollTo({ left: slides[Math.max(0, Math.min(i, slides.length - 1))].offsetLeft - slides[0].offsetLeft, behavior: reduced() ? 'auto' : 'smooth' });
    const sync = () => {
      const max = track.scrollWidth - track.clientWidth;
      controls.hidden = max <= 1;
      prev.disabled = track.scrollLeft <= 1;
      nextBtn.disabled = track.scrollLeft >= max - 1;
      const at = track.scrollLeft >= max - 1 ? slides.length - 1 : index();
      // The last few slides can share one scroll position; mark the furthest one reached.
      dots.forEach((d, i) => (i === at ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
    };
    prev.addEventListener('click', () => to(index() - 1));
    nextBtn.addEventListener('click', () => to(index() + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => to(i)));
    let raf;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    });
    new ResizeObserver(sync).observe(track);
    car.xzCarousel = { to, get index() { return index(); } };
    sync();
  }
}

// ---------- lightbox ----------
let box;
function lightbox() {
  if (box) return box;
  const dlg = document.createElement('dialog');
  dlg.className = 'xz-lightbox';
  dlg.setAttribute('aria-label', 'Image viewer');
  dlg.innerHTML = `<div class="xz-lightbox__bar"><span class="xz-lightbox__count" aria-live="polite"></span><button type="button" class="xz-lightbox__btn" data-xz-close aria-label="Close">${icon('x')}</button></div>
<figure class="xz-lightbox__figure"><img class="xz-lightbox__img" alt=""><figcaption class="xz-lightbox__caption"></figcaption></figure>
<button type="button" class="xz-lightbox__btn xz-lightbox__nav xz-lightbox__nav--prev" aria-label="Previous image">${icon('chevron-left')}</button>
<button type="button" class="xz-lightbox__btn xz-lightbox__nav xz-lightbox__nav--next" aria-label="Next image">${icon('chevron-right')}</button>`;
  document.body.append(dlg);
  const img = dlg.querySelector('.xz-lightbox__img');
  const cap = dlg.querySelector('.xz-lightbox__caption');
  const count = dlg.querySelector('.xz-lightbox__count');
  const prev = dlg.querySelector('.xz-lightbox__nav--prev');
  const next = dlg.querySelector('.xz-lightbox__nav--next');
  let items = [];
  let at = 0;
  const show = (i) => {
    at = (i + items.length) % items.length;
    const it = items[at];
    img.src = it.href;
    img.alt = it.alt;
    cap.textContent = it.caption;
    cap.hidden = !it.caption;
    count.textContent = `${at + 1} of ${items.length}`;
    prev.hidden = next.hidden = items.length < 2;
  };
  prev.addEventListener('click', () => show(at - 1));
  next.addEventListener('click', () => show(at + 1));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(at - 1);
    if (e.key === 'ArrowRight') show(at + 1);
  });
  // A click on the empty space around the picture closes the viewer.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.classList.contains('xz-lightbox__figure')) dlg.close();
  });
  let sx = null;
  dlg.addEventListener('pointerdown', (e) => (sx = e.pointerType === 'mouse' ? null : e.clientX));
  dlg.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
  });
  let opener = null;
  dlg.addEventListener('close', () => {
    img.removeAttribute('src');
    opener?.focus();
  });
  box = {
    open(list, i, from) {
      items = list;
      opener = from || null;
      show(i);
      dlg.showModal();
      next.hidden ? dlg.querySelector('[data-xz-close]').focus() : next.focus();
    },
  };
  return box;
}
function initLightboxes(root) {
  for (const gallery of $$('[data-xz-lightbox]', root)) {
    if (ready(gallery)) continue;
    gallery.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || !gallery.contains(a) || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      const links = $$('a[href]', gallery);
      const items = links.map((l) => ({ href: l.href, alt: l.querySelector('img')?.alt || '', caption: l.dataset.caption || '' }));
      lightbox().open(items, links.indexOf(a), a);
    });
  }
}

// ---------- video and audio player ----------
const clock = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  s = Math.floor(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};
const spoken = (s) => {
  s = Math.floor(s || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return [m && `${m} minute${m === 1 ? '' : 's'}`, `${sec} second${sec === 1 ? '' : 's'}`].filter(Boolean).join(' ');
};
const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

function initPlayers(root) {
  for (const player of $$('[data-xz-player]', root)) {
    if (ready(player)) continue;
    const media = player.querySelector('video, audio');
    if (!media) continue;
    const video = media.tagName === 'VIDEO';
    media.controls = false;
    media.removeAttribute('controls');
    player.classList.add('xz-player', video ? 'xz-player--video' : 'xz-player--audio');
    if (!player.hasAttribute('role')) player.setAttribute('role', 'group');
    if (!player.hasAttribute('aria-label')) player.setAttribute('aria-label', player.getAttribute('data-xz-title') || (video ? 'Video player' : 'Audio player'));
    const track = media.querySelector('track[kind="captions"], track[kind="subtitles"]');

    const bar = Object.assign(document.createElement('div'), { className: 'xz-player__bar' });
    bar.innerHTML = `
      <button type="button" class="xz-player__btn" data-act="play" aria-label="Play">${icon('play', { size: 'sm' })}</button>
      <span class="xz-player__time"><span data-now>0:00</span><span aria-hidden="true"> / </span><span data-total>0:00</span></span>
      <input class="xz-slider xz-player__seek" type="range" min="0" max="0" step="0.1" value="0" aria-label="Seek">
      <button type="button" class="xz-player__btn" data-act="mute" aria-label="Mute">${icon('volume-2', { size: 'sm' })}</button>
      <input class="xz-slider xz-player__volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume">
      <button type="button" class="xz-player__btn xz-player__speed" data-act="speed" aria-label="Playback speed, 1 times">1×</button>
      ${track ? `<button type="button" class="xz-player__btn" data-act="captions" aria-label="Captions" aria-pressed="false">CC</button>` : ''}
      ${video ? `<button type="button" class="xz-player__btn" data-act="full" aria-label="Full screen">${icon('maximize', { size: 'sm' })}</button>` : ''}`;
    player.append(bar);
    let big;
    if (video) {
      big = Object.assign(document.createElement('button'), { type: 'button', className: 'xz-player__big' });
      big.setAttribute('aria-label', 'Play');
      big.innerHTML = icon('play');
      player.append(big);
      media.addEventListener('click', () => (media.paused ? media.play() : media.pause()));
    }
    const q = (s) => bar.querySelector(s);
    const playBtn = q('[data-act="play"]');
    const muteBtn = q('[data-act="mute"]');
    const speedBtn = q('[data-act="speed"]');
    const capBtn = q('[data-act="captions"]');
    const fullBtn = q('[data-act="full"]');
    const seek = q('.xz-player__seek');
    const vol = q('.xz-player__volume');
    const now = q('[data-now]');
    const total = q('[data-total]');
    const fill = (input) => input.style.setProperty('--_fill', `${input.max > 0 ? (input.value / input.max) * 100 : 0}%`);
    let seeking = false;

    const resumeKey = player.hasAttribute('data-xz-resume') ? `xz-player:${player.getAttribute('data-xz-resume') || media.currentSrc || media.src}` : null;
    let lastSave = 0;

    const syncPlay = () => {
      const paused = media.paused;
      playBtn.innerHTML = icon(paused ? 'play' : 'pause', { size: 'sm' });
      playBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
      player.classList.toggle('is-playing', !paused);
      if (big) big.hidden = !paused;
    };
    const syncTime = () => {
      if (!seeking) seek.value = media.currentTime;
      now.textContent = clock(media.currentTime);
      seek.setAttribute('aria-valuetext', `${spoken(media.currentTime)} of ${spoken(media.duration)}`);
      fill(seek);
      if (resumeKey && Date.now() - lastSave > 4000) {
        lastSave = Date.now();
        try {
          localStorage.setItem(resumeKey, String(media.ended ? 0 : media.currentTime));
        } catch {}
      }
    };
    const syncVolume = () => {
      const muted = media.muted || media.volume === 0;
      muteBtn.innerHTML = icon(muted ? 'volume-x' : 'volume-2', { size: 'sm' });
      muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
      vol.value = media.muted ? 0 : media.volume;
      fill(vol);
    };
    let probing = false;
    const meta = () => {
      // Files recorded in a browser often leave out their length. Seeking far ahead makes the browser work it out.
      if (media.duration === Infinity) {
        if (!probing) {
          probing = true;
          media.currentTime = 1e7;
        }
        return;
      }
      if (probing) {
        probing = false;
        media.currentTime = 0;
      }
      seek.max = Number.isFinite(media.duration) ? media.duration : 0;
      total.textContent = clock(media.duration);
      if (resumeKey) {
        try {
          const t = Number(localStorage.getItem(resumeKey));
          if (t > 1 && t < media.duration - 2) media.currentTime = t;
        } catch {}
      }
      syncTime();
    };
    const fullscreen = () => {
      if (document.fullscreenElement) return document.exitFullscreen();
      if (player.requestFullscreen) player.requestFullscreen();
      else media.webkitEnterFullscreen?.();
    };

    media.addEventListener('play', syncPlay);
    media.addEventListener('pause', syncPlay);
    media.addEventListener('ended', syncPlay);
    media.addEventListener('timeupdate', syncTime);
    media.addEventListener('loadedmetadata', meta);
    media.addEventListener('durationchange', meta);
    media.addEventListener('volumechange', syncVolume);
    media.addEventListener('waiting', () => player.classList.add('is-loading'));
    for (const t of ['playing', 'canplay', 'pause']) media.addEventListener(t, () => player.classList.remove('is-loading'));
    if (media.readyState >= 1) meta();

    seek.addEventListener('input', () => {
      seeking = true;
      now.textContent = clock(seek.value);
      fill(seek);
    });
    seek.addEventListener('change', () => {
      media.currentTime = Number(seek.value);
      seeking = false;
    });
    vol.addEventListener('input', () => {
      media.volume = Number(vol.value);
      media.muted = media.volume === 0;
    });
    bar.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'play') media.paused ? media.play() : media.pause();
      if (act === 'mute') {
        if (media.muted || media.volume === 0) {
          media.muted = false;
          if (media.volume === 0) media.volume = 0.6;
        } else media.muted = true;
      }
      if (act === 'speed') {
        const nextRate = SPEEDS[(SPEEDS.indexOf(media.playbackRate) + 1) % SPEEDS.length] || 1;
        media.playbackRate = nextRate;
        speedBtn.textContent = `${nextRate}×`;
        speedBtn.setAttribute('aria-label', `Playback speed, ${nextRate} times`);
      }
      if (act === 'captions' && track) {
        const on = track.track.mode !== 'showing';
        track.track.mode = on ? 'showing' : 'hidden';
        capBtn.setAttribute('aria-pressed', String(on));
      }
      if (act === 'full') fullscreen();
    });
    big?.addEventListener('click', () => media.play());
    document.addEventListener('fullscreenchange', () => {
      if (!fullBtn) return;
      const on = document.fullscreenElement === player;
      fullBtn.innerHTML = icon(on ? 'minimize' : 'maximize', { size: 'sm' });
      fullBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
    });
    // Shortcuts while focus is anywhere in the player.
    player.addEventListener('keydown', (e) => {
      const t = e.target;
      const onButton = t.tagName === 'BUTTON';
      const onRange = t.type === 'range';
      if ((e.key === ' ' || e.key === 'k') && !onButton) {
        e.preventDefault();
        media.paused ? media.play() : media.pause();
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !onRange) {
        e.preventDefault();
        media.currentTime = Math.max(0, Math.min(media.duration || 0, media.currentTime + (e.key === 'ArrowLeft' ? -5 : 5)));
      } else if (e.key === 'm') muteBtn.click();
      else if (e.key === 'f' && video) fullscreen();
    });
    if (track) track.track.mode = 'hidden';
    syncPlay();
    syncVolume();
  }
}

// ---------- pricing period switch ----------
function initPricing(root) {
  for (const box of $$('[data-xz-pricing]', root)) {
    if (ready(box)) continue;
    const apply = (value) => {
      for (const el of $$(`[data-${value}]`, box)) el.textContent = el.getAttribute(`data-${value}`);
      fire(box, 'xz:period', { period: value });
    };
    box.addEventListener('change', (e) => {
      if (e.target.matches('input[type="radio"]')) apply(e.target.value);
    });
    const checked = box.querySelector('input[type="radio"]:checked');
    if (checked) apply(checked.value);
  }
}

export function initComponents(root, helpers = {}) {
  if (helpers.icon) icon = helpers.icon;
  if (helpers.validateField) validateField = helpers.validateField;
  bindGlobal();
  initPopovers(root);
  initNotifications(root);
  initMegaMenus(root);
  initContextMenus(root);
  initSearches(root);
  initSheets(root);
  initWizards(root);
  initCarousels(root);
  initLightboxes(root);
  initPlayers(root);
  initPricing(root);
}
