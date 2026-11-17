// Advanced form controls: slider, number stepper, one-time code, tag input, file upload,
// date picker (single and range), time picker and a small rich text editor.
// Each control keeps a real form field up to date, so a normal form post still works.
import { place } from './place.js';

const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const ready = (el) => {
  if (el.dataset.xzReady) return true;
  el.dataset.xzReady = '1';
  return false;
};
const fire = (el, type, detail) => el.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
const changed = (el) => {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let uid = 0;

// Only one picker panel is open at a time. A press outside it closes it.
let openPanel = null;
let globalBound = false;
function bindGlobal() {
  if (globalBound) return;
  globalBound = true;
  document.addEventListener('pointerdown', (e) => {
    if (openPanel && !openPanel.el.contains(e.target)) openPanel.close();
  });
  // An open panel is pinned to the viewport, so close it when the page moves under it.
  addEventListener('resize', () => openPanel?.close());
  document.addEventListener('scroll', (e) => openPanel && !openPanel.el.contains(e.target) && openPanel.close(), true);
}

// ---------- slider ----------
function initSliders(root) {
  for (const el of $$('input[type="range"].xz-slider', root)) {
    if (ready(el)) continue;
    const out = el.id ? document.querySelector(`output[for="${el.id}"]`) : null;
    const paint = () => {
      const min = Number(el.min || 0);
      const max = Number(el.max || 100);
      el.style.setProperty('--_fill', `${max > min ? ((el.value - min) / (max - min)) * 100 : 0}%`);
      if (out) out.textContent = (el.dataset.xzPrefix || '') + Number(el.value).toLocaleString('en-IN') + (el.dataset.xzSuffix || '');
    };
    el.addEventListener('input', paint);
    paint();
  }
}

// ---------- number stepper ----------
function initSteppers(root) {
  for (const el of $$('[data-xz-stepper]', root)) {
    if (ready(el)) continue;
    const input = el.querySelector('input');
    if (!input) continue;
    const buttons = $$('[data-xz-step]', el);
    const sync = () => {
      const value = Number(input.value);
      for (const btn of buttons) {
        const dir = Number(btn.dataset.xzStep);
        btn.disabled = input.disabled || (dir < 0 && input.min !== '' && value <= Number(input.min)) || (dir > 0 && input.max !== '' && value >= Number(input.max));
      }
    };
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-xz-step]');
      if (!btn) return;
      if (input.value === '') input.value = input.min || '0';
      else if (Number(btn.dataset.xzStep) > 0) input.stepUp();
      else input.stepDown();
      changed(input);
    });
    input.addEventListener('input', sync);
    sync();
  }
}

// ---------- one-time code ----------
function initOtps(root) {
  for (const el of $$('[data-xz-otp]', root)) {
    if (ready(el)) continue;
    const cells = $$('.xz-otp__cell', el);
    const hidden = el.querySelector('input[type="hidden"]');
    // A longer limit lets the browser autofill a whole code into one cell; the script then spreads it out.
    for (const c of cells) c.maxLength = cells.length;
    const sync = () => {
      const value = cells.map((c) => c.value).join('');
      if (hidden) hidden.value = value;
      if (value.length === cells.length) fire(el, 'xz:otp-complete', { value });
    };
    const spread = (text, from) => {
      const digits = text.replace(/\D/g, '').slice(0, cells.length - from).split('');
      digits.forEach((d, i) => (cells[from + i].value = d));
      cells[Math.min(from + digits.length, cells.length - 1)].focus();
      sync();
    };
    cells.forEach((cell, i) => {
      cell.addEventListener('input', () => {
        const digits = cell.value.replace(/\D/g, '');
        cell.value = '';
        if (digits.length > 1) return spread(digits, i);
        cell.value = digits;
        if (digits && i < cells.length - 1) cells[i + 1].focus();
        sync();
      });
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !cell.value && i > 0) {
          e.preventDefault();
          cells[i - 1].value = '';
          cells[i - 1].focus();
          sync();
        } else if (e.key === 'ArrowLeft' && i > 0) {
          e.preventDefault();
          cells[i - 1].focus();
        } else if (e.key === 'ArrowRight' && i < cells.length - 1) {
          e.preventDefault();
          cells[i + 1].focus();
        }
      });
      cell.addEventListener('paste', (e) => {
        e.preventDefault();
        spread(e.clipboardData.getData('text'), i);
      });
      cell.addEventListener('focus', () => cell.select());
    });
  }
}

