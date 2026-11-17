// Data table: sorting, search, filters, pages, row selection with bulk actions, a column menu,
// detail rows and CSV export. It works on the rows already in the page, so a PHP page prints one <tr>
// per record and everything still reads, sorts on the server and submits without the script.
import { $$, fire, nextId, store } from './shared.js';
import { parse } from './format.js';
import { floating, bindGlobal } from './floating.js';
import { place } from './place.js';

const find = (s) => {
  if (!s) return null;
  try {
    return document.querySelector(s);
  } catch {
    return null;
  }
};
const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const collator = typeof Intl !== 'undefined' ? new Intl.Collator('en-IN', { numeric: true, sensitivity: 'base' }) : { compare: (a, b) => (a < b ? -1 : a > b ? 1 : 0) };

export function initTables(root, { icon = () => '', init } = {}) {
  for (const table of $$('table[data-xz-table]', root)) {
    if (table.xzReady || !table.tBodies[0] || !table.tHead) continue;
    table.xzReady = true;
    bindGlobal();
    setup(table, { icon, init });
  }
}

function setup(table, { icon, init }) {
  const tbody = table.tBodies[0];
  const heads = Array.from(table.tHead.rows[0].cells);
  const name = table.getAttribute('data-xz-table') || table.id || '';
  const ref = table.id ? `#${table.id}` : null;
  // Elements that point at this table with data-xz-filter="#id", data-xz-bulk="#id" and so on.
  const linked = (attr) => (ref ? $$(`[${attr}]`).filter((el) => el.getAttribute(attr) === ref) : []);
  const pageSize = Number(table.getAttribute('data-xz-page-size')) || 0;
  const pager = find(table.getAttribute('data-xz-pagination'));
  const searchEl = find(table.getAttribute('data-xz-search'));
  const empty = find(table.getAttribute('data-xz-empty'));
  const live = Object.assign(document.createElement('div'), { className: 'xz-sr-only' });
  live.setAttribute('aria-live', 'polite');
  // Selected rows that are on other pages are not in the page, so hidden inputs carry them in a form post.
  const carry = document.createElement('div');
  carry.hidden = true;
  table.after(carry, live);
  const say = (text) => {
    live.textContent = '';
    setTimeout(() => (live.textContent = text), 50);
  };

  // ---------- columns ----------
  const cols = heads.map((th, i) => ({
    th,
    i,
    key: th.getAttribute('data-xz-key') || slug(th.textContent) || `column-${i + 1}`,
    label: th.textContent.trim().replace(/\s+/g, ' '),
    check: th.classList.contains('xz-table__check') || Boolean(th.querySelector('[data-xz-select-all]')),
    actions: th.classList.contains('xz-table__actions'),
    fixed: th.hasAttribute('data-xz-fixed'),
  }));
  const dataCols = cols.filter((c) => !c.check && !c.actions);
  const byKey = (key) => cols.find((c) => c.key === key);

  // ---------- rows ----------
  // A row is { tr, detail, box, text }. A tr.xz-table__detail belongs to the row before it.
  let rows = [];
  const selected = new Set();
  let anchor = null;
  let list = [];
  let shown = [];
  const state = { page: 1, sort: -1, dir: 1, type: 'text', query: '', terms: [], filters: new Map() };

  const scan = (trs) => {
    const out = [];
    for (const tr of trs) {
      if (tr.classList.contains('xz-table__detail')) {
        const owner = out[out.length - 1];
        if (owner) owner.detail = tr;
        continue;
      }
      out.push({ tr, detail: null, box: tr.querySelector('input[data-xz-select]'), text: null });
    }
    return out;
  };
  const prepare = (row) => {
    if (row.box?.checked) selected.add(row);
    row.tr.classList.toggle('is-selected', selected.has(row));
    const btns = $$('[data-xz-expand]', row.tr);
    if (row.detail) {
      row.detail.id ||= nextId('detail');
      const open = btns.some((b) => b.getAttribute('aria-expanded') === 'true');
      row.detail.hidden = !open;
      for (const b of btns) {
        b.setAttribute('aria-controls', row.detail.id);
        b.setAttribute('aria-expanded', String(open));
      }
    } else btns.forEach((b) => (b.hidden = true));
  };
  rows = scan(Array.from(tbody.rows));
  rows.forEach(prepare);
  const textOf = (row) => (row.text ??= dataCols.map((c) => row.tr.cells[c.i]?.textContent || '').join(' ').replace(/\s+/g, ' ').toLowerCase());
  const raw = (row, c) => {
    const cell = row.tr.cells[c.i];
    return cell ? (cell.getAttribute('data-value') ?? cell.textContent.trim()) : '';
  };
  const sortValue = (row, c, type) => {
    const v = raw(row, c);
    if (type === 'number') {
      const n = parse(v);
      return Number.isNaN(n) ? 0 : n;
    }
    if (type === 'date') return new Date(v).getTime() || 0;
    return String(v);
  };
  const compare = (x, y) => (typeof x === 'string' ? collator.compare(x, y) : x - y);

  const matches = (row) => {
    if (state.terms.length) {
      const t = textOf(row);
      if (!state.terms.every((q) => t.includes(q))) return false;
    }
    for (const [key, values] of state.filters) {
      if (!values.size) continue;
      const c = byKey(key);
      if (c && !values.has(String(raw(row, c)).toLowerCase())) return false;
    }
    return true;
  };

  // ---------- column menu ----------
  const colStore = name ? `xz-table-columns:${name}` : null;
  const startHidden = cols.filter((c) => c.th.hasAttribute('data-xz-hidden')).map((c) => c.key);
  const hiddenKeys = new Set((colStore && store.get(colStore, null)) || startHidden);
  const canHide = (c) => !c.fixed && !c.check && !c.actions;
  const applyColumns = () => {
    for (const c of cols) {
      const hide = canHide(c) && hiddenKeys.has(c.key);
      c.th.hidden = hide;
      for (const r of rows) {
        const cell = r.tr.cells[c.i];
        if (cell) cell.hidden = hide;
      }
    }
    const count = cols.filter((c) => !c.th.hidden).length;
    for (const r of rows) if (r.detail && r.detail.cells.length === 1) r.detail.cells[0].colSpan = count;
  };
  const setColumn = (key, show) => {
    if (show) hiddenKeys.delete(key);
    else hiddenKeys.add(key);
    if (colStore) store.set(colStore, [...hiddenKeys]);
    applyColumns();
    for (const box of $$(`input[data-xz-column-key="${key}"]`)) box.checked = show;
    fire(table, 'xz:columns', { hidden: [...hiddenKeys] });
  };

  // ---------- drawing ----------
  let observer = null;
  const filtersNow = () => Object.fromEntries([...state.filters].filter(([, v]) => v.size).map(([k, v]) => [k, [...v]]));
  const update = () => {
    const next = rows.filter(matches);
    if (state.sort >= 0) {
      const c = cols[state.sort];
      next.sort((a, b) => compare(sortValue(a, c, state.type), sortValue(b, c, state.type)) * state.dir);
    }
    list = next;
    const total = list.length;
    const pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
    state.page = Math.min(Math.max(1, state.page), pages);
    const from = pageSize ? (state.page - 1) * pageSize : 0;
    shown = pageSize ? list.slice(from, from + pageSize) : list;
    tbody.replaceChildren(...shown.flatMap((r) => (r.detail ? [r.tr, r.detail] : [r.tr])));
    observer?.takeRecords();
    if (empty) empty.hidden = total > 0;
    table.closest('.xz-table-wrap')?.toggleAttribute('hidden', Boolean(empty) && total === 0);
    if (pager) renderPager(pager, { page: state.page, pages, total, from, count: shown.length, go: (p) => ((state.page = p), update()) });
    syncSelection();
    fire(table, 'xz:table', { total, page: state.page, pages, query: state.query, filters: filtersNow(), sort: state.sort >= 0 ? { key: cols[state.sort].key, dir: state.dir === 1 ? 'ascending' : 'descending' } : null, selected: selected.size });
  };
  const refilter = () => {
    state.page = 1;
    update();
    if (!pager) say(list.length ? `${list.length} result${list.length === 1 ? '' : 's'}` : 'No results');
  };

  // ---------- sorting ----------
  const setSort = (col, dir) => {
    const th = cols[col].th;
    state.dir = dir ?? (state.sort === col ? -state.dir : 1);
    state.sort = col;
    state.type = th.getAttribute('data-xz-sort') || 'text';
    state.page = 1;
    heads.forEach((h) => h.hasAttribute('aria-sort') && h.setAttribute('aria-sort', 'none'));
    th.setAttribute('aria-sort', state.dir === 1 ? 'ascending' : 'descending');
    update();
  };
  heads.forEach((th, col) => {
    if (!th.hasAttribute('data-xz-sort')) return;
    const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'xz-table__sort' });
    btn.append(...th.childNodes);
    th.append(btn);
    th.setAttribute('aria-sort', 'none');
    btn.addEventListener('click', () => setSort(col));
  });

  // ---------- search ----------
  const setQuery = (q) => {
    state.query = String(q).trim().toLowerCase();
    state.terms = state.query.split(/\s+/).filter(Boolean);
    refilter();
  };
  searchEl?.addEventListener('input', () => setQuery(searchEl.value));

  // ---------- filters ----------
  const setFilter = (key, values) => {
    state.filters.set(key, new Set(values.filter((v) => v !== '' && v != null).map((v) => String(v).toLowerCase())));
    refilter();
  };
  const filterEls = linked('data-xz-filter');
  const pressedValues = (el) => $$('button[aria-pressed="true"]', el).map((b) => b.value || b.textContent.trim());
  for (const el of filterEls) {
    const key = el.getAttribute('data-xz-column');
    const c = byKey(key);
    if (!c) {
      console.warn(`[Xsenze] No column "${key}" in the table for this filter. Use the column's data-xz-key or its heading text.`);
      continue;
    }
    if (el.tagName === 'SELECT') {
      if (el.getAttribute('data-xz-options') === 'auto') {
        const have = new Set($$('option', el).map((o) => o.value.toLowerCase()));
        const values = [...new Set(rows.map((r) => raw(r, c)).filter(Boolean))].sort(collator.compare);
        for (const v of values) if (!have.has(v.toLowerCase())) el.append(new Option(v, v));
      }
      if (el.value) state.filters.set(key, new Set([el.value.toLowerCase()]));
      el.addEventListener('change', () => setFilter(key, [el.value]));
    } else {
      const start = pressedValues(el);
      if (start.length) state.filters.set(key, new Set(start.map((v) => v.toLowerCase())));
      el.addEventListener('xz:press', () => setFilter(key, pressedValues(el)));
    }
    // A GET form with a filter button lets the server filter without the script. With it, filtering is live.
    const form = el.form || el.closest('form');
    if (form && !form.xzLiveFilter) {
      form.xzLiveFilter = true;
      for (const b of $$('[data-xz-filter-submit]', form)) b.hidden = true;
      if (form.querySelector('[data-xz-filter-submit]')) form.addEventListener('submit', (e) => e.preventDefault());
    }
  }
  for (const btn of linked('data-xz-filter-clear')) {
    btn.addEventListener('click', () => {
      for (const el of filterEls) {
        if (el.tagName === 'SELECT') el.value = '';
        else $$('button[aria-pressed]', el).forEach((b) => b.setAttribute('aria-pressed', 'false'));
      }
      state.filters.clear();
      if (searchEl) searchEl.value = '';
      state.query = '';
      state.terms = [];
      refilter();
    });
  }

  // ---------- selection ----------
  const selectAll = table.tHead.querySelector('input[data-xz-select-all]');
  const bars = linked('data-xz-bulk');
  const setRow = (row, on) => {
    if (!row.box || row.box.disabled) return;
    row.box.checked = on;
    if (on) selected.add(row);
    else selected.delete(row);
    row.tr.classList.toggle('is-selected', on);
  };
  const ids = () => [...selected].map((r) => r.box.value);
  const syncSelection = () => {
    if (selectAll) {
      const boxes = shown.filter((r) => r.box && !r.box.disabled);
      const n = boxes.filter((r) => selected.has(r)).length;
      selectAll.checked = boxes.length > 0 && n === boxes.length;
      selectAll.indeterminate = n > 0 && n < boxes.length;
    }
    const onPage = new Set(shown);
    carry.replaceChildren(...[...selected].filter((r) => !onPage.has(r) && r.box.name).map((r) => Object.assign(document.createElement('input'), { type: 'hidden', name: r.box.name, value: r.box.value })));
    const inList = new Set(list);
    const selectable = list.filter((r) => r.box && !r.box.disabled);
    for (const bar of bars) {
      bar.hidden = selected.size === 0;
      const count = bar.querySelector('[data-xz-bulk-count]');
      if (count) {
        const away = [...selected].filter((r) => !inList.has(r)).length;
        count.textContent = `${selected.size} selected${away ? `, ${away} not shown` : ''}`;
      }
      const all = bar.querySelector('[data-xz-bulk-all]');
      if (all) {
        const pageDone = shown.every((r) => !r.box || selected.has(r));
        all.hidden = !pageDone || selectable.length <= shown.length || selectable.every((r) => selected.has(r));
        const tpl = all.getAttribute('data-xz-bulk-all');
        all.textContent = (tpl && tpl.includes('{n}') ? tpl : 'Select all {n} results').replace('{n}', selectable.length);
      }
    }
  };
  const changed = () => {
    syncSelection();
    say(selected.size ? `${selected.size} row${selected.size === 1 ? '' : 's'} selected` : 'No rows selected');
    fire(table, 'xz:selection', { count: selected.size, rows: [...selected].map((r) => r.tr), ids: ids(), all: list.length > 0 && list.every((r) => !r.box || selected.has(r)) });
  };
  selectAll?.addEventListener('change', () => {
    for (const r of shown) setRow(r, selectAll.checked);
    anchor = null;
    changed();
  });
  const select = (what, on = true) => {
    const target = what === 'all' ? list : what === 'page' ? shown : what === 'none' ? rows : rows.filter((r) => [].concat(what).includes(r.tr));
    for (const r of target) setRow(r, what === 'none' ? false : on);
    changed();
  };
  for (const bar of bars) {
    bar.hidden = true;
    if (!bar.hasAttribute('role')) bar.setAttribute('role', 'region');
    if (!bar.hasAttribute('aria-label')) bar.setAttribute('aria-label', 'Selected rows');
    bar.addEventListener('click', (e) => {
      if (e.target.closest('[data-xz-bulk-clear]')) return select('none');
      if (e.target.closest('[data-xz-bulk-all]')) return select('all');
      const act = e.target.closest('[data-xz-bulk-action]');
      if (act && !fire(table, 'xz:bulk', { action: act.getAttribute('data-xz-bulk-action'), rows: [...selected].map((r) => r.tr), ids: ids() }, true)) e.preventDefault();
    });
  }

  // ---------- detail rows ----------
  const expand = (row, open = Boolean(row.detail?.hidden)) => {
    if (!row.detail) return;
    row.detail.hidden = !open;
    row.tr.classList.toggle('is-expanded', open);
    for (const b of $$('[data-xz-expand]', row.tr)) b.setAttribute('aria-expanded', String(open));
    fire(table, 'xz:expand', { row: row.tr, open });
  };

  // One listener for the whole body: row boxes (Shift picks a range) and detail buttons.
  tbody.addEventListener('click', (e) => {
    const box = e.target.closest('input[data-xz-select]');
    if (box) {
      const row = rows.find((r) => r.box === box);
      if (!row) return;
      const a = anchor ? list.indexOf(anchor) : -1;
      const b = list.indexOf(row);
      if (e.shiftKey && a >= 0 && b >= 0 && a !== b) for (const r of list.slice(Math.min(a, b), Math.max(a, b) + 1)) setRow(r, box.checked);
      else setRow(row, box.checked);
      anchor = row;
      changed();
      return;
    }
    const btn = e.target.closest('[data-xz-expand]');
    if (btn) {
      const row = rows.find((r) => r.tr.contains(btn));
      if (row) expand(row);
    }
  });

  // ---------- CSV ----------
  const csv = ({ rows: which = 'filtered' } = {}) => {
    const out = dataCols.filter((c) => !c.th.hidden);
    const pick = which === 'all' ? rows : which === 'selected' ? rows.filter((r) => selected.has(r)) : list;
    const cell = (v) => {
      let s = String(v ?? '').replace(/\s+/g, ' ').trim();
      // A spreadsheet runs text that starts with = + - or @ as a formula. Numbers are left as they are.
      if (/^[=+\-@]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [out.map((c) => cell(c.label)).join(','), ...pick.map((r) => out.map((c) => cell(raw(r, c))).join(','))].join('\r\n');
  };
  const download = (opts = {}) => {
    // The byte-order mark lets spreadsheet apps read ₹ and Indian-language names correctly.
    const blob = new Blob(['﻿' + csv(opts)], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: opts.filename || `${name || 'table'}.csv` });
    document.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  };
  for (const btn of linked('data-xz-export')) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      download({ rows: btn.getAttribute('data-xz-rows') || 'filtered', filename: btn.getAttribute('data-xz-filename') || undefined });
    });
  }

  // ---------- column menu ----------
  for (const holder of linked('data-xz-columns')) {
    holder.classList.add('xz-table-columns');
    let trigger = holder.querySelector(':scope > button');
    if (!trigger) {
      trigger = Object.assign(document.createElement('button'), { type: 'button', className: 'xz-btn xz-btn--sm' });
      trigger.innerHTML = `${icon('columns-3', { size: 'sm' })}<span>Columns</span>`;
      holder.append(trigger);
    }
    const panel = Object.assign(document.createElement('div'), { className: 'xz-popover__panel xz-table-columns__panel' });
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Columns to show');
    panel.tabIndex = -1;
    for (const c of cols.filter(canHide)) {
      const label = Object.assign(document.createElement('label'), { className: 'xz-check' });
      const box = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !hiddenKeys.has(c.key) });
      box.setAttribute('data-xz-column-key', c.key);
      box.addEventListener('change', () => setColumn(c.key, box.checked));
      label.append(box, Object.assign(document.createElement('span'), { textContent: c.label }));
      panel.append(label);
    }
    holder.append(panel);
    floating({ wrapper: holder, trigger, panel, focusPanel: true, position: () => place(panel, trigger, { align: 'end', gap: 6 }) });
  }

  // ---------- rows added later ----------
  const refresh = () => {
    const known = new Set(rows.flatMap((r) => [r.tr, r.detail]).filter(Boolean));
    const gone = new Set(shown.filter((r) => !r.tr.isConnected));
    rows = rows.filter((r) => !gone.has(r));
    for (const r of gone) selected.delete(r);
    const fresh = scan(Array.from(tbody.rows).filter((tr) => !known.has(tr)));
    fresh.forEach(prepare);
    rows.push(...fresh);
    applyColumns();
    update();
  };
  const replace = (input) => {
    let trs;
    if (typeof input === 'string') {
      const t = document.createElement('template');
      t.innerHTML = `<table><tbody>${input}</tbody></table>`;
      trs = Array.from(t.content.querySelector('tbody').rows);
    } else trs = Array.from(input);
    // Icons and menus in the new rows start once, even on rows that sit on later pages.
    const frag = document.createDocumentFragment();
    frag.append(...trs);
    init?.(frag);
    selected.clear();
    anchor = null;
    rows = scan(trs);
    rows.forEach(prepare);
    state.page = 1;
    applyColumns();
    update();
  };
  if (table.hasAttribute('data-xz-table-live') && typeof MutationObserver === 'function') {
    let queued = false;
    observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        refresh();
      });
    });
    observer.observe(tbody, { childList: true });
  }

  table.xzTable = {
    refresh,
    replace,
    rows: () => rows.map((r) => r.tr),
    filtered: () => list.map((r) => r.tr),
    visible: () => shown.map((r) => r.tr),
    go: (p) => ((state.page = p), update()),
    sort: (key, dir = 'ascending') => {
      const c = byKey(key);
      if (c) setSort(c.i, dir === 'descending' ? -1 : 1);
    },
    search: (q) => {
      if (searchEl) searchEl.value = q;
      setQuery(q);
    },
    filter: (key, values) => setFilter(key, [].concat(values ?? [])),
    select,
    selected: () => [...selected].map((r) => r.tr),
    expand: (tr, open) => {
      const row = rows.find((r) => r.tr === tr);
      if (row) expand(row, open);
    },
    columns: { hide: (k) => setColumn(k, false), show: (k) => setColumn(k, true), toggle: (k) => setColumn(k, hiddenKeys.has(k)), hidden: () => [...hiddenKeys] },
    csv,
    download,
  };

  applyColumns();
  update();
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
