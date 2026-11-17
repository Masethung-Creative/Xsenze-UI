// Hover card: a small card that opens while the pointer rests on a link, or when the link gets keyboard focus.
// <span class="xz-hovercard" data-xz-hovercard><a href="/learners/14">Ananya Iyer</a><div class="xz-hovercard__panel">…</div></span>
// Or data-xz-hovercard="#template-id" with data-* fields, so one <template> serves every row of a table.
// The card adds detail; never put the only way to do something inside it.
import { $$, ready, fire, nextId } from './shared.js';
import { openFloating, releaseFloating, bindGlobal } from './floating.js';
import { place } from './place.js';

export function initHovercards(root) {
  for (const wrap of $$('[data-xz-hovercard]', root)) {
    if (ready(wrap, 'Hovercard')) continue;
    const trigger = wrap.querySelector(':scope > a, :scope > button, :scope > [data-xz-hovercard-trigger]');
    if (!trigger) continue;
    bindGlobal();
    wrap.classList.add('xz-hovercard');
    let panel = wrap.querySelector(':scope > .xz-hovercard__panel');
    const from = wrap.getAttribute('data-xz-hovercard');
    if (!panel && from) {
      const tpl = document.querySelector(from);
      if (tpl?.content) {
        panel = document.createElement('div');
        panel.className = 'xz-hovercard__panel';
        panel.append(tpl.content.cloneNode(true));
        // Fill [data-xz-field="name"] from the wrapper's data-name, and so on.
        for (const el of $$('[data-xz-field]', panel)) {
          const v = wrap.dataset[el.getAttribute('data-xz-field')];
          if (v != null) el.textContent = v;
        }
        wrap.append(panel);
      }
    }
    if (!panel) continue;
    panel.classList.add('xz-popover__panel');
    panel.id ||= nextId('hovercard');
    panel.hidden = true;
    if (wrap.hasAttribute('data-xz-hovercard-describe')) trigger.setAttribute('aria-describedby', panel.id);
    const openDelay = Number(wrap.getAttribute('data-xz-delay') || 500);
    const closeDelay = Number(wrap.getAttribute('data-xz-close-delay') || 300);
    let timer = 0;
    const close = () => {
      clearTimeout(timer);
      if (panel.hidden) return;
      panel.hidden = true;
      wrap.classList.remove('is-open');
      releaseFloating(panel);
      fire(wrap, 'xz:close');
    };
    const open = () => {
      clearTimeout(timer);
      if (!panel.hidden) return;
      openFloating({ panel, trigger, close: () => close() });
      panel.hidden = false;
      wrap.classList.add('is-open');
      place(panel, trigger, { gap: 8 });
      fire(wrap, 'xz:open');
    };
    const later = (fn, ms) => {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
    // Mouse and pen only: on touch screens a tap follows the link as usual.
    const enter = (e) => e.pointerType !== 'touch' && (panel.hidden ? later(open, openDelay) : clearTimeout(timer));
    const leave = (e) => e.pointerType !== 'touch' && later(close, closeDelay);
    trigger.addEventListener('pointerenter', enter);
    trigger.addEventListener('pointerleave', leave);
    panel.addEventListener('pointerenter', () => clearTimeout(timer));
    panel.addEventListener('pointerleave', leave);
    trigger.addEventListener('focus', () => trigger.matches(':focus-visible') && open());
    wrap.addEventListener('focusout', (e) => {
      if (!wrap.contains(e.relatedTarget)) later(close, 0);
    });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) {
        e.stopPropagation();
        close();
      }
    });
    wrap.xzPopover = { open, close };
  }
}