// ---------- tag input ----------
function initTagInputs(root, icon) {
  for (const el of $$('[data-xz-tag-input]', root)) {
    if (ready(el)) continue;
    const field = el.querySelector('.xz-tag-input__field');
    const hidden = el.querySelector('input[type="hidden"]');
    if (!field) continue;
    let list = el.querySelector('.xz-tag-input__list');
    if (!list) {
      list = Object.assign(document.createElement('ul'), { className: 'xz-tag-input__list' });
      el.prepend(list);
    }
    const live = Object.assign(document.createElement('span'), { className: 'xz-sr-only' });
    live.setAttribute('aria-live', 'polite');
    el.append(live);
    const max = Number(el.dataset.xzMax) || Infinity;
    let tags = (hidden?.value || '').split(',').map((s) => s.trim()).filter(Boolean);
    const render = () => {
      list.innerHTML = tags.map((t, i) => `<li><span class="xz-chip">${esc(t)}<button type="button" class="xz-chip__remove" data-index="${i}" aria-label="Remove ${esc(t)}">${icon('x', { size: 'xs' })}</button></span></li>`).join('');
      if (hidden) hidden.value = tags.join(',');
      fire(el, 'xz:tags', { tags: [...tags] });
    };
    const add = (raw) => {
      for (const part of raw.split(',')) {
        const tag = part.trim();
        if (!tag) continue;
        if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) live.textContent = `${tag} is already in the list`;
        else if (tags.length >= max) {
          live.textContent = `You can add up to ${max}`;
          el.classList.add('is-invalid');
          break;
        } else {
          tags.push(tag);
          live.textContent = `${tag} added`;
        }
      }
      render();
    };
    field.addEventListener('keydown', (e) => {
      el.classList.remove('is-invalid');
      if ((e.key === 'Enter' || e.key === ',') && field.value.trim()) {
        e.preventDefault();
        add(field.value);
        field.value = '';
      } else if (e.key === 'Backspace' && !field.value && tags.length) {
        live.textContent = `${tags.pop()} removed`;
        render();
      }
    });
    field.addEventListener('input', () => {
      if (!field.value.includes(',')) return;
      add(field.value);
      field.value = '';
    });
    field.addEventListener('blur', () => {
      if (!field.value.trim()) return;
      add(field.value);
      field.value = '';
    });
    el.addEventListener('click', (e) => {
      const remove = e.target.closest('.xz-chip__remove');
      if (remove) {
        live.textContent = `${tags.splice(Number(remove.dataset.index), 1)[0]} removed`;
        el.classList.remove('is-invalid');
        render();
      }
      field.focus();
    });
    render();
  }
}

// ---------- file upload ----------
const fileSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
function initDropzones(root, icon) {
  for (const el of $$('[data-xz-dropzone]', root)) {
    if (ready(el)) continue;
    const input = el.querySelector('input[type="file"]');
    if (!input) continue;
    let list = el.querySelector('.xz-dropzone__list');
    if (!list) {
      list = Object.assign(document.createElement('ul'), { className: 'xz-dropzone__list' });
      el.append(list);
    }
    list.setAttribute('aria-live', 'polite');
    const maxMb = Number(el.dataset.xzMaxSize) || 0;
    const maxFiles = Number(el.dataset.xzMaxFiles) || Infinity;
    let files = [];
    let rejected = [];
    const accepts = (file) => {
      const rules = (input.accept || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      const name = file.name.toLowerCase();
      const type = file.type.toLowerCase();
      return !rules.length || rules.some((r) => (r.startsWith('.') ? name.endsWith(r) : r.endsWith('/*') ? type.startsWith(r.slice(0, -1)) : type === r));
    };
    const render = () => {
      list.innerHTML =
        files.map((f, i) => `<li class="xz-dropzone__file">${icon('file-text', { size: 'sm' })}<span class="xz-dropzone__name">${esc(f.name)}</span><span class="xz-dropzone__meta">${fileSize(f.size)}</span><button type="button" class="xz-btn xz-btn--ghost xz-btn--icon xz-btn--sm" data-index="${i}" aria-label="Remove ${esc(f.name)}">${icon('x', { size: 'sm' })}</button></li>`).join('') +
        rejected.map(([f, why]) => `<li class="xz-dropzone__file is-error">${icon('circle-alert', { size: 'sm' })}<span class="xz-dropzone__name">${esc(f.name)}</span><span class="xz-dropzone__meta">${esc(why)}</span></li>`).join('');
    };
    const commit = () => {
      // Put the kept files back on the real input, so the form sends exactly what the list shows.
      const dt = new DataTransfer();
      for (const f of files) dt.items.add(f);
      input.files = dt.files;
      render();
      fire(el, 'xz:files', { files: [...files], rejected: rejected.map(([f, why]) => ({ file: f, reason: why })) });
    };
    const take = (incoming) => {
      rejected = [];
      for (const f of incoming) {
        if (!accepts(f)) rejected.push([f, 'This file type is not allowed']);
        else if (maxMb && f.size > maxMb * 1024 * 1024) rejected.push([f, `Larger than ${maxMb} MB`]);
        else if (!input.multiple) files = [f];
        else if (files.some((x) => x.name === f.name && x.size === f.size)) continue;
        else if (files.length >= maxFiles) rejected.push([f, `Only ${maxFiles} files can be added`]);
        else files.push(f);
      }
      commit();
    };
    input.addEventListener('change', () => take([...input.files]));
    for (const type of ['dragenter', 'dragover']) {
      el.addEventListener(type, (e) => {
        e.preventDefault();
        el.classList.add('is-dragover');
      });
    }
    el.addEventListener('dragleave', (e) => !el.contains(e.relatedTarget) && el.classList.remove('is-dragover'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('is-dragover');
      take([...e.dataTransfer.files]);
    });
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-index]');
      if (!btn) return;
      files.splice(Number(btn.dataset.index), 1);
      rejected = [];
      commit();
      input.focus();
    });
  }
}

