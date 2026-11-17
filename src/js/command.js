// Command palette: a dialog that finds pages and runs actions as you type.
// It opens with Ctrl+K (⌘K on Apple devices), from any button with data-xz-open, or from Xsenze.command.open().
// Without the script, the button can be a plain link to a search page.
import { $$, fire, esc, nextId, typing, composing, parseShortcut, matchShortcut, ariaShortcut } from './shared.js';
import { closeAll } from './floating.js';
import { termsOf, ranked, highlight, recentList, fetchItems, keepInView } from './listbox.js';

let icon = () => '';
let openDialog = (d) => d.showModal();
let closeDialog = (d) => d.close();
let bound = false;
let shared = null;
const extra = new Map(); // dialog -> Set of items arrays and provider functions added with register()

const fromLi = (li, i) => ({
  id: li.dataset.id || '',
  label: li.textContent.trim(),
  group: li.dataset.group || '',
  href: li.dataset.href || '',
  action: li.dataset.action || '',
  icon: li.dataset.icon || '',
  meta: li.dataset.meta || '',
  keywords: li.dataset.keywords || '',
  kbd: li.dataset.kbd || '',
  pin: li.hasAttribute('data-pin'),
  order: i,
});
const keyOf = (item) => item.id || `${item.group}|${item.label}|${item.href}`;

export function initCommands(root, helpers = {}) {
  if (helpers.icon) icon = helpers.icon;
  if (helpers.openDialog) openDialog = helpers.openDialog;
  if (helpers.closeDialog) closeDialog = helpers.closeDialog;
  for (const dlg of $$('dialog[data-xz-command]', root)) if (!dlg.xzCommand) build(dlg);
  if (!bound && typeof document !== 'undefined') {
    bound = true;
    // One listener for every palette that has a shortcut. Ctrl+K again closes it.
    document.addEventListener('keydown', (e) => {
      for (const dlg of $$('dialog[data-xz-command]')) {
        const sc = dlg.xzCommand?.shortcut;
        if (!sc || !matchShortcut(e, sc)) continue;
        if (dlg.open) {
          e.preventDefault();
          closeDialog(dlg);
          return;
        }
        if (typing(e.target) && !e.target.closest('.xz-command-palette')) return;
        e.preventDefault();
        dlg.xzCommand.open();
        return;
      }
    });
  }
}

