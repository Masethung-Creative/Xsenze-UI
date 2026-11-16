// Xsenze UI Kit behaviours. No dependencies.
// Everything is wired through data attributes and starts by itself on page load.
// Call Xsenze.init(element) after you add markup to the page later.
import icons from './icons.generated.js';
import * as format from './format.js';
import { initAdvancedForms, sanitize } from './forms-advanced.js';
import { initComponents } from './components.js';
import { initBlocks, motion, copy } from '../blocks/index.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
let uid = 0;
const id = (prefix) => `xz-${prefix}-${++uid}`;

// ---------- icons ----------
function icon(name, { size, label } = {}) {
  const body = icons[name];
  if (!body) return '';
  const cls = 'xz-icon' + (size ? ` xz-icon--${size}` : '');
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="${cls}" viewBox="0 0 24 24" ${a11y} focusable="false">${body}</svg>`;
}

function initIcons(root) {
  for (const el of $$('[data-xz-icon]', root)) {
    const name = el.getAttribute('data-xz-icon');
    const html = icon(name, { size: el.getAttribute('data-size'), label: el.getAttribute('aria-label') });
    if (!html) {
      console.warn(`[Xsenze] Unknown icon "${name}"`);
      continue;
    }
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const svg = tpl.content.firstChild;
    for (const c of el.classList) svg.classList.add(c);
    el.replaceWith(svg);
  }
}

// ---------- theme ----------
const theme = {
  get: () => document.documentElement.getAttribute('data-theme') || 'light',
  set(name, { persist = true } = {}) {
    document.documentElement.setAttribute('data-theme', name);
    if (persist) {
      try {
        localStorage.setItem('xz-theme', name);
      } catch {}
    }
    theme.sync();
    document.dispatchEvent(new CustomEvent('xz:theme', { detail: { theme: name } }));
  },
  /** Toggle buttons show a sun in the dark theme and a moon in the light theme. */
  sync() {
    const dark = theme.get() === 'dark';
    for (const btn of $$('[data-xz-theme-toggle]')) {
      btn.setAttribute('aria-pressed', String(dark));
      const old = $('svg.xz-icon, [data-xz-icon]', btn);
      if (old) old.outerHTML = icon(dark ? 'sun' : 'moon');
    }
  },
  toggle() {
    theme.set(theme.get() === 'dark' ? 'light' : 'dark');
  },
  /** Use the saved theme, else the one in the markup, else the system setting when `data-theme="auto"`. */
  restore() {
    let saved = null;
    try {
      saved = localStorage.getItem('xz-theme');
    } catch {}
    const attr = document.documentElement.getAttribute('data-theme');
    if (saved) theme.set(saved, { persist: false });
    else if (attr === 'auto') theme.set(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', { persist: false });
  },
};

// ---------- modal and drawer ----------
function openDialog(target) {
  const el = typeof target === 'string' ? $(target) : target;
  if (el && !el.open) el.showModal();
  return el;
}
function closeDialog(target, value) {
  const el = typeof target === 'string' ? $(target) : target;
  if (el && el.open) el.close(value);
}

// ---------- toast ----------
function toast(options) {
  const o = typeof options === 'string' ? { message: options } : options;
  const { title, message, variant, duration = 5000, action } = o;
  let region = $('.xz-toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'xz-toast-region';
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', 'Notifications');
    document.body.append(region);
  }
  const el = document.createElement('div');
  el.className = 'xz-toast' + (variant ? ` xz-toast--${variant}` : '');
  el.setAttribute('role', variant === 'danger' ? 'alert' : 'status');
  const body = document.createElement('div');
  body.className = 'xz-toast__body';
  if (title) body.append(Object.assign(document.createElement('div'), { className: 'xz-toast__title', textContent: title }));
  if (message) body.append(Object.assign(document.createElement('div'), { className: 'xz-toast__text', textContent: message }));
  el.append(body);
  const dismiss = () => {
    if (!el.isConnected) return;
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 200);
  };
  if (action) {
    const btn = Object.assign(document.createElement('button'), { className: 'xz-toast__action', type: 'button', textContent: action.label });
    btn.addEventListener('click', () => {
      action.onClick?.();
      dismiss();
    });
    el.append(btn);
  }
  const close = Object.assign(document.createElement('button'), { className: 'xz-toast__close', type: 'button', textContent: '✕' });
  close.setAttribute('aria-label', 'Dismiss');
  close.addEventListener('click', dismiss);
  el.append(close);
  region.append(el);
  // Keep the toast while the pointer or focus is on it.
  let timer = duration > 0 ? setTimeout(dismiss, duration) : null;
  const hold = () => clearTimeout(timer);
  const resume = () => duration > 0 && (timer = setTimeout(dismiss, duration));
  el.addEventListener('mouseenter', hold);
  el.addEventListener('focusin', hold);
  el.addEventListener('mouseleave', resume);
  el.addEventListener('focusout', resume);
  return { el, dismiss };
}

// ---------- tabs ----------
function initTabs(root) {
  for (const tabs of $$('[data-xz-tabs]', root)) {
    if (tabs.xzReady) continue;
    tabs.xzReady = true;
    const list = $('.xz-tabs__list', tabs);
    const tabEls = $$('.xz-tabs__tab', list);
    const panels = $$(':scope > .xz-tabs__panel', tabs);
    list.setAttribute('role', 'tablist');
    const select = (tab, focus) => {
      tabEls.forEach((t, i) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (panels[i]) panels[i].hidden = !on;
      });
      if (focus) tab.focus();
      tabs.dispatchEvent(new CustomEvent('xz:tab', { bubbles: true, detail: { index: tabEls.indexOf(tab) } }));
    };
    tabEls.forEach((t, i) => {
      t.setAttribute('role', 'tab');
      t.type = 'button';
      t.id ||= id('tab');
      if (panels[i]) {
        panels[i].id ||= id('panel');
        panels[i].setAttribute('role', 'tabpanel');
        panels[i].setAttribute('aria-labelledby', t.id);
        panels[i].tabIndex = 0;
        t.setAttribute('aria-controls', panels[i].id);
      }
      t.addEventListener('click', () => select(t));
    });
    list.addEventListener('keydown', (e) => {
      const enabled = tabEls.filter((t) => !t.disabled);
      const i = enabled.indexOf(document.activeElement);
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: enabled.length - 1 }[e.key];
      if (next === undefined || i < 0) return;
      e.preventDefault();
      select(enabled[(next + enabled.length) % enabled.length], true);
    });
    select(tabEls.find((t) => t.getAttribute('aria-selected') === 'true') || tabEls[0]);
  }
}

// ---------- dropdown menu ----------
function closeMenus(except) {
  for (const m of $$('[data-xz-menu].is-open')) {
    if (m === except) continue;
    m.classList.remove('is-open');
    $('.xz-menu__list', m).hidden = true;
    m.xzTrigger.setAttribute('aria-expanded', 'false');
  }
}
function initMenus(root) {
  for (const menu of $$('[data-xz-menu]', root)) {
    if (menu.xzReady) continue;
    menu.xzReady = true;
    const list = $('.xz-menu__list', menu);
    const trigger = $(':scope > button, :scope > [data-xz-menu-trigger]', menu);
    menu.xzTrigger = trigger;
    list.hidden = true;
    list.id ||= id('menu');
    list.setAttribute('role', 'menu');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', list.id);
    const items = () => $$('.xz-menu__item:not(:disabled)', list);
    items().forEach((i) => {
      i.setAttribute('role', 'menuitem');
      if (i.parentElement.tagName === 'LI') i.parentElement.setAttribute('role', 'none');
      i.tabIndex = -1;
    });
    const open = (focusLast) => {
      closeMenus(menu);
      menu.classList.add('is-open');
      list.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      // Pin to the viewport: align to the trigger, flip up when there is no room below.
      list.classList.add('is-fixed');
      const t = trigger.getBoundingClientRect();
      const l = list.getBoundingClientRect();
      let left = menu.classList.contains('xz-menu--end') ? t.right - l.width : t.left;
      left = Math.min(Math.max(8, left), innerWidth - l.width - 8);
      let top = t.bottom + 4;
      if (top + l.height > innerHeight - 8 && t.top - l.height - 4 > 8) top = t.top - l.height - 4;
      list.style.left = `${left}px`;
      list.style.top = `${top}px`;
      const all = items();
      (focusLast ? all[all.length - 1] : all[0])?.focus();
    };
    const close = (refocus) => {
      closeMenus();
      if (refocus) trigger.focus();
    };
    trigger.addEventListener('click', () => (menu.classList.contains('is-open') ? close() : open()));
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        open(e.key === 'ArrowUp');
      }
    });
    list.addEventListener('keydown', (e) => {
      const all = items();
      const i = all.indexOf(document.activeElement);
      if (e.key === 'Escape') return close(true);
      if (e.key === 'Tab') return close();
      const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      all[(next + all.length) % all.length].focus();
    });
    list.addEventListener('click', (e) => {
      if (e.target.closest('.xz-menu__item')) close(true);
    });
  }
}

// ---------- tooltip ----------
let tip;
function showTip(el) {
  const text = el.getAttribute('data-xz-tooltip');
  if (!text) return;
  hideTip();
  tip = document.createElement('div');
  tip.className = 'xz-tooltip';
  tip.id = 'xz-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.textContent = text;
  document.body.append(tip);
  el.setAttribute('aria-describedby', tip.id);
  tip.xzFor = el;
  const r = el.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  const place = el.getAttribute('data-xz-tooltip-place') || 'top';
  let top = place === 'bottom' ? r.bottom + 8 : r.top - t.height - 8;
  if (top < 4) top = r.bottom + 8;
  if (top + t.height > innerHeight - 4) top = r.top - t.height - 8;
  const left = Math.min(Math.max(4, r.left + r.width / 2 - t.width / 2), innerWidth - t.width - 4);
  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
  requestAnimationFrame(() => tip?.classList.add('is-open'));
}
function hideTip() {
  if (!tip) return;
  tip.xzFor.removeAttribute('aria-describedby');
  tip.remove();
  tip = null;
}

// ---------- searchable select (combobox) ----------
function initComboboxes(root) {
  for (const box of $$('[data-xz-combobox]', root)) {
    if (box.xzReady) continue;
    const select = $('select', box);
    if (!select) continue;
    box.xzReady = true;
    box.classList.add('xz-combobox');
    const options = $$('option', select).filter((o) => o.value !== '').map((o) => ({ value: o.value, label: o.textContent.trim() }));
    const placeholder = $('option[value=""]', select)?.textContent.trim() || box.getAttribute('data-placeholder') || 'Search';
    const input = document.createElement('input');
    const list = document.createElement('ul');
    list.className = 'xz-combobox__list';
    list.id = id('listbox');
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    input.className = select.className.replace('xz-select', 'xz-input xz-select');
    input.type = 'text';
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', list.id);
    if (select.id) {
      input.id = select.id;
      select.removeAttribute('id');
    }
    for (const a of ['aria-describedby', 'aria-invalid', 'aria-label']) if (select.hasAttribute(a)) input.setAttribute(a, select.getAttribute(a));
    input.disabled = select.disabled;
    input.value = select.selectedOptions[0]?.value ? select.selectedOptions[0].textContent.trim() : '';
    select.hidden = true;
    select.tabIndex = -1;
    box.append(input, list);

    let active = -1;
    let shown = [];
    const render = (query) => {
      const q = query.trim().toLowerCase();
      shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
      list.innerHTML = '';
      if (!shown.length) {
        const empty = Object.assign(document.createElement('li'), { className: 'xz-combobox__empty', textContent: box.getAttribute('data-empty') || 'No matches. Try a different search.' });
        empty.setAttribute('role', 'presentation');
        list.append(empty);
      }
      shown.forEach((o, i) => {
        const li = Object.assign(document.createElement('li'), { className: 'xz-combobox__option', textContent: o.label, id: `${list.id}-${i}` });
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(o.value === select.value));
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          choose(o);
        });
        list.append(li);
      });
      setActive(shown.length ? Math.max(0, shown.findIndex((o) => o.value === select.value)) : -1);
    };
    const setActive = (i) => {
      active = i;
      $$('.xz-combobox__option', list).forEach((li, n) => li.classList.toggle('is-active', n === i));
      if (i >= 0) {
        input.setAttribute('aria-activedescendant', `${list.id}-${i}`);
        list.children[i]?.scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    };
    const open = (query = '') => {
      render(query);
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    };
    const choose = (o) => {
      select.value = o.value;
      input.value = o.label;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    };
    input.addEventListener('focus', () => input.select());
    input.addEventListener('click', () => (list.hidden ? open() : close()));
    input.addEventListener('input', () => open(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (list.hidden) return open();
        if (shown.length) setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length);
      } else if (e.key === 'Enter' && !list.hidden) {
        e.preventDefault();
        if (shown[active]) choose(shown[active]);
      } else if (e.key === 'Escape' && !list.hidden) {
        e.preventDefault();
        close();
      }
    });
    input.addEventListener('blur', () => {
      close();
      // Typed text that is not an option falls back to the current selection.
      const current = options.find((o) => o.value === select.value);
      if (!input.value.trim()) {
        select.value = '';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      } else input.value = current ? current.label : '';
    });
  }
}

// ---------- table: sort, search, pagination ----------
function initTables(root) {
  for (const table of $$('table[data-xz-table]', root)) {
    if (table.xzReady) continue;
    table.xzReady = true;
    const tbody = table.tBodies[0];
    const rows = Array.from(tbody.rows);
    const heads = Array.from(table.tHead.rows[0].cells);
    const pageSize = Number(table.getAttribute('data-xz-page-size')) || 0;
    const pager = $(table.getAttribute('data-xz-pagination') || null) || null;
    const search = $(table.getAttribute('data-xz-search') || null) || null;
    const empty = $(table.getAttribute('data-xz-empty') || null) || null;
    const state = { page: 1, sort: -1, dir: 1, query: '' };

    const cellValue = (row, col, type) => {
      const cell = row.cells[col];
      const raw = cell.getAttribute('data-value') ?? cell.textContent.trim();
      if (type === 'number') return parseFloat(String(raw).replace(/[^\d.-]/g, '')) || 0;
      if (type === 'date') return new Date(raw).getTime() || 0;
      return raw.toLowerCase();
    };

    heads.forEach((th, col) => {
      if (!th.hasAttribute('data-xz-sort')) return;
      const type = th.getAttribute('data-xz-sort') || 'text';
      const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'xz-table__sort' });
      btn.append(...th.childNodes);
      th.append(btn);
      th.setAttribute('aria-sort', 'none');
      btn.addEventListener('click', () => {
        state.dir = state.sort === col ? -state.dir : 1;
        state.sort = col;
        state.type = type;
        state.page = 1;
        heads.forEach((h) => h.hasAttribute('aria-sort') && h.setAttribute('aria-sort', 'none'));
        th.setAttribute('aria-sort', state.dir === 1 ? 'ascending' : 'descending');
        update();
      });
    });

    const update = () => {
      let list = state.query ? rows.filter((r) => r.textContent.toLowerCase().includes(state.query)) : rows.slice();
      if (state.sort >= 0) {
        list.sort((a, b) => {
          const x = cellValue(a, state.sort, state.type);
          const y = cellValue(b, state.sort, state.type);
          return (x < y ? -1 : x > y ? 1 : 0) * state.dir;
        });
      }
      const total = list.length;
      const pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
      state.page = Math.min(state.page, pages);
      const from = pageSize ? (state.page - 1) * pageSize : 0;
      const visible = pageSize ? list.slice(from, from + pageSize) : list;
      tbody.replaceChildren(...visible);
      if (empty) empty.hidden = total > 0;
      table.closest('.xz-table-wrap')?.toggleAttribute('hidden', Boolean(empty) && total === 0);
      if (pager) renderPager(pager, { page: state.page, pages, total, from, count: visible.length, go: (p) => ((state.page = p), update()) });
      table.dispatchEvent(new CustomEvent('xz:table', { bubbles: true, detail: { total, page: state.page, pages } }));
    };

    if (search) {
      search.addEventListener('input', () => {
        state.query = search.value.trim().toLowerCase();
        state.page = 1;
        update();
      });
    }
    update();
  }
}

function renderPager(el, { page, pages, total, from, count, go }) {
  el.innerHTML = '';
  el.classList.add('xz-pagination');
  el.setAttribute('role', 'navigation');
  el.setAttribute('aria-label', 'Pagination');
  const info = Object.assign(document.createElement('span'), { className: 'xz-pagination__info', textContent: total ? `Showing ${from + 1} to ${from + count} of ${total}` : 'No results' });
  info.setAttribute('aria-live', 'polite');
  el.append(info);
  const button = (label, target, { current, disabled, aria } = {}) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'xz-pagination__item', textContent: label, disabled: Boolean(disabled) });
    if (aria) b.setAttribute('aria-label', aria);
    if (current) b.setAttribute('aria-current', 'page');
    b.addEventListener('click', () => go(target));
    el.append(b);
  };
  button('←', page - 1, { disabled: page <= 1, aria: 'Previous page' });
  // 1 … 4 5 6 … 20
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  let last = 0;
  for (const n of [...nums].sort((a, b) => a - b)) {
    if (n - last > 1) el.append(Object.assign(document.createElement('span'), { className: 'xz-pagination__gap', textContent: '…' }));
    button(String(n), n, { current: n === page, aria: `Page ${n}` });
    last = n;
  }
  button('→', page + 1, { disabled: page >= pages, aria: 'Next page' });
}

// ---------- form validation ----------
const messages = {
  valueMissing: (f) => `Enter ${fieldName(f)}`,
  typeMismatch: (f) => (f.type === 'email' ? 'Enter an email address like name@example.com' : f.type === 'url' ? 'Enter a full web address starting with https://' : 'Check the format'),
  tooShort: (f) => `Use at least ${f.minLength} characters`,
  tooLong: (f) => `Use ${f.maxLength} characters or fewer`,
  patternMismatch: (f) => f.title || 'Check the format',
  rangeUnderflow: (f) => `Enter ${f.min} or more`,
  rangeOverflow: (f) => `Enter ${f.max} or less`,
  stepMismatch: () => 'Enter a valid number',
  badInput: () => 'Enter a valid value',
};
function fieldName(f) {
  const label = f.labels?.[0]?.textContent.replace(/[*]|\(optional\)/gi, '').trim();
  // "your email" for details about the person, "the course name" for everything else.
  const personal = ['email', 'password', 'tel'].includes(f.type) || (f.autocomplete && f.autocomplete !== 'off');
  return label ? `${personal ? 'your' : 'the'} ${label.toLowerCase()}` : 'a value';
}
function fieldMessage(f) {
  const v = f.validity;
  if (v.valid) return '';
  for (const key of Object.keys(messages)) {
    if (!v[key]) continue;
    const custom = f.getAttribute(`data-xz-msg-${key.toLowerCase()}`) || f.getAttribute('data-xz-msg');
    if (custom) return custom;
    if (key === 'valueMissing' && f.type === 'checkbox') return 'Tick this box to continue';
    if (key === 'valueMissing' && f.tagName === 'SELECT') return `Select ${fieldName(f).replace(/^(your|the) /, 'a ')}`;
    return messages[key](f);
  }
  return f.validationMessage;
}
function validateField(f) {
  const msg = fieldMessage(f);
  const field = f.closest('.xz-field') || f.closest('label')?.parentElement || f.parentElement;
  let err = field.querySelector('.xz-error');
  // A combobox shows its state on the visible input.
  const shown = f.hidden ? field.querySelector('[role="combobox"]') || f : f;
  if (msg) {
    if (!err) {
      err = document.createElement('p');
      err.className = 'xz-error';
      err.id = id('error');
      field.append(err);
    }
    err.id ||= id('error');
    err.textContent = msg;
    err.hidden = false;
    shown.setAttribute('aria-invalid', 'true');
    const described = (shown.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    if (!described.includes(err.id)) shown.setAttribute('aria-describedby', [...described, err.id].join(' '));
  } else {
    shown.removeAttribute('aria-invalid');
    if (err) err.hidden = true;
  }
  return !msg;
}
function validate(form) {
  const fields = Array.from(form.elements).filter((f) => f.willValidate);
  const invalid = fields.filter((f) => !validateField(f));
  if (invalid[0]) {
    const first = invalid[0];
    (first.hidden ? (first.closest('.xz-field') || form).querySelector('[role="combobox"]') : first)?.focus();
  }
  return invalid.length === 0;
}
function initForms(root) {
  for (const form of $$('form[data-xz-validate]', root)) {
    if (form.xzReady) continue;
    form.xzReady = true;
    form.noValidate = true;
    form.addEventListener('submit', (e) => {
      if (!validate(form)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    });
    // After the first error, re-check as the person types.
    form.addEventListener('input', (e) => {
      const f = e.target;
      if (f.willValidate && (f.getAttribute('aria-invalid') === 'true' || f.closest('.xz-field')?.querySelector('[aria-invalid="true"]'))) validateField(f);
    });
    form.addEventListener('change', (e) => {
      if (e.target.willValidate && e.target.closest('.xz-field')?.querySelector('[aria-invalid="true"]')) validateField(e.target);
    });
  }
}

// ---------- formatted values ----------
function initFormats(root) {
  for (const el of $$('[data-xz-format]', root)) {
    const kind = el.getAttribute('data-xz-format');
    const value = el.getAttribute('data-value') ?? el.textContent;
    const fn = { inr: format.inr, 'inr-compact': format.inrCompact, number: format.number, compact: format.compact, date: format.date, 'date-short': format.dateShort, 'date-time': format.dateTime, relative: format.relative, percent: format.percent }[kind];
    if (fn) el.textContent = fn(kind.startsWith('date') || kind === 'relative' ? value : Number(value));
  }
}

// ---------- delegated events (attached once) ----------
function listen() {
  document.addEventListener('click', (e) => {
    const t = e.target;
    const opener = t.closest('[data-xz-open]');
    if (opener) {
      e.preventDefault();
      openDialog(opener.getAttribute('data-xz-open'));
    }
    const closer = t.closest('[data-xz-close]');
    if (closer) closeDialog(closer.closest('dialog'), closer.getAttribute('data-xz-close') || undefined);
    // Click on the backdrop closes, unless the dialog is marked data-xz-static.
    if (t.matches?.('dialog.xz-modal, dialog.xz-drawer, dialog.xz-sheet') && !t.hasAttribute('data-xz-static')) {
      const r = t.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) t.close();
    }
    const dismiss = t.closest('[data-xz-dismiss]');
    if (dismiss) dismiss.closest('.xz-alert, .xz-banner, .xz-chip, .xz-toast')?.remove();
    if (t.closest('[data-xz-theme-toggle]')) theme.toggle();
    const pw = t.closest('[data-xz-password-toggle]');
    if (pw) {
      const input = pw.closest('.xz-input-group')?.querySelector('input');
      if (input) {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        pw.setAttribute('aria-pressed', String(show));
        pw.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        pw.innerHTML = icon(show ? 'eye-off' : 'eye', { size: 'sm' });
      }
    }
    const toaster = t.closest('[data-xz-toast]');
    if (toaster) toast({ message: toaster.getAttribute('data-xz-toast'), title: toaster.getAttribute('data-xz-toast-title') || undefined, variant: toaster.getAttribute('data-xz-toast-variant') || undefined });
    const pressed = t.closest('button.xz-chip[aria-pressed], .xz-btn-group[data-xz-toggle] > .xz-btn');
    if (pressed) {
      if (pressed.matches('.xz-chip')) pressed.setAttribute('aria-pressed', String(pressed.getAttribute('aria-pressed') !== 'true'));
      else for (const b of pressed.parentElement.children) b.setAttribute('aria-pressed', String(b === pressed));
    }
    if (!t.closest('[data-xz-menu]')) closeMenus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTip();
  });
  // An open menu is pinned to the viewport, so close it when the page moves.
  addEventListener('resize', () => closeMenus());
  document.addEventListener('scroll', (e) => !e.target.closest?.('.xz-menu__list') && closeMenus(), true);
  const tipTarget = (e) => e.target.closest?.('[data-xz-tooltip]');
  document.addEventListener('mouseover', (e) => tipTarget(e) && tip?.xzFor !== tipTarget(e) && showTip(tipTarget(e)));
  document.addEventListener('mouseout', (e) => tipTarget(e) && !tipTarget(e).contains(e.relatedTarget) && hideTip());
  document.addEventListener('focusin', (e) => tipTarget(e) && e.target.matches(':focus-visible') && showTip(tipTarget(e)));
  document.addEventListener('focusout', (e) => tipTarget(e) && hideTip());
  document.addEventListener('scroll', hideTip, true);
}

let listening = false;
function init(root = document) {
  if (!listening) {
    listening = true;
    theme.restore();
    listen();
  }
  initIcons(root);
  initTabs(root);
  initMenus(root);
  initComboboxes(root);
  initTables(root);
  initForms(root);
  initFormats(root);
  initAdvancedForms(root, { icon });
  initComponents(root, { icon, validateField });
  initBlocks(root, { icon });
  theme.sync();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
}

const Xsenze = {
  version: __VERSION__,
  init,
  icon,
  icons: Object.keys(icons),
  theme,
  modal: { open: openDialog, close: closeDialog },
  drawer: { open: openDialog, close: closeDialog },
  sheet: { open: openDialog, close: closeDialog },
  toast,
  validate,
  format,
  sanitize,
  motion,
  copy,
};

export default Xsenze;