// ---------- dates ----------
const pad = (n) => String(n).padStart(2, '0');
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const showDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
/** "5/3/26", "05-03-2026" and "5.3.2026" all mean 5 March 2026. Day comes first. */
function parseDate(text) {
  const m = /^\s*(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{2}|\d{4})\s*$/.exec(text);
  if (!m) return null;
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(year, Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d : null;
}
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function initDatepickers(root, icon) {
  for (const el of $$('[data-xz-datepicker]', root)) {
    if (ready(el)) continue;
    const range = el.dataset.xzDatepicker === 'range';
    const input = el.querySelector('input:not([type="hidden"])');
    const trigger = el.querySelector('button');
    const hidden = $$('input[type="hidden"]', el);
    if (!input) continue;
    const min = fromIso(el.dataset.xzMin);
    const max = fromIso(el.dataset.xzMax);
    const weekStart = el.dataset.xzWeekStart === '0' ? 0 : 1;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const clamp = (d) => (min && d < min ? min : max && d > max ? max : d);
    const off = (d) => (min && d < min) || (max && d > max);
    let start = fromIso(hidden[0]?.value);
    let end = range ? fromIso(hidden[1]?.value) : null;
    let cursor = clamp(start || today);

    const panel = document.createElement('div');
    panel.className = 'xz-picker xz-calendar';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', range ? 'Choose dates' : 'Choose a date');
    el.append(panel);
    input.setAttribute('autocomplete', 'off');
    trigger?.setAttribute('aria-haspopup', 'dialog');
    trigger?.setAttribute('aria-expanded', 'false');

    const write = () => {
      input.value = start ? showDate(start) + (range && end ? ` – ${showDate(end)}` : '') : '';
      if (hidden[0]) hidden[0].value = start ? toIso(start) : '';
      if (range && hidden[1]) hidden[1].value = end ? toIso(end) : '';
      input.removeAttribute('aria-invalid');
      fire(el, 'xz:date', { start: start ? toIso(start) : '', end: end ? toIso(end) : '' });
    };
    const draw = () => {
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const lead = (first.getDay() - weekStart + 7) % 7;
      const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      const weeks = Math.ceil((lead + daysInMonth) / 7);
      let rows = '';
      for (let w = 0; w < weeks; w++) {
        rows += '<tr>';
        for (let i = 0; i < 7; i++) {
          const d = addDays(first, w * 7 + i - lead);
          const selected = sameDay(d, start) || sameDay(d, end);
          const cls = ['xz-calendar__day', d.getMonth() !== cursor.getMonth() && 'is-outside', sameDay(d, today) && 'is-today', range && start && end && d > start && d < end && 'is-in-range'].filter(Boolean).join(' ');
          rows += `<td role="gridcell"><button type="button" class="${cls}" data-date="${toIso(d)}" tabindex="${sameDay(d, cursor) ? 0 : -1}" aria-label="${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${DAYS[d.getDay()]}"${selected ? ' aria-selected="true"' : ''}${off(d) ? ' disabled' : ''}>${d.getDate()}</button></td>`;
        }
        rows += '</tr>';
      }
      const heads = Array.from({ length: 7 }, (_, i) => DAYS[(i + weekStart) % 7]).map((n) => `<th scope="col"><abbr title="${n}" style="text-decoration:none">${n.slice(0, 2)}</abbr></th>`).join('');
      const hint = range ? (start && !end ? 'Now pick the end date' : 'Pick the start date') : '';
      panel.innerHTML = `
        <div class="xz-calendar__header">
          <button type="button" class="xz-btn xz-btn--ghost xz-btn--icon xz-btn--sm" data-nav="-1" aria-label="Previous month">${icon('chevron-left', { size: 'sm' })}</button>
          <div class="xz-calendar__title" aria-live="polite">${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}</div>
          <button type="button" class="xz-btn xz-btn--ghost xz-btn--icon xz-btn--sm" data-nav="1" aria-label="Next month">${icon('chevron-right', { size: 'sm' })}</button>
        </div>
        <table class="xz-calendar__grid" role="grid"><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table>
        <div class="xz-calendar__footer">
          <button type="button" class="xz-btn xz-btn--ghost xz-btn--sm" data-today${off(today) ? ' disabled' : ''}>Today</button>
          <span class="xz-calendar__hint">${hint}</span>
          <button type="button" class="xz-btn xz-btn--ghost xz-btn--sm" data-clear>Clear</button>
        </div>`;
    };
    const focusCursor = () => panel.querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
    const api = {
      el,
      close(focus) {
        if (panel.hidden) return;
        panel.hidden = true;
        trigger?.setAttribute('aria-expanded', 'false');
        if (openPanel === api) openPanel = null;
        if (focus) (trigger || input).focus({ preventScroll: true });
      },
    };
    const open = () => {
      openPanel?.close();
      cursor = clamp(start || today);
      draw();
      panel.hidden = false;
      place(panel, input.closest('.xz-input-group') || input);
      trigger?.setAttribute('aria-expanded', 'true');
      openPanel = api;
      focusCursor();
    };
    const choose = (d) => {
      if (off(d)) return;
      if (!range) {
        start = d;
        write();
        return api.close(true);
      }
      if (!start || end) [start, end] = [d, null];
      else if (d < start) start = d;
      else end = d;
      cursor = d;
      write();
      if (end) return api.close(true);
      draw();
      focusCursor();
    };

    trigger?.addEventListener('click', () => (panel.hidden ? open() : api.close(true)));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        open();
      }
    });
    input.addEventListener('change', () => {
      const text = input.value.trim();
      if (!text) {
        [start, end] = [null, null];
        return write();
      }
      const parts = range ? text.split(/\s+(?:–|—|-|to)\s+|–|—/) : [text];
      const a = parseDate(parts[0] || '');
      const b = range && parts[1] ? parseDate(parts[1]) : null;
      if (!a || off(a) || (range && parts[1] && (!b || off(b) || b < a)) || parts.length > 2) return input.setAttribute('aria-invalid', 'true');
      [start, end] = [a, b];
      write();
    });
    panel.addEventListener('click', (e) => {
      const day = e.target.closest('[data-date]');
      const nav = e.target.closest('[data-nav]');
      if (day) choose(fromIso(day.dataset.date));
      else if (nav) {
        cursor = clamp(new Date(cursor.getFullYear(), cursor.getMonth() + Number(nav.dataset.nav), 1));
        draw();
        panel.querySelector(`[data-nav="${nav.dataset.nav}"]`).focus({ preventScroll: true });
      } else if (e.target.closest('[data-today]')) choose(today);
      else if (e.target.closest('[data-clear]')) {
        [start, end] = [null, null];
        write();
        api.close(true);
      }
    });
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        return api.close(true);
      }
      if (!e.target.closest('[data-date]')) return;
      const dow = (cursor.getDay() - weekStart + 7) % 7;
      const next = { ArrowLeft: addDays(cursor, -1), ArrowRight: addDays(cursor, 1), ArrowUp: addDays(cursor, -7), ArrowDown: addDays(cursor, 7), Home: addDays(cursor, -dow), End: addDays(cursor, 6 - dow), PageUp: new Date(cursor.getFullYear(), cursor.getMonth() - 1, cursor.getDate()), PageDown: new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()) }[e.key];
      if (!next) return;
      e.preventDefault();
      cursor = clamp(next);
      draw();
      focusCursor();
    });
    el.addEventListener('focusout', () => setTimeout(() => !el.contains(document.activeElement) && api.close(), 0));
    if (start) write();
  }
}

