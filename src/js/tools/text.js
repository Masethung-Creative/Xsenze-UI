// Text tools: paste, clear and share buttons for a text box, a live count, letter tiles and the file field.
import { $, $$, ready, fire } from '../shared.js';

const target = (btn, attr) => document.querySelector(btn.getAttribute(attr) || '') || btn.closest('.xz-textbox')?.querySelector('textarea, input');
const segmenter = (granularity) => (typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity }) : null);
const graphemes = segmenter('grapheme');
const wordSeg = segmenter('word');
/** Letters as people see them: क्षि is one, not four code points. */
export const letters = (s) => (graphemes ? [...graphemes.segment(s)].map((x) => x.segment) : [...s]);
const wordCount = (s) => (wordSeg ? [...wordSeg.segment(s)].filter((x) => x.isWordLike).length : (s.trim().match(/\S+/g) || []).length);
const plural = (n, one) => `${n.toLocaleString('en-IN')} ${one}${n === 1 ? '' : 's'}`;

function changed(field) {
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

export function initText(root, { toast }) {
  for (const btn of $$('[data-xz-paste]', root)) {
    if (ready(btn, 'Paste')) continue;
    if (!navigator.clipboard?.readText) {
      btn.hidden = true;
      continue;
    }
    btn.addEventListener('click', async () => {
      const field = target(btn, 'data-xz-paste');
      if (!field) return;
      try {
        const text = await navigator.clipboard.readText();
        const start = field.selectionStart ?? field.value.length;
        const end = field.selectionEnd ?? start;
        field.value = field.value.slice(0, start) + text + field.value.slice(end);
        field.focus();
        field.setSelectionRange?.(start + text.length, start + text.length);
        changed(field);
      } catch {
        toast?.({ message: 'The browser kept the clipboard closed. Click in the box and press Ctrl+V to paste.', variant: 'info' });
        field.focus();
      }
    });
  }

  for (const btn of $$('[data-xz-clear]', root)) {
    if (ready(btn, 'Clear')) continue;
    btn.addEventListener('click', () => {
      const field = target(btn, 'data-xz-clear');
      if (!field) return;
      field.value = '';
      field.focus();
      changed(field);
    });
  }

  for (const btn of $$('[data-xz-share]', root)) {
    if (ready(btn, 'Share') || !navigator.share) continue;
    btn.addEventListener('click', async () => {
      const src = document.querySelector(btn.getAttribute('data-xz-share') || '');
      const text = src ? ('value' in src && typeof src.value === 'string' ? src.value : src.textContent.trim()) : '';
      try {
        await navigator.share({ title: btn.dataset.xzShareTitle || document.title, text, ...(btn.dataset.xzShareUrl ? { url: btn.dataset.xzShareUrl } : {}) });
      } catch {}
    });
  }

  for (const out of $$('[data-xz-count]', root)) {
    if (ready(out, 'Count')) continue;
    const field = document.querySelector(out.getAttribute('data-xz-count'));
    if (!field) continue;
    const max = Number(out.dataset.xzMax || field.maxLength) || 0;
    const update = () => {
      const n = letters(field.value).length;
      out.textContent = `${plural(n, 'character')}${max > 0 ? ` of ${max.toLocaleString('en-IN')}` : ''} · ${plural(wordCount(field.value), 'word')}`;
      out.classList.toggle('xz-text-danger', max > 0 && n > max);
    };
    field.addEventListener('input', update);
    update();
  }

  for (const el of $$('[data-xz-glyphs]', root)) {
    if (ready(el, 'Glyphs')) continue;
    el.classList.add('xz-glyphs');
    const source = el.getAttribute('data-xz-glyphs') ? document.querySelector(el.getAttribute('data-xz-glyphs')) : null;
    const max = Number(el.dataset.xzMax || 40);
    const sr = Object.assign(document.createElement('span'), { className: 'xz-sr-only' });
    const draw = (text) => {
      el.textContent = '';
      const list = letters(text).slice(0, max);
      for (const ch of list) {
        const tile = Object.assign(document.createElement('span'), { className: `xz-glyphs__tile${/\s/.test(ch) ? ' xz-glyphs__tile--space' : ''}`, textContent: /\s/.test(ch) ? '' : ch });
        tile.setAttribute('aria-hidden', 'true');
        el.append(tile);
      }
      sr.textContent = text;
      if (!source) el.append(sr);
      fire(el, 'xz:glyphs', { letters: list });
    };
    if (source) {
      el.setAttribute('aria-hidden', 'true');
      source.addEventListener('input', () => draw(source.value));
      draw(source.value);
    } else draw(el.textContent.trim());
  }

  for (const el of $$('[data-xz-filefield]', root)) {
    const input = $('input[type="file"]', el);
    if (!input || ready(el, 'Filefield')) continue;
    const name = $('.xz-filefield__name', el);
    const empty = name?.textContent.trim() || 'None';
    const show = () => {
      const files = [...input.files];
      if (name) name.textContent = !files.length ? empty : files.length === 1 ? files[0].name : `${files.length} files`;
      el.classList.toggle('has-file', files.length > 0);
    };
    input.addEventListener('change', show);
    show();
  }
}
