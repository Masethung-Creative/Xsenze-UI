// Copy button. What it copies, in order:
//   data-xz-copy="text"            this exact text
//   data-xz-copy-target="#id"      the value or text of that element
//   inside .xz-command             the command's .xz-command__text
// Screen readers hear "Copied" from a shared status message; the button keeps its name.
import { $$, ready, fire } from '../shared.js';

let live = null;
function announce(message) {
  if (!live) {
    live = Object.assign(document.createElement('div'), { className: 'xz-sr-only' });
    live.setAttribute('role', 'status');
    document.body.append(live);
  }
  live.textContent = '';
  setTimeout(() => (live.textContent = message), 30);
}

/** Copy text to the clipboard. Resolves to true when it worked. */
export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = Object.assign(document.createElement('textarea'), { value: text });
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    area.remove();
    return ok;
  }
}

function source(btn) {
  const literal = btn.getAttribute('data-xz-copy');
  if (literal) return { text: literal };
  const target = btn.hasAttribute('data-xz-copy-target') ? document.querySelector(btn.getAttribute('data-xz-copy-target')) : btn.closest('.xz-command')?.querySelector('.xz-command__text');
  if (!target) return { text: '' };
  return { text: 'value' in target && typeof target.value === 'string' ? target.value : target.textContent.trim(), target };
}

export function initCopy(root, { icon }) {
  for (const btn of $$('[data-xz-copy]', root)) {
    if (ready(btn, 'Copy')) continue;
    const wrap = Object.assign(document.createElement('span'), { className: 'xz-copy' });
    const idle = Object.assign(document.createElement('span'), { className: 'xz-copy__idle' });
    const done = Object.assign(document.createElement('span'), { className: 'xz-copy__done' });
    done.setAttribute('aria-hidden', 'true');
    idle.append(...btn.childNodes);
    const iconOnly = btn.classList.contains('xz-btn--icon');
    done.innerHTML = icon('check', { size: 'sm' }) + (iconOnly ? '' : '<span>Copied</span>');
    wrap.append(idle, done);
    btn.append(wrap);
    let timer = 0;
    btn.addEventListener('click', async () => {
      const { text, target } = source(btn);
      if (!text) return;
      const ok = await copy(text);
      clearTimeout(timer);
      if (ok) {
        btn.classList.add('is-copied');
        announce('Copied');
        timer = setTimeout(() => btn.classList.remove('is-copied'), 2000);
      } else {
        announce('Could not copy. Select the text and press Ctrl+C.');
        if (target) getSelection().selectAllChildren(target);
      }
      fire(btn, 'xz:copy', { text, ok });
    });
  }
}