function build(dlg) {
  dlg.classList.add('xz-command-palette');
  if (!dlg.hasAttribute('aria-label') && !dlg.hasAttribute('aria-labelledby')) dlg.setAttribute('aria-label', 'Command menu');
  const listId = nextId('command');
  const source = dlg.querySelector('.xz-command-palette__source');
  const sourceItems = source ? $$(':scope > li', source).map(fromLi) : [];
  let input = dlg.querySelector('.xz-command-palette__input');
  const head = document.createElement('div');
  head.className = 'xz-command-palette__search';
  head.innerHTML = icon('search', { size: 'sm' });
  if (!input) {
    input = document.createElement('input');
    input.className = 'xz-command-palette__input';
    input.placeholder = dlg.getAttribute('data-xz-placeholder') || 'Type a command or search';
  }
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', listId);
  if (!input.hasAttribute('aria-label') && !input.labels?.length) input.setAttribute('aria-label', dlg.getAttribute('aria-label') || 'Search');
  const esc_ = Object.assign(document.createElement('kbd'), { className: 'xz-kbd', textContent: 'Esc' });
  esc_.setAttribute('aria-hidden', 'true');
  head.append(input, esc_);
  const list = Object.assign(document.createElement('div'), { className: 'xz-command-palette__list', id: listId });
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Results');
  const note = Object.assign(document.createElement('p'), { className: 'xz-command-palette__note', hidden: true });
  const foot = Object.assign(document.createElement('div'), { className: 'xz-command-palette__footer' });
  foot.setAttribute('aria-hidden', 'true');
  foot.innerHTML = '<span><kbd class="xz-kbd">↑</kbd><kbd class="xz-kbd">↓</kbd> to move</span><span><kbd class="xz-kbd">Enter</kbd> to open</span><span><kbd class="xz-kbd">Esc</kbd> to close</span>';
  const status = Object.assign(document.createElement('div'), { className: 'xz-sr-only' });
  status.setAttribute('aria-live', 'polite');
  dlg.replaceChildren(...[source].filter(Boolean), head, list, note, foot, status);

  const shortcut = parseShortcut(dlg.getAttribute('data-xz-shortcut') ?? (dlg === shared ? 'none' : 'mod+k'));
  const max = Number(dlg.getAttribute('data-xz-max')) || 50;
  const url = dlg.getAttribute('data-xz-command-url');
  const minLength = Number(dlg.getAttribute('data-xz-min-length') || 2);
  const searchUrl = dlg.getAttribute('data-xz-command-search');
  const state = { items: sourceItems, providers: [], recent: dlg.getAttribute('data-xz-recent') || '', opener: null, resolve: null, shown: [], active: -1, remote: [], pending: null, timer: 0, announce: 0, chosen: null };
  if (shortcut) {
    for (const t of $$(`[data-xz-open="#${dlg.id}"]`)) if (dlg.id && !t.hasAttribute('aria-keyshortcuts')) t.setAttribute('aria-keyshortcuts', ariaShortcut(shortcut));
  }

  const recent = () => recentList(state.recent ? `xz-command-recent:${state.recent}` : '', { max: 5, same: (a, b) => keyOf(a) === keyOf(b) });
  const allItems = () => {
    const out = [...state.items];
    for (const x of extra.get(dlg) || []) if (Array.isArray(x)) out.push(...x);
    return out;
  };
  const providers = () => [...state.providers, ...[...(extra.get(dlg) || [])].filter((x) => typeof x === 'function')];

  const setActive = (i) => {
    state.active = i;
    const opts = list.querySelectorAll('[role="option"]');
    opts.forEach((el, n) => {
      const on = n === i;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', String(on));
    });
    const el = opts[i];
    if (el) {
      input.setAttribute('aria-activedescendant', el.id);
      keepInView(list, el);
    } else input.removeAttribute('aria-activedescendant');
  };

  const render = () => {
    const q = input.value.trim();
    const terms = termsOf(q);
    const recentKeys = new Set(recent().get().map(keyOf));
    let groups = [];
    const add = (name, items) => items.length && groups.push({ name, items });
    if (!terms.length) {
      const saved = recent().get();
      add('Recent', saved.map((r) => ({ ...r, group: 'Recent' })));
      const all = allItems();
      const pinned = all.some((i) => i.pin) ? all.filter((i) => i.pin) : all;
      const byGroup = new Map();
      for (const it of pinned.filter((i) => !recentKeys.has(keyOf(i))).slice(0, max)) {
        if (!byGroup.has(it.group)) byGroup.set(it.group, []);
        byGroup.get(it.group).push(it);
      }
      for (const [name, items] of byGroup) add(name, items);
    } else {
      const best = ranked(allItems(), terms, { boost: (it) => (recentKeys.has(keyOf(it)) ? 15 : 0) }).slice(0, max);
      // Groups follow their best item.
      const byGroup = new Map();
      for (const it of best) {
        if (!byGroup.has(it.group)) byGroup.set(it.group, []);
        byGroup.get(it.group).push(it);
      }
      for (const [name, items] of byGroup) add(name, items);
      // Server and provider results keep their own order and come after.
      const seen = new Set(best.map(keyOf));
      const remoteByGroup = new Map();
      for (const it of state.remote.filter((r) => !seen.has(keyOf(r)))) {
        if (!remoteByGroup.has(it.group)) remoteByGroup.set(it.group, []);
        remoteByGroup.get(it.group).push(it);
      }
      for (const [name, items] of remoteByGroup) {
        const existing = groups.find((g) => g.name === name);
        if (existing) existing.items.push(...items);
        else add(name, items);
      }
      if (searchUrl) add('', [{ label: `Search for “${q}”`, href: searchUrl.replace('{q}', encodeURIComponent(q)), icon: 'search', kind: 'query' }]);
    }
    state.shown = groups.flatMap((g) => g.items);
    let n = 0;
    list.innerHTML = groups
      .map((g, gi) => {
        const gid = `${listId}-g${gi}`;
        const head = g.name ? `<div class="xz-command-palette__group" id="${gid}" role="presentation">${esc(g.name)}</div>` : '';
        const opts = g.items
          .map((it) => {
            const i = n++;
            const lead = it.icon ? icon(it.icon, { size: 'sm' }) : '';
            const label = it.kind === 'query' ? esc(it.label) : highlight(it.label, terms);
            return `<div role="option" id="${listId}-${i}" class="xz-command-palette__option" data-index="${i}" aria-selected="false">${lead}<span class="xz-command-palette__label">${label}</span>${it.meta ? `<span class="xz-command-palette__meta">${esc(it.meta)}</span>` : ''}${it.kbd ? `<kbd class="xz-kbd" aria-hidden="true">${esc(it.kbd)}</kbd>` : ''}</div>`;
          })
          .join('');
        return `<div role="group"${g.name ? ` aria-labelledby="${gid}"` : ' aria-label="More"'}>${head}${opts}</div>`;
      })
      .join('');
    const count = state.shown.filter((it) => it.kind !== 'query').length;
    note.hidden = !(state.pending || (terms.length && count === 0));
    note.textContent = state.pending ? 'Searching…' : `No results for “${q}”`;
    setActive(state.shown.length ? 0 : -1);
    clearTimeout(state.announce);
    state.announce = setTimeout(() => (status.textContent = terms.length ? (count ? `${count} result${count === 1 ? '' : 's'}` : 'No results') : ''), 400);
  };

  const askRemote = () => {
    clearTimeout(state.timer);
    state.pending?.abort();
    state.pending = null;
    state.remote = [];
    const q = input.value.trim();
    const sources = providers();
    if (!q || (!sources.length && !(url && q.length >= minLength))) return render();
    const ctrl = new AbortController();
    state.pending = ctrl;
    state.timer = setTimeout(async () => {
      const [found, server] = await Promise.all([
        Promise.all(sources.map((p) => Promise.resolve(p(q, { signal: ctrl.signal })).catch(() => []))).then((a) => a.flat().filter((it) => it && it.label)),
        url && q.length >= minLength ? fetchItems(url, q, ctrl.signal).catch(() => []) : [],
      ]);
      if (ctrl.signal.aborted || input.value.trim() !== q) return;
      // Items from providers are ranked like the page's own items; the server's results keep the server's order.
      state.remote = [...ranked(found, termsOf(q)), ...server];
      state.pending = null;
      render();
    }, 150);
    render();
  };

  const finish = (item) => {
    const resolve = state.resolve;
    state.resolve = null;
    resolve?.(item);
  };
  const choose = (item, { newTab = false } = {}) => {
    if (!item) return;
    const q = input.value.trim();
    const ok = fire(dlg, 'xz:command', { item, query: q, action: item.action || null }, true);
    if (item.kind !== 'query') recent().add({ id: item.id || '', label: item.label, group: item.group || '', href: item.href || '', icon: item.icon || '', action: item.action || '', meta: item.meta || '' });
    state.chosen = item;
    closeDialog(dlg);
    if (!ok) return;
    if (typeof item.run === 'function') item.run(item);
    else if (item.href) {
      if (newTab) window.open(item.href, '_blank', 'noopener');
      else location.assign(item.href);
    }
  };

  input.addEventListener('input', askRemote);
  input.addEventListener('keydown', (e) => {
    const count = state.shown.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (count) setActive((state.active + (e.key === 'ArrowDown' ? 1 : -1) + count) % count);
    } else if (e.key === 'PageDown' || e.key === 'PageUp') {
      e.preventDefault();
      if (count) setActive(Math.max(0, Math.min(count - 1, state.active + (e.key === 'PageDown' ? 8 : -8))));
    } else if (e.key === 'Enter') {
      if (composing(e)) return;
      e.preventDefault();
      choose(state.shown[state.active], { newTab: e.ctrlKey || e.metaKey });
    }
  });
  // Keep focus in the field while an option is pressed.
  list.addEventListener('pointerdown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => {
    const el = e.target.closest('[role="option"]');
    if (el) choose(state.shown[Number(el.dataset.index)], { newTab: e.ctrlKey || e.metaKey });
  });
  list.addEventListener('pointermove', (e) => {
    const el = e.target.closest('[role="option"]');
    if (el && Number(el.dataset.index) !== state.active) setActive(Number(el.dataset.index));
  });

  dlg.addEventListener('close', () => {
    clearTimeout(state.timer);
    state.pending?.abort();
    state.pending = null;
    if (!state.chosen) finish(null);
    else finish(state.chosen);
    state.chosen = null;
    const back = state.opener;
    state.opener = null;
    input.value = '';
    state.remote = [];
    fire(dlg, 'xz:close');
    if (back?.isConnected && typeof back.focus === 'function') back.focus({ preventScroll: true });
  });

  const open = (opts = {}) => {
    if (opts.items) state.items = opts.items.map((it, i) => ({ order: i, ...it }));
    if (opts.providers) state.providers = [].concat(opts.providers);
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if ('recent' in opts) state.recent = opts.recent || '';
    return new Promise((resolve) => {
      if (dlg.open) {
        finish(null);
        state.resolve = resolve;
        input.select();
        return;
      }
      closeAll();
      state.opener = document.activeElement;
      state.resolve = resolve;
      state.chosen = null;
      input.value = opts.query || '';
      render();
      if (input.value) askRemote();
      openDialog(dlg);
      input.focus();
      fire(dlg, 'xz:open');
    });
  };

  // A button with data-xz-open="#palette" opens it through the kit's dialog handler.
  // Remember that button, so focus goes back to it, and draw the list as the dialog opens.
  if (dlg.id) {
    document.addEventListener(
      'click',
      (e) => {
        const t = e.target.closest?.('[data-xz-open]');
        if (t && t.getAttribute('data-xz-open') === `#${dlg.id}`) state.opener = t;
      },
      true,
    );
  }
  new MutationObserver(() => {
    if (!dlg.open || state.resolve) return;
    closeAll();
    state.chosen = null;
    render();
    input.focus();
  }).observe(dlg, { attributes: true, attributeFilter: ['open'] });

  dlg.xzCommand = {
    open,
    close: () => closeDialog(dlg),
    setItems: (items) => {
      state.items = items.map((it, i) => ({ order: i, ...it }));
      if (dlg.open) render();
    },
    refresh: () => dlg.open && render(),
    shortcut,
  };
  return dlg;
}