// ---------- time ----------
const showTime = (mins) => {
  const h = Math.floor(mins / 60);
  return `${h % 12 || 12}:${pad(mins % 60)} ${h < 12 ? 'am' : 'pm'}`;
};
const toHm = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
const fromHm = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : null;
};
/** "2:30 pm", "230pm", "14:30" and "9" are all understood. */
function parseTime(text) {
  const m = /^\s*(\d{1,2})(?:[:.]?(\d{2}))?\s*(a|p|am|pm)?\s*$/i.exec(text);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const half = (m[3] || '').toLowerCase()[0];
  if (min > 59 || (half ? h < 1 || h > 12 : h > 23)) return null;
  if (half === 'p' && h < 12) h += 12;
  if (half === 'a' && h === 12) h = 0;
  return h * 60 + min;
}

function initTimepickers(root) {
  for (const el of $$('[data-xz-timepicker]', root)) {
    if (ready(el)) continue;
    const input = el.querySelector('input:not([type="hidden"])');
    const trigger = el.querySelector('button');
    const hidden = el.querySelector('input[type="hidden"]');
    if (!input) continue;
    const step = Math.max(1, Number(el.dataset.xzStep) || 30);
    const min = fromHm(el.dataset.xzMin) ?? 0;
    const max = fromHm(el.dataset.xzMax) ?? 23 * 60 + 59;
    const times = [];
    for (let t = min; t <= max; t += step) times.push(t);
    let value = fromHm(hidden?.value);
    let active = -1;

    const list = document.createElement('ul');
    list.className = 'xz-picker xz-timelist';
    list.id = `xz-time-${++uid}`;
    list.hidden = true;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Times');
    list.innerHTML = times.map((t, i) => `<li class="xz-timelist__option" role="option" id="${list.id}-${i}" data-index="${i}">${showTime(t)}</li>`).join('');
    el.append(list);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-controls', list.id);
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'none');
    input.setAttribute('autocomplete', 'off');

    const mark = () => {
      for (const [i, li] of [...list.children].entries()) {
        li.classList.toggle('is-active', i === active);
        li.setAttribute('aria-selected', String(times[i] === value));
      }
      if (active >= 0) {
        input.setAttribute('aria-activedescendant', `${list.id}-${active}`);
        // Scroll only the list, never the page.
        const li = list.children[active];
        if (li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop;
        else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight;
      } else input.removeAttribute('aria-activedescendant');
    };
    const write = () => {
      input.value = value === null ? '' : showTime(value);
      if (hidden) hidden.value = value === null ? '' : toHm(value);
      input.removeAttribute('aria-invalid');
      fire(el, 'xz:time', { value: value === null ? '' : toHm(value) });
    };
    const api = {
      el,
      close() {
        if (list.hidden) return;
        list.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        active = -1;
        mark();
        if (openPanel === api) openPanel = null;
      },
    };
    const open = () => {
      openPanel?.close();
      list.hidden = false;
      place(list, input.closest('.xz-input-group') || input);
      input.setAttribute('aria-expanded', 'true');
      openPanel = api;
      // Start on the chosen time, or the first time at or after it.
      active = value === null ? 0 : Math.max(0, times.findIndex((t) => t >= value));
      mark();
    };
    const choose = (i) => {
      value = times[i];
      write();
      api.close();
      input.focus();
    };

    trigger?.addEventListener('click', () => {
      if (list.hidden) open();
      else api.close();
      input.focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (list.hidden) return open();
        active = Math.min(times.length - 1, Math.max(0, active + (e.key === 'ArrowDown' ? 1 : -1)));
        mark();
      } else if (e.key === 'Enter' && !list.hidden && active >= 0) {
        e.preventDefault();
        choose(active);
      } else if (e.key === 'Escape' && !list.hidden) {
        e.stopPropagation();
        api.close();
      }
    });
    input.addEventListener('change', () => {
      const text = input.value.trim();
      if (!text) {
        value = null;
        return write();
      }
      const t = parseTime(text);
      if (t === null || t < min || t > max) return input.setAttribute('aria-invalid', 'true');
      value = t;
      write();
    });
    list.addEventListener('pointerdown', (e) => e.preventDefault()); // keep focus in the field
    list.addEventListener('click', (e) => {
      const li = e.target.closest('[data-index]');
      if (li) choose(Number(li.dataset.index));
    });
    el.addEventListener('focusout', () => setTimeout(() => !el.contains(document.activeElement) && api.close(), 0));
    if (value !== null) write();
  }
}

