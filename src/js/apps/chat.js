// Chat and AI pieces: a message list and a prompt box.
//   <section class="xz-chat" data-xz-chat aria-label="Help"> <ol class="xz-chat__list"> li.xz-message … </ol> </section>
//   <form class="xz-prompt" data-xz-prompt action="/chat" method="post"> <textarea name="message"></textarea> … </form>
// Without the script the form posts like any form. With it, Enter sends (Shift+Enter adds a line) and
// the page answers through `xz:send` and `el.xzChat.add()` / `stream()`.
// Also: notes (`note()`), files on a message, reactions (`xz:react`), long messages that fold (data-xz-fold),
// earlier messages added above without moving the reader (`prepend()`), and `jumpTo()` a message.
import { $$, ready, fire, esc, composing, nextId, motionOn } from '../shared.js';

let H = {};
const live = () => {
  let el = document.getElementById('xz-chat-live');
  if (!el) {
    el = Object.assign(document.createElement('div'), { id: 'xz-chat-live', className: 'xz-sr-only' });
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  return el;
};
const say = (text) => {
  const el = live();
  el.textContent = '';
  setTimeout(() => (el.textContent = text), 60);
};

export function initChats(root, helpers) {
  H = helpers || H;
  for (const form of $$('form[data-xz-prompt]', root)) if (!ready(form, 'Prompt')) prompt(form);
  for (const chat of $$('[data-xz-chat]', root)) if (!ready(chat, 'Chat')) messages(chat);
}

function prompt(form) {
  form.classList.add('xz-prompt');
  const field = form.querySelector('textarea');
  if (!field) return;
  const send = form.querySelector('button[type="submit"]');
  const maxRows = Number(form.getAttribute('data-xz-max-rows') || 8);
  const grow = () => {
    field.style.height = 'auto';
    const line = parseFloat(getComputedStyle(field).lineHeight) || 20;
    field.style.height = `${Math.min(field.scrollHeight, line * maxRows + 16)}px`;
  };
  field.addEventListener('input', grow);
  let busy = false;
  const files = () => $$('input[type="file"]', form).flatMap((i) => [...(i.files || [])]);
  const submit = () => {
    if (!field.value.trim() && !files().length) return;
    if (form.requestSubmit) form.requestSubmit();
    else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })) && form.submit();
  };
  // Phones and tablets add a line on Enter, because there is a Send button on screen.
  const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  field.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || composing(e) || coarse()) return;
    e.preventDefault();
    if (!busy) submit();
  });
  // Every send goes through here. A page that answers in place calls preventDefault() on xz:send;
  // otherwise the form posts as it would without the script.
  form.addEventListener('submit', (e) => {
    if (busy || (!field.value.trim() && !files().length)) return e.preventDefault();
    if (!fire(form, 'xz:send', { text: field.value.trim(), files: files() }, true)) {
      e.preventDefault();
      api.clear();
    }
  });
  form.xzSubmit = submit;
  const stopLabel = send?.getAttribute('aria-label') || 'Send';
  const sendIcon = send?.innerHTML || '';
  send?.addEventListener('click', (e) => {
    if (!busy) return;
    e.preventDefault();
    fire(form, 'xz:stop', {});
  });
  const api = {
    get value() {
      return field.value;
    },
    set value(v) {
      field.value = v;
      grow();
    },
    clear() {
      field.value = '';
      for (const i of $$('input[type="file"]', form)) i.value = '';
      // Attachments shown by a dropzone (on the form or inside it) are emptied too.
      for (const d of [form, ...$$('[data-xz-dropzone]', form)]) d.xzDropzone?.clear();
      grow();
      field.focus();
    },
    focus: () => field.focus(),
    /** While a reply is being written, the send button becomes Stop and fires xz:stop. */
    busy(on = true) {
      busy = on;
      form.classList.toggle('is-busy', on);
      if (send) {
        send.setAttribute('aria-label', on ? 'Stop' : stopLabel);
        send.innerHTML = on ? H.icon?.('square', { size: 'sm' }) || 'Stop' : sendIcon;
      }
    },
  };
  form.xzPrompt = api;
  grow();
}

