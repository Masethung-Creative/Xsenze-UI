// Calendar month view: events on a month grid, and a list of the chosen day's events.
// <section class="xz-calendar-view" data-xz-calendar aria-label="Events"> with
// <ol class="xz-calendar-view__events"><li data-date="2026-11-18" data-time="10:00" data-color="info"><a href="…">Parents' meeting</a></li></ol>
// Without the script the list reads as an agenda; on phones the script shows an agenda too.
import { $$, ready, fire, esc, nextId, dirKey } from './shared.js';
import { toIso, fromIso, addDays, monthDays, MONTHS, DAYS } from './dates.js';

const COLORS = ['success', 'warning', 'danger', 'info', 'accent'];
const colorOf = (c) => (!c ? 'var(--xz-accent-2)' : COLORS.includes(c) ? (c === 'accent' ? 'var(--xz-accent-2)' : `var(--xz-${c})`) : /^viz-\d$/.test(c) ? `var(--xz-${c})` : c);

export function initCalendars(root, { icon = () => '' } = {}) {
  for (const el of $$('[data-xz-calendar]', root)) {
    if (ready(el, 'Calendar')) continue;
    setup(el, icon);
  }
}

function setup(el, icon) {
  el.classList.add('xz-calendar-view', 'is-ready');
  const id = nextId('cal');
  const weekStart = Number(el.getAttribute('data-xz-week-start') ?? 1);
  const url = el.getAttribute('data-xz-calendar-url');
  const source = el.querySelector('.xz-calendar-view__events');
  const read = (li) => {
    const time = li.querySelector('time[datetime]');
    const date = li.getAttribute('data-date') || time?.getAttribute('datetime');
    const link = li.querySelector('a[href]');
    return { title: (li.querySelector('[data-title]') || link || li).textContent.trim(), date: date?.slice(0, 10), end: (li.getAttribute('data-end') || '').slice(0, 10) || null, time: li.getAttribute('data-time') || '', href: link?.getAttribute('href') || '', color: li.getAttribute('data-color') || '' };
  };
  let events = source ? $$(':scope > li', source).map(read).filter((e) => e.date) : [];
  const today = new Date();
  const start = fromIso(el.getAttribute('data-xz-month') ? `${el.getAttribute('data-xz-month')}-01` : '') || new Date(today.getFullYear(), today.getMonth(), 1);
  const state = { year: start.getFullYear(), month: start.getMonth(), focus: null, selected: null, remote: [] };

  const all = () => [...events, ...state.remote];
  const on = (iso) => all()
    .filter((e) => (e.end ? e.date <= iso && iso <= e.end : e.date === iso))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const label = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${DAYS[d.getDay()]}`;
  const eventHtml = (e) => {
    const name = e.href ? `<a href="${esc(e.href)}">${esc(e.title)}</a>` : esc(e.title);
    return `<li style="--_c:${esc(colorOf(e.color))}">${e.time ? `<span class="xz-calendar-view__time">${esc(e.time)}</span>` : ''}${name}</li>`;
  };

  el.insertAdjacentHTML(
    'afterbegin',
    `<div class="xz-calendar-view__head">
      <h3 class="xz-calendar-view__title" id="${id}-title" aria-live="polite"></h3>
      <div class="xz-calendar-view__nav">
        <button type="button" class="xz-btn xz-btn--sm" data-cal="today">Today</button>
        <button type="button" class="xz-btn xz-btn--ghost xz-btn--icon xz-btn--sm" data-cal="prev" aria-label="Previous month">${icon('chevron-left', { size: 'sm' })}</button>
        <button type="button" class="xz-btn xz-btn--ghost xz-btn--icon xz-btn--sm" data-cal="next" aria-label="Next month">${icon('chevron-right', { size: 'sm' })}</button>
      </div>
    </div>
    <table class="xz-calendar-view__grid" role="grid" aria-labelledby="${id}-title"></table>
    <div class="xz-calendar-view__agenda"></div>
    <div class="xz-calendar-view__day" aria-live="polite"></div>`,
  );
  const title = el.querySelector('.xz-calendar-view__title');
  const grid = el.querySelector('.xz-calendar-view__grid');
  const agenda = el.querySelector('.xz-calendar-view__agenda');
  const dayBox = el.querySelector('.xz-calendar-view__day');

  const draw = () => {
    const days = monthDays(state.year, state.month, weekStart);
    const first = new Date(state.year, state.month, 1);
    const last = new Date(state.year, state.month + 1, 0);
    if (!state.focus || state.focus.getMonth() !== state.month || state.focus.getFullYear() !== state.year) state.focus = state.selected && state.selected.getMonth() === state.month && state.selected.getFullYear() === state.year ? state.selected : today.getMonth() === state.month && today.getFullYear() === state.year ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : first;
    title.textContent = `${MONTHS[state.month]} ${state.year}`;
    const head = Array.from({ length: 7 }, (_, i) => DAYS[(weekStart + i) % 7]);
    let rows = '';
    for (let w = 0; w < days.length; w += 7) {
      rows += '<tr>';
      for (const d of days.slice(w, w + 7)) {
        const iso = toIso(d);
        const list = on(iso);
        const outside = d.getMonth() !== state.month;
        const isToday = toIso(today) === iso;
        const sel = state.selected && toIso(state.selected) === iso;
        const chips = list.slice(0, 3).map((e) => `<li style="--_c:${esc(colorOf(e.color))}">${esc(e.title)}</li>`).join('') + (list.length > 3 ? `<li class="is-more">+${list.length - 3} more</li>` : '');
        rows += `<td role="gridcell" aria-selected="${Boolean(sel)}" class="${outside ? 'is-outside' : ''}${isToday ? ' is-today' : ''}"><button type="button" class="xz-calendar-view__date" data-date="${iso}" tabindex="${toIso(state.focus) === iso ? 0 : -1}" aria-label="${label(d)}${list.length ? `, ${list.length} event${list.length === 1 ? '' : 's'}` : ''}"${isToday ? ' aria-current="date"' : ''}><span class="xz-calendar-view__num">${d.getDate()}</span></button>${list.length ? `<ul class="xz-calendar-view__chips" aria-hidden="true">${chips}</ul>` : ''}</td>`;
      }
      rows += '</tr>';
    }
    grid.innerHTML = `<thead><tr>${head.map((n) => `<th scope="col" abbr="${n}">${n.slice(0, 3)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;
    // Agenda for phones: this month's days that have events.
    let html = '';
    for (let d = first; d <= last; d = addDays(d, 1)) {
      const list = on(toIso(d));
      if (list.length) html += `<h4 class="xz-calendar-view__agenda-day">${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}</h4><ul class="xz-calendar-view__list">${list.map(eventHtml).join('')}</ul>`;
    }
    agenda.innerHTML = html || '<p class="xz-calendar-view__empty">No events this month.</p>';
    showDay();
  };
  const showDay = () => {
    const d = state.selected;
    // The day box always shows, with a hint before a day is picked, so the calendar keeps its height.
    dayBox.hidden = false;
    if (!d) return (dayBox.innerHTML = '<p class="xz-calendar-view__empty">Pick a day to see its events.</p>');
    const list = on(toIso(d));
    dayBox.innerHTML = `<h4 class="xz-calendar-view__agenda-day">${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}</h4>${list.length ? `<ul class="xz-calendar-view__list">${list.map(eventHtml).join('')}</ul>` : '<p class="xz-calendar-view__empty">No events on this day.</p>'}`;
  };
  const load = async () => {
    const from = toIso(monthDays(state.year, state.month, weekStart)[0]);
    const days = monthDays(state.year, state.month, weekStart);
    const to = toIso(days[days.length - 1]);
    fire(el, 'xz:month', { month: `${state.year}-${String(state.month + 1).padStart(2, '0')}`, start: from, end: to });
    if (!url) return;
    try {
      const res = await fetch(url.replace('{start}', from).replace('{end}', to), { headers: { Accept: 'application/json' } });
      const data = res.ok ? await res.json() : [];
      state.remote = (Array.isArray(data) ? data : []).map((e) => ({ title: String(e.title || ''), date: String(e.date || '').slice(0, 10), end: e.end ? String(e.end).slice(0, 10) : null, time: e.time || '', href: e.href || '', color: e.color || '' }));
      draw();
    } catch {
      /* the month still shows the events in the page */
    }
  };
  const go = (year, month) => {
    const d = new Date(year, month, 1);
    state.year = d.getFullYear();
    state.month = d.getMonth();
    state.focus = null;
    draw();
    load();
  };
  const select = (d) => {
    const iso = toIso(d);
    if (!fire(el, 'xz:day', { date: iso, events: on(iso) }, true)) return;
    state.selected = d;
    for (const td of grid.querySelectorAll('td')) td.setAttribute('aria-selected', String(td.querySelector('button')?.dataset.date === iso));
    showDay();
  };
  const focusDay = (d) => {
    if (d.getMonth() !== state.month || d.getFullYear() !== state.year) {
      state.year = d.getFullYear();
      state.month = d.getMonth();
      state.focus = d;
      draw();
      load();
    } else state.focus = d;
    for (const b of grid.querySelectorAll('button')) b.tabIndex = b.dataset.date === toIso(d) ? 0 : -1;
    grid.querySelector(`button[data-date="${toIso(d)}"]`)?.focus();
  };

  el.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-cal]')?.dataset.cal;
    if (nav === 'prev') return go(state.year, state.month - 1);
    if (nav === 'next') return go(state.year, state.month + 1);
    if (nav === 'today') {
      go(today.getFullYear(), today.getMonth());
      return select(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    }
    const day = e.target.closest('.xz-calendar-view__date');
    if (day) {
      const d = fromIso(day.dataset.date);
      if (d.getMonth() !== state.month) focusDay(d);
      select(d);
    }
  });
  grid.addEventListener('keydown', (e) => {
    const b = e.target.closest('.xz-calendar-view__date');
    if (!b) return;
    const d = fromIso(b.dataset.date);
    const dir = dirKey(e, el);
    const week = (d.getDay() - weekStart + 7) % 7;
    const next = dir === 'next' ? addDays(d, 1) : dir === 'prev' ? addDays(d, -1) : { ArrowDown: addDays(d, 7), ArrowUp: addDays(d, -7), Home: addDays(d, -week), End: addDays(d, 6 - week), PageDown: new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28)), PageUp: new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), 28)) }[e.key];
    if (!next) return;
    e.preventDefault();
    focusDay(next);
  });

  el.xzCalendar = {
    go: (month) => {
      const d = month instanceof Date ? month : fromIso(`${month}-01`);
      if (d) go(d.getFullYear(), d.getMonth());
    },
    select: (date) => {
      const d = date instanceof Date ? date : fromIso(date);
      if (d) {
        focusDay(d);
        select(d);
      }
    },
    setEvents: (list) => {
      events = (list || []).map((e) => ({ title: String(e.title || ''), date: String(e.date || '').slice(0, 10), end: e.end ? String(e.end).slice(0, 10) : null, time: e.time || '', href: e.href || '', color: e.color || '' }));
      draw();
    },
    month: () => `${state.year}-${String(state.month + 1).padStart(2, '0')}`,
  };
  draw();
  load();
}