function sharedDialog() {
  if (shared && shared.isConnected) return shared;
  shared = document.createElement('dialog');
  shared.setAttribute('data-xz-command', '');
  shared.setAttribute('data-xz-shortcut', 'none');
  document.body.append(shared);
  build(shared);
  return shared;
}

const resolveTarget = (target) => (typeof target === 'string' ? document.querySelector(target) : target instanceof Element ? target : null);

/**
 * Xsenze.command.open(options) opens a palette with your items and returns a promise of the chosen item (or null).
 * Xsenze.command.open('#palette') opens a palette that is in the page.
 * Items: { label, group, href, run(item), icon, meta, keywords, kbd, pin }.
 */
export const command = {
  open(target, options) {
    const el = resolveTarget(target);
    if (el) {
      if (!el.xzCommand) build(el);
      return el.xzCommand.open(options || {});
    }
    const dlg = sharedDialog();
    return dlg.xzCommand.open(target || {});
  },
  close() {
    for (const d of $$('dialog[data-xz-command][open]')) closeDialog(d);
  },
  /** Add items (an array) or a provider function (query, { signal }) => items to a palette. Returns a function that removes them. */
  register(itemsOrProvider, { palette } = {}) {
    const dlg = resolveTarget(palette) || document.querySelector('dialog[data-xz-command]') || sharedDialog();
    if (!dlg.xzCommand) build(dlg);
    if (!extra.has(dlg)) extra.set(dlg, new Set());
    const value = Array.isArray(itemsOrProvider) ? itemsOrProvider.map((it, i) => ({ order: i, ...it })) : itemsOrProvider;
    extra.get(dlg).add(value);
    dlg.xzCommand.refresh();
    return () => {
      extra.get(dlg)?.delete(value);
      dlg.xzCommand.refresh();
    };
  },
};