// ---------- rich text editor ----------
const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'P', 'BR', 'UL', 'OL', 'LI', 'H3', 'A', 'BLOCKQUOTE', 'PRE', 'CODE']);
const SAFE_LINK = /^(https?:|mailto:)/i;
/** Keeps a short list of tags, drops every attribute except a safe link address. Clean the HTML again on the server. */
export function sanitize(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 8) child.remove();
      if (child.nodeType !== 1) continue;
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(child.tagName)) {
        child.remove();
        continue;
      }
      walk(child);
      if (child.tagName === 'DIV') {
        const p = document.createElement('p');
        p.append(...child.childNodes);
        child.replaceWith(p);
      } else if (!ALLOWED.has(child.tagName)) child.replaceWith(...child.childNodes);
      else {
        const href = child.tagName === 'A' ? child.getAttribute('href') || '' : '';
        for (const attr of [...child.attributes]) child.removeAttribute(attr.name);
        if (child.tagName === 'A') {
          if (SAFE_LINK.test(href)) {
            child.setAttribute('href', href);
            child.setAttribute('rel', 'noopener noreferrer');
          } else child.replaceWith(...child.childNodes);
        }
      }
    }
  };
  walk(tpl.content);
  return tpl.innerHTML.trim();
}

function initEditors(root) {
  for (const el of $$('[data-xz-editor]', root)) {
    if (ready(el)) continue;
    const content = el.querySelector('.xz-editor__content');
    const field = el.querySelector('textarea');
    const counter = el.querySelector('[data-xz-editor-count]');
    if (!content) continue;
    if (field?.value.trim() && !content.innerHTML.trim()) content.innerHTML = sanitize(field.value);
    const buttons = $$('[data-xz-cmd]', el);
    const exec = (cmd, arg) => document.execCommand(cmd, false, arg);
    const block = () => String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, '');
    const inside = () => {
      const sel = document.getSelection();
      return sel && sel.rangeCount && content.contains(sel.anchorNode);
    };
    const state = () => {
      for (const btn of buttons) {
        const cmd = btn.dataset.xzCmd;
        if (cmd === 'h3' || cmd === 'quote' || cmd === 'code') btn.setAttribute('aria-pressed', String(inside() && block() === { h3: 'h3', quote: 'blockquote', code: 'pre' }[cmd]));
        else if (['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'].includes(cmd)) btn.setAttribute('aria-pressed', String(inside() && document.queryCommandState(cmd)));
      }
    };
    const sync = () => {
      const empty = !content.textContent.trim() && !content.querySelector('li');
      if (field) field.value = empty ? '' : sanitize(content.innerHTML);
      if (counter) counter.textContent = `${content.textContent.trim().length} characters`;
      fire(el, 'xz:editor', { html: field ? field.value : sanitize(content.innerHTML) });
    };
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-xz-cmd]');
      if (!btn) return;
      const cmd = btn.dataset.xzCmd;
      content.focus();
      if (cmd === 'link') {
        const url = window.prompt('Link address', 'https://');
        if (url && SAFE_LINK.test(url.trim())) exec('createLink', url.trim());
      } else if (cmd === 'h3' || cmd === 'quote' || cmd === 'code') {
        // Heading, quote and code block switch the current paragraph, and switch it back when pressed again.
        const tag = { h3: 'h3', quote: 'blockquote', code: 'pre' }[cmd];
        exec('formatBlock', block() === tag ? 'p' : tag);
      } else exec(cmd);
      sync();
      state();
    });
    content.addEventListener('focus', () => exec('defaultParagraphSeparator', 'p'));
    content.addEventListener('input', sync);
    content.addEventListener('blur', () => {
      if (!content.textContent.trim() && !content.querySelector('li')) content.innerHTML = '';
      sync();
    });
    content.addEventListener('paste', (e) => {
      // Paste as plain text, so styles from other pages never get in.
      e.preventDefault();
      exec('insertText', e.clipboardData.getData('text/plain'));
    });
    for (const type of ['keyup', 'mouseup', 'focus']) content.addEventListener(type, state);
    sync();
    state();
  }
}

export function initAdvancedForms(root, { icon }) {
  bindGlobal();
  initSliders(root);
  initSteppers(root);
  initOtps(root);
  initTagInputs(root, icon);
  initDropzones(root, icon);
  initDatepickers(root, icon);
  initTimepickers(root);
  initEditors(root);
}