function messages(chat) {
  chat.classList.add('xz-chat');
  const list = chat.querySelector('.xz-chat__list') || chat.appendChild(Object.assign(document.createElement('ol'), { className: 'xz-chat__list' }));
  const jump = Object.assign(document.createElement('button'), { type: 'button', className: 'xz-btn xz-btn--sm xz-chat__latest', hidden: true });
  jump.innerHTML = `${H.icon?.('arrow-down', { size: 'sm' }) || ''}<span>Jump to latest</span>`;
  list.after(jump);
  const scroller = list;
  const nearEnd = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
  const toEnd = () => {
    scroller.scrollTop = scroller.scrollHeight;
    jump.hidden = true;
  };
  // The button floats just above the bottom of the list, whatever sits under the list.
  const after = (stick) => {
    if (stick) return toEnd();
    jump.style.insetBlockEnd = `${Math.max(0, chat.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom) + 12}px`;
    jump.hidden = false;
  };
  scroller.addEventListener('scroll', () => nearEnd() && (jump.hidden = true));
  jump.addEventListener('click', toEnd);
  const clean = (msg) => (msg.trusted ? msg.html : H.sanitize ? H.sanitize(msg.html) : esc(msg.html));
  const bubbles = chat.classList.contains('xz-chat--bubbles');
  // Files on a message: [{ name, meta, url, icon }] as file cards.
  const filesHtml = (files = []) =>
    files.length
      ? `<ul class="xz-files">${files.map((f) => `<li><${f.url ? `a href="${esc(f.url)}" download` : 'span'} class="xz-file"><span class="xz-file__icon">${H.icon?.(f.icon || 'file-text', { size: 'sm' }) || ''}</span><span class="xz-file__body"><span class="xz-file__name">${esc(f.name)}</span>${f.meta ? `<span class="xz-file__meta">${esc(f.meta)}</span>` : ''}</span></${f.url ? 'a' : 'span'}></li>`).join('')}</ul>`
      : '';
  const make = (msg) => {
    const li = document.createElement('li');
    const role = msg.role === 'user' ? 'user' : 'assistant';
    li.className = `xz-message xz-message--${role}`;
    if (msg.id) li.id = msg.id;
    const author = msg.author || (role === 'user' ? 'You' : 'Assistant');
    const time = msg.time ? `<time class="xz-message__time">${esc(msg.time)}</time>` : '';
    li.innerHTML = `${msg.avatar ? `<span class="xz-message__avatar" aria-hidden="true">${msg.avatar}</span>` : ''}<div class="xz-message__body">${bubbles && msg.author ? `<span class="xz-message__author" aria-hidden="true">${esc(author)}</span>` : ''}<p class="xz-sr-only">${esc(author)} said:</p><div class="xz-message__bubble${role === 'assistant' && !bubbles ? ' xz-prose xz-prose--sm' : ''}"></div>${filesHtml(msg.files)}${time ? `<div class="xz-message__meta">${time}</div>` : ''}</div>`;
    const bubble = li.querySelector('.xz-message__bubble');
    if (msg.html != null) bubble.innerHTML = clean(msg);
    else bubble.textContent = msg.text || '';
    return li;
  };
  const makeNote = (o) => {
    const li = document.createElement('li');
    li.className = `xz-chat__note${o.line ? ' xz-chat__note--line' : o.box ? ' xz-chat__note--box' : ''}${o.tone ? ` xz-chat__note--${o.tone}` : ''}`;
    li.innerHTML = `${o.icon ? H.icon?.(o.icon, { size: 'sm' }) || '' : ''}<span>${esc(o.text || '')}</span>`;
    return li;
  };
  // Long messages fold behind "Show more" when the chat or the message has data-xz-fold.
  const fold = (li) => {
    const bubble = li.querySelector('.xz-message__bubble');
    if (!bubble || li.querySelector('.xz-message__more') || !(chat.hasAttribute('data-xz-fold') || li.hasAttribute('data-xz-fold'))) return;
    bubble.classList.add('is-folded');
    if (bubble.scrollHeight <= bubble.clientHeight + 24) return bubble.classList.remove('is-folded');
    const more = Object.assign(document.createElement('button'), { type: 'button', className: 'xz-message__more', textContent: 'Show more' });
    more.setAttribute('aria-expanded', 'false');
    more.setAttribute('aria-controls', (bubble.id ||= nextId('message')));
    bubble.after(more);
  };
  let typingRow = null;
  const api = {
    add(msg) {
      const stick = nearEnd();
      const li = make(msg);
      list.append(li);
      fold(li);
      after(stick || msg.role === 'user');
      if (msg.role !== 'user') say(`${msg.author || 'Assistant'}: ${li.querySelector('.xz-message__bubble').textContent}`);
      return li;
    },
    /** A note in the conversation: { text, icon, tone: 'success' | 'warning' | 'danger', line: true for a day line, box: true for a framed note }. */
    note(o) {
      const opts = typeof o === 'string' ? { text: o } : o;
      const stick = nearEnd();
      const li = makeNote(opts);
      list.append(li);
      after(stick);
      if (!opts.line) say(opts.text || '');
      return li;
    },
    /** Earlier messages go in above the others, and the messages being read stay where they are. */
    prepend(msgs) {
      const from = scroller.scrollHeight - scroller.scrollTop;
      const items = [].concat(msgs).map((m) => (m.note ? makeNote(m) : make(m)));
      list.prepend(...items);
      items.forEach(fold);
      scroller.scrollTop = scroller.scrollHeight - from;
      return items;
    },
    /** Scroll to a message (an element or its id) and mark it for a moment. */
    jumpTo(m) {
      const li = typeof m === 'string' ? document.getElementById(m) : m;
      if (!li || !list.contains(li)) return;
      const top = scroller.scrollTop + li.getBoundingClientRect().top - scroller.getBoundingClientRect().top - (scroller.clientHeight - li.offsetHeight) / 2;
      scroller.scrollTo({ top, behavior: motionOn() ? 'smooth' : 'auto' });
      li.classList.add('is-target');
      setTimeout(() => li.classList.remove('is-target'), 1800);
      li.tabIndex = -1;
      li.focus({ preventScroll: true });
    },
    /** Write a reply bit by bit. Screen readers hear it once, when it is done. */
    stream(msg = {}) {
      api.typing(false);
      const stick = nearEnd();
      const li = make({ ...msg, text: '' });
      li.classList.add('is-streaming');
      list.append(li);
      after(stick);
      const bubble = li.querySelector('.xz-message__bubble');
      let text = '';
      return {
        el: li,
        append(chunk) {
          const s = nearEnd();
          text += chunk;
          bubble.textContent = text;
          if (s) toEnd();
        },
        done(html) {
          li.classList.remove('is-streaming');
          if (html != null) bubble.innerHTML = clean({ ...msg, html });
          fold(li);
          say(`${msg.author || 'Assistant'}: ${bubble.textContent}`);
        },
      };
    },
    /** Typing dots while a reply is written, or a line of status in their place: typing(true, 'Checking the timetable…'). */
    typing(on = true, label) {
      if (!on) {
        typingRow?.remove();
        typingRow = null;
        return;
      }
      const html = `<div class="xz-message__body">${label ? `<span class="xz-shimmer" role="status">${esc(label)}</span>` : '<span class="xz-typing" role="status" aria-label="Writing a reply"><i></i><i></i><i></i></span>'}</div>`;
      if (typingRow) return void (typingRow.innerHTML = html);
      typingRow = Object.assign(document.createElement('li'), { className: 'xz-message xz-message--assistant xz-message--typing', innerHTML: html });
      const stick = nearEnd();
      list.append(typingRow);
      after(stick);
    },
    scrollToEnd: toEnd,
  };
  chat.xzChat = api;
  chat.addEventListener('click', (e) => {
    const more = e.target.closest('.xz-message__more');
    if (more) {
      const open = more.getAttribute('aria-expanded') !== 'true';
      document.getElementById(more.getAttribute('aria-controls'))?.classList.toggle('is-folded', !open);
      more.setAttribute('aria-expanded', String(open));
      more.textContent = open ? 'Show less' : 'Show more';
    }
    const re = e.target.closest('.xz-reaction');
    if (re) {
      const on = re.getAttribute('aria-pressed') !== 'true';
      re.setAttribute('aria-pressed', String(on));
      const n = re.querySelector('.xz-reaction__count');
      if (n) n.textContent = String(Math.max(0, (parseInt(n.textContent, 10) || 0) + (on ? 1 : -1)));
      fire(chat, 'xz:react', { reaction: re.getAttribute('data-xz-react') || re.textContent.trim(), on, message: re.closest('.xz-message') });
    }
    const fb = e.target.closest('[data-xz-feedback]');
    if (fb) {
      const on = fb.getAttribute('aria-pressed') !== 'true';
      for (const b of $$('[data-xz-feedback]', fb.closest('.xz-message') || chat)) b.setAttribute('aria-pressed', String(b === fb && on));
      fire(chat, 'xz:feedback', { value: on ? fb.getAttribute('data-xz-feedback') : null, message: fb.closest('.xz-message') });
    }
    const cp = e.target.closest('[data-xz-copy-message]');
    if (cp) H.copy?.(cp.closest('.xz-message')?.querySelector('.xz-message__bubble')?.innerText || '');
    const retry = e.target.closest('[data-xz-retry]');
    if (retry) fire(chat, 'xz:retry', { message: retry.closest('.xz-message') });
    const suggest = e.target.closest('[data-xz-suggest]');
    if (suggest) {
      const form = document.querySelector(chat.getAttribute('data-xz-chat-prompt') || '') || chat.querySelector('form[data-xz-prompt]') || chat.parentElement?.querySelector('form[data-xz-prompt]');
      if (form?.xzPrompt) {
        form.xzPrompt.value = suggest.getAttribute('data-xz-suggest') || suggest.textContent.trim();
        form.xzSubmit?.();
      }
    }
  });
  $$('.xz-message', list).forEach(fold);
  toEnd();
}
