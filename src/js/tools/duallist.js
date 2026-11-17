// Dual list: pick items from one list into another and put them in order.
// The markup is a fieldset of checkboxes, so a form gets the chosen values without the script.
// With it, two listboxes: click, Shift+click and Ctrl+click select; Enter or a double click moves;
// Alt+Up and Alt+Down reorder the chosen list. The checkboxes stay in the form, ticked and in order.
import { $, $$, ready, fire, nextId } from '../shared.js';

export function initDuallists(root, { icon }) {
  for (const el of $$('[data-xz-duallist]', root)) {
    if (ready(el, 'Duallist')) continue;
    const boxes = $$(':scope > label > input[type="checkbox"]', el);
    if (!boxes.length) continue;
    const [availLabel, chosenLabel] = (el.dataset.xzLabels || 'Available|Chosen').split('|');
    const [addLabel, removeLabel, upLabel, downLabel] = (el.dataset.xzButtons || 'Add|Remove|Up|Down').split('|');
    const status = Object.assign(document.createElement('p'), { className: 'xz-sr-only' });
    status.setAttribute('role', 'status');

    const body = Object.assign(document.createElement('div'), { className: 'xz-duallist__body' });
    const side = (title) => {
      const wrap = Object.assign(document.createElement('div'), { className: 'xz-duallist__side' });
      const head = Object.assign(document.createElement('p'), { className: 'xz-duallist__title', id: nextId('duallist') });
      const count = document.createElement('span');
      head.append(title, count);
      const list = Object.assign(document.createElement('ul'), { className: 'xz-duallist__list', tabIndex: 0 });
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-multiselectable', 'true');
      list.setAttribute('aria-labelledby', head.id);
      list.dataset.empty = el.dataset.xzEmpty || 'Nothing here';
      wrap.append(head, list);
      body.append(wrap);
      return { list, count, title };
    };
    const avail = side(availLabel);
    const chosen = side(chosenLabel);
    const button = (name, label, iconName) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'xz-panel__action' });
      b.innerHTML = `${icon(iconName, { size: 'sm' })}<span>${label}</span>`;
      b.setAttribute('aria-label', label);
      b.dataset.move = name;
      return b;
    };
    const actions = Object.assign(document.createElement('div'), { className: 'xz-duallist__actions' });
    const btn = {
      add: button('add', addLabel, 'chevron-right'),
      remove: button('remove', removeLabel, 'chevron-left'),
      up: button('up', upLabel, 'arrow-up'),
      down: button('down', downLabel, 'arrow-down'),
    };
    actions.append(btn.add, btn.remove, btn.up, btn.down);
    const summary = Object.assign(document.createElement('p'), { className: 'xz-duallist__summary' });
    el.append(body, actions, summary, status);

    // One option per checkbox, carrying the label's words and any <small> note.
    const options = boxes.map((box) => {
      const li = Object.assign(document.createElement('li'), { className: 'xz-duallist__option', id: nextId('option') });
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      for (const n of box.parentElement.childNodes) if (n !== box) li.append(n.cloneNode(true));
      if (box.disabled) li.setAttribute('aria-disabled', 'true');
      li.xzBox = box;
      return li;
    });
    for (const li of options) (li.xzBox.checked ? chosen : avail).list.append(li);
    const nameOf = (li) => li.firstChild?.textContent.trim() || li.xzBox.value;
    const optionsIn = (list) => $$('.xz-duallist__option', list);
    const selected = (list) => optionsIn(list).filter((o) => o.getAttribute('aria-selected') === 'true');
    const say = (text) => {
      status.textContent = '';
      setTimeout(() => (status.textContent = text), 30);
    };
    const anchor = new Map();

    const sync = (changed = []) => {
      for (const s of [avail, chosen]) s.count.textContent = String(optionsIn(s.list).length);
      // The form sends the ticked boxes in the chosen order, then the rest.
      const order = [...optionsIn(chosen.list), ...optionsIn(avail.list)];
      for (const li of order) {
        const box = li.xzBox;
        const on = li.parentElement === chosen.list;
        if (box.checked !== on) {
          box.checked = on;
          changed.push(box);
        }
        el.append(box.parentElement);
      }
      el.append(body, actions, summary, status);
      const names = optionsIn(chosen.list).map(nameOf);
      summary.textContent = names.length ? names.join(' / ') : el.dataset.xzEmpty || 'Nothing chosen';
      const selAvail = selected(avail.list).length;
      const selChosen = selected(chosen.list);
      const all = optionsIn(chosen.list);
      btn.add.disabled = !selAvail;
      btn.remove.disabled = !selChosen.length;
      btn.up.disabled = !selChosen.length || selChosen[0] === all[0];
      btn.down.disabled = !selChosen.length || selChosen[selChosen.length - 1] === all[all.length - 1];
      for (const box of changed) box.dispatchEvent(new Event('change', { bubbles: true }));
      if (changed.length) fire(el, 'xz:change', { value: names.length ? optionsIn(chosen.list).map((o) => o.xzBox.value) : [] });
    };

    const setActive = (list, li) => {
      for (const o of optionsIn(list)) o.classList.toggle('is-active', o === li);
      if (li) {
        list.setAttribute('aria-activedescendant', li.id);
        li.scrollIntoView({ block: 'nearest' });
      } else list.removeAttribute('aria-activedescendant');
    };
    const select = (list, li, { add = false, range = false } = {}) => {
      const all = optionsIn(list);
      if (range && anchor.get(list)) {
        const [a, b] = [all.indexOf(anchor.get(list)), all.indexOf(li)].sort((x, y) => x - y);
        all.forEach((o, i) => o.setAttribute('aria-selected', String(i >= a && i <= b && o.getAttribute('aria-disabled') !== 'true')));
      } else if (add) {
        li.setAttribute('aria-selected', String(li.getAttribute('aria-selected') !== 'true'));
        anchor.set(list, li);
      } else {
        all.forEach((o) => o.setAttribute('aria-selected', String(o === li && o.getAttribute('aria-disabled') !== 'true')));
        anchor.set(list, li);
      }
      setActive(list, li);
      sync();
    };
    const move = (from, to) => {
      const picked = selected(from.list).filter((o) => o.getAttribute('aria-disabled') !== 'true');
      if (!picked.length) return;
      const next = optionsIn(from.list).find((o, i, all) => i > all.indexOf(picked[picked.length - 1]) && !picked.includes(o)) || optionsIn(from.list).filter((o) => !picked.includes(o)).pop();
      for (const o of optionsIn(to.list)) o.setAttribute('aria-selected', 'false');
      for (const o of picked) to.list.append(o);
      setActive(to.list, picked[picked.length - 1]);
      setActive(from.list, next || null);
      if (next) next.setAttribute('aria-selected', 'false');
      say(picked.length === 1 ? `${nameOf(picked[0])} moved to ${to.title}` : `${picked.length} items moved to ${to.title}`);
      sync();
    };
    const reorder = (by) => {
      const picked = selected(chosen.list);
      if (!picked.length) return;
      const all = optionsIn(chosen.list);
      if (by < 0 && picked[0] === all[0]) return;
      if (by > 0 && picked[picked.length - 1] === all[all.length - 1]) return;
      if (by < 0) for (const o of picked) o.previousElementSibling.before(o);
      else for (const o of [...picked].reverse()) o.nextElementSibling.after(o);
      const pos = optionsIn(chosen.list).indexOf(picked[0]) + 1;
      say(`${picked.length === 1 ? nameOf(picked[0]) : `${picked.length} items`} moved ${by < 0 ? 'up' : 'down'}, ${pos} of ${all.length}`);
      setActive(chosen.list, picked[0]);
      sync();
    };

    for (const s of [avail, chosen]) {
      const other = s === avail ? chosen : avail;
      s.list.addEventListener('click', (e) => {
        const li = e.target.closest('.xz-duallist__option');
        if (!li || li.getAttribute('aria-disabled') === 'true') return;
        select(s.list, li, { add: e.ctrlKey || e.metaKey, range: e.shiftKey });
      });
      s.list.addEventListener('dblclick', (e) => {
        const li = e.target.closest('.xz-duallist__option');
        if (!li || li.getAttribute('aria-disabled') === 'true') return;
        select(s.list, li);
        move(s, other);
      });
      s.list.addEventListener('focus', () => {
        const all = optionsIn(s.list);
        if (all.length && !s.list.getAttribute('aria-activedescendant')) setActive(s.list, selected(s.list)[0] || all[0]);
      });
      s.list.addEventListener('keydown', (e) => {
        const all = optionsIn(s.list);
        const active = all.find((o) => o.classList.contains('is-active')) || all[0];
        const i = all.indexOf(active);
        if (s === chosen && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          if (active && active.getAttribute('aria-selected') !== 'true') select(s.list, active);
          reorder(e.key === 'ArrowUp' ? -1 : 1);
          return;
        }
        const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key];
        if (to !== undefined && all.length) {
          e.preventDefault();
          const li = all[Math.max(0, Math.min(all.length - 1, to))];
          if (e.shiftKey) select(s.list, li, { range: true });
          else setActive(s.list, li);
        } else if (e.key === ' ' && active) {
          e.preventDefault();
          select(s.list, active, { add: true });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (active && !selected(s.list).length) select(s.list, active);
          move(s, other);
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
          e.preventDefault();
          all.forEach((o) => o.setAttribute('aria-selected', String(o.getAttribute('aria-disabled') !== 'true')));
          sync();
        }
      });
    }
    btn.add.addEventListener('click', () => move(avail, chosen));
    btn.remove.addEventListener('click', () => move(chosen, avail));
    btn.up.addEventListener('click', () => reorder(-1));
    btn.down.addEventListener('click', () => reorder(1));

    el.xzDuallist = {
      value: () => optionsIn(chosen.list).map((o) => o.xzBox.value),
      set(values) {
        const list = [...values];
        for (const o of options) if (!list.includes(o.xzBox.value)) avail.list.append(o);
        for (const v of list) {
          const o = options.find((x) => x.xzBox.value === v);
          if (o) chosen.list.append(o);
        }
        sync();
      },
    };
    sync();
  }
}
