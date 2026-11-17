// Chat and AI pieces: a message list and a prompt box.
//   <section class="xz-chat" data-xz-chat aria-label="Help"> <ol class="xz-chat__list"> li.xz-message … </ol> </section>
//   <form class="xz-prompt" data-xz-prompt action="/chat" method="post"> <textarea name="message"></textarea> … </form>
// Without the script the form posts like any form. With it, Enter sends (Shift+Enter adds a line) and
// the page answers through `xz:send` and `el.xzChat.add()` / `stream()`.
import { $$, ready, fire, esc, composing } from '../shared.js';

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
  const make = (msg) => {
    const li = document.createElement('li');
    const role = msg.role === 'user' ? 'user' : 'assistant';
    li.className = `xz-message xz-message--${role}`;
    const author = msg.author || (role === 'user' ? 'You' : 'Assistant');
    const time = msg.time ? `<time class="xz-message__time">${esc(msg.time)}</time>` : '';
    li.innerHTML = `${msg.avatar ? `<span class="xz-message__avatar" aria-hidden="true">${msg.avatar}</span>` : ''}<div class="xz-message__body"><p class="xz-sr-only">${esc(author)} said:</p><div class="xz-message__bubble${role === 'assistant' ? ' xz-prose xz-prose--sm' : ''}"></div>${time ? `<div class="xz-message__meta">${time}</div>` : ''}</div>`;
    const bubble = li.querySelector('.xz-message__bubble');
    if (msg.html != null) bubble.innerHTML = clean(msg);
    else bubble.textContent = msg.text || '';
    return li;
  };
  let typingRow = null;
  const api = {
    add(msg) {
      const stick = nearEnd();
      const li = make(msg);
      list.append(li);
      after(stick || msg.role === 'user');
      if (msg.role !== 'user') say(`${msg.author || 'Assistant'}: ${li.querySelector('.xz-message__bubble').textContent}`);
      return li;
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
          say(`${msg.author || 'Assistant'}: ${bubble.textContent}`);
        },
      };
    },
    typing(on = true) {
      if (on && !typingRow) {
        typingRow = Object.assign(document.createElement('li'), { className: 'xz-message xz-message--assistant xz-message--typing' });
        typingRow.innerHTML = '<div class="xz-message__body"><span class="xz-typing" role="status" aria-label="Writing a reply"><i></i><i></i><i></i></span></div>';
        const stick = nearEnd();
        list.append(typingRow);
        after(stick);
      } else if (!on && typingRow) {
        typingRow.remove();
        typingRow = null;
      }
    },
    scrollToEnd: toEnd,
  };
  chat.xzChat = api;
  chat.addEventListener('click', (e) => {
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
  toEnd();
}
