// Colour: reading any CSS colour, converting between hex, RGB, HSL and OKLCH, and WCAG contrast,
// with the parts built on them: colour field, swatches, shades, contrast check and colour picker.
import { $, $$, ready, fire, nextId, clamp } from '../shared.js';

// ---------- conversions ----------
let ctx = null;
/** Any CSS colour (#hex, rgb(), hsl(), oklch(), a name) as { r, g, b, a } with 0 to 255 channels, or null. */
export function parse(input) {
  if (input && typeof input === 'object' && 'r' in input) return input;
  const s = String(input ?? '').trim();
  if (!s || /^(currentcolor|inherit|initial|unset|revert|transparent)$/i.test(s)) return null;
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
  if (hex) {
    let x = hex[1];
    if (x.length < 5) x = [...x].map((c) => c + c).join('');
    const n = parseInt(x.slice(0, 6), 16);
    return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: x.length === 8 ? parseInt(x.slice(6), 16) / 255 : 1 };
  }
  if (typeof CSS === 'undefined' || !CSS.supports('color', s)) return null;
  ctx ||= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}

const hex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
export const toHex = ({ r, g, b }) => `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();

export function toHsl({ r, g, b }) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: s * 100, l: l * 100 };
}
export function fromHsl({ h, s, l }) {
  const S = s / 100;
  const L = l / 100;
  const a = S * Math.min(L, 1 - L);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return 255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return { r: f(0), g: f(8), b: f(4) };
}

const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export function toOklch({ r, g, b }) {
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bv = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, Bv);
  const h = ((Math.atan2(Bv, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c: C, h: C < 1e-4 ? 0 : h };
}
function oklchToLinear({ l: L, c, h }) {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr);
  const B = c * Math.sin(hr);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
const fits = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
/** OKLCH to RGB. Colours outside sRGB keep their lightness and hue and lose chroma until they fit. */
export function fromOklch({ l, c, h }) {
  const L = clamp(l, 0, 1);
  let rgb = oklchToLinear({ l: L, c, h });
  if (!fits(rgb)) {
    let lo = 0;
    let hi = c;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (fits(oklchToLinear({ l: L, c: mid, h }))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToLinear({ l: L, c: lo, h });
  }
  const [r, g, b] = rgb.map((v) => gam(clamp(v, 0, 1)));
  return { r, g, b };
}

export const luminance = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** WCAG 2 contrast ratio between two colours, from 1 to 21. */
export function contrast(a, b) {
  const x = parse(a);
  const y = parse(b);
  if (!x || !y) return null;
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}
/** Black or white, whichever reads better on the colour. */
export const readable = (c) => (contrast(c, { r: 0, g: 0, b: 0 }) >= contrast(c, { r: 255, g: 255, b: 255 }) ? '#000000' : '#FFFFFF');

const round = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
export const formats = {
  hex: (c) => toHex(c),
  rgb: (c) => `rgb(${round(c.r)}, ${round(c.g)}, ${round(c.b)})`,
  hsl: (c) => {
    const { h, s, l } = toHsl(c);
    return `hsl(${round(h)}, ${round(s)}%, ${round(l)}%)`;
  },
  oklch: (c) => {
    const { l, c: ch, h } = toOklch(c);
    return `oklch(${round(l * 100, 1)}% ${round(ch, 3)} ${round(h, 1)})`;
  },
};

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const LIGHT = [0.975, 0.94, 0.88, 0.8, 0.71, 0.62, 0.53, 0.45, 0.37, 0.29, 0.21];
const CHROMA = [0.1, 0.22, 0.45, 0.7, 0.9, 1, 0.96, 0.86, 0.72, 0.58, 0.45];
/** Eleven steps from 50 (lightest) to 950 (darkest) with the same hue. The step nearest the colour is the colour itself. */
export function shades(input, { hue } = {}) {
  const base = parse(input);
  if (!base) return [];
  const o = toOklch(base);
  const h = hue ?? o.h;
  const list = STEPS.map((step, i) => ({ step, color: fromOklch({ l: LIGHT[i], c: o.c * CHROMA[i], h }) }));
  if (hue === undefined || Math.abs(hue - o.h) < 0.5) {
    let near = 0;
    LIGHT.forEach((L, i) => Math.abs(L - o.l) < Math.abs(LIGHT[near] - o.l) && (near = i));
    list[near] = { step: STEPS[near], color: base, base: true };
  }
  return list.map((s) => ({ ...s, hex: toHex(s.color) }));
}

export const color = { parse, toHex, toHsl, fromHsl, toOklch, fromOklch, contrast, readable, formats, shades };

// ---------- parts ----------
const EYEDROPPER = '<svg class="xz-icon xz-icon--sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>';
const details = (c) => ({ hex: toHex(c), rgb: formats.rgb(c), hsl: formats.hsl(c), oklch: formats.oklch(c), color: c });

function initFields(root) {
  for (const el of $$('[data-xz-color]', root)) {
    if (ready(el, 'Color')) continue;
    el.classList.add('xz-colorfield');
    const swatch = $('input[type="color"]', el);
    const text = $('input:not([type="color"])', el);
    const style = formats[el.getAttribute('data-xz-color')] || formats.hex;
    let current = parse(text?.value) || parse(swatch?.value) || { r: 0, g: 0, b: 0 };
    const emit = () => fire(el, 'xz:color', details(current));
    const set = (c, { from, emit: send = true } = {}) => {
      current = c;
      if (swatch && from !== swatch) swatch.value = toHex(c).toLowerCase();
      if (text && from !== text) text.value = style(c);
      text?.removeAttribute('aria-invalid');
      if (send) emit();
    };
    swatch?.addEventListener('input', () => set(parse(swatch.value), { from: swatch }));
    text?.addEventListener('input', () => {
      const c = parse(text.value);
      if (c) set(c, { from: text });
    });
    text?.addEventListener('change', () => {
      const c = parse(text.value);
      if (c) set(c);
      else text.setAttribute('aria-invalid', 'true');
    });
    if ('EyeDropper' in window && !$('.xz-colorfield__pick', el)) {
      const pick = Object.assign(document.createElement('button'), { type: 'button', className: 'xz-colorfield__pick', innerHTML: EYEDROPPER });
      pick.setAttribute('aria-label', 'Pick a colour from the screen');
      pick.addEventListener('click', async () => {
        try {
          const { sRGBHex } = await new window.EyeDropper().open();
          const c = parse(sRGBHex);
          if (c) set(c);
        } catch {}
      });
      el.append(pick);
    }
    el.xzColor = { get: () => details(current), set: (v) => parse(v) && set(parse(v)) };
    set(current, { emit: false });
  }
}

function initSwatches(root, init) {
  for (const sw of $$('.xz-swatch', root)) {
    if (ready(sw, 'Swatch')) continue;
    const c = parse(sw.style.getPropertyValue('--xz-swatch')) || parse(getComputedStyle(sw).backgroundColor);
    if (!c) continue;
    sw.style.setProperty('--xz-swatch-text', readable(c));
    if (!sw.textContent.trim()) sw.innerHTML = `<span>${toHex(c)}</span>`;
    if (sw.tagName === 'BUTTON' && !sw.hasAttribute('data-xz-copy')) {
      sw.setAttribute('data-xz-copy', toHex(c));
      init?.(sw.parentElement || sw);
    }
  }
}

function renderShades(list, steps, init) {
  list.textContent = '';
  for (const s of steps) {
    const li = document.createElement('li');
    const b = Object.assign(document.createElement('button'), { type: 'button', className: `xz-swatch${s.base ? ' is-base' : ''}` });
    b.style.setProperty('--xz-swatch', s.hex);
    b.setAttribute('data-xz-copy', s.hex);
    b.innerHTML = `<span class="xz-swatch__name">${s.step}</span><span>${s.hex}</span>`;
    li.append(b);
    list.append(li);
  }
  initSwatches(list);
  init?.(list);
}

function initShades(root, init) {
  for (const el of $$('[data-xz-shades]', root)) {
    if (ready(el, 'Shades')) continue;
    el.classList.add('xz-shades');
    let list = $('.xz-swatches', el);
    if (!list) {
      list = Object.assign(document.createElement('ul'), { className: 'xz-swatches xz-swatches--tall' });
      list.setAttribute('aria-label', el.getAttribute('aria-label') || 'Shades');
      el.prepend(list);
    }
    const hueInput = $('input[type="range"][data-xz-shades-hue]', el);
    let base = el.getAttribute('data-xz-shades') || '#737373';
    let steps = [];
    const draw = (emit) => {
      const c = parse(base);
      if (!c) return;
      if (hueInput) hueInput.style.setProperty('--xz-fader-track', `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map((h) => toHex(fromOklch({ l: 0.7, c: 0.14, h }))).join(', ')})`);
      steps = shades(c, hueInput ? { hue: Number(hueInput.value) } : {});
      renderShades(list, steps, init);
      if (emit) fire(el, 'xz:shades', { shades: steps.map(({ step, hex }) => ({ step, hex })) });
    };
    // Moving the hue fader from here also tells the kit's slider script, which redraws its fill and output.
    let quiet = false;
    const setHue = (c) => {
      if (!hueInput || !c) return;
      hueInput.value = String(Math.round(toOklch(c).h));
      quiet = true;
      hueInput.dispatchEvent(new Event('input'));
      quiet = false;
    };
    if (hueInput) {
      if (!hueInput.hasAttribute('value')) setHue(parse(base));
      hueInput.addEventListener('input', () => !quiet && draw(true));
    }
    const source = el.dataset.xzShadesFor && document.querySelector(el.dataset.xzShadesFor);
    source?.addEventListener('xz:color', (e) => {
      base = e.detail.hex;
      setHue(e.detail.color);
      draw(true);
    });
    el.xzShades = {
      set(v) {
        if (!parse(v)) return;
        base = v;
        setHue(parse(v));
        draw(true);
      },
      value: () => steps.map(({ step, hex }) => ({ step, hex })),
    };
    draw(false);
  }
}

function initContrasts(root) {
  for (const el of $$('[data-xz-contrast]', root)) {
    if (ready(el, 'Contrast')) continue;
    const [fg, bg] = $$('[data-xz-color]', el);
    if (!fg || !bg) continue;
    const ratioEl = $('.xz-contrast__ratio strong', el) || $('.xz-contrast__ratio', el);
    const marks = $$('[data-level]', el);
    const status = Object.assign(document.createElement('p'), { className: 'xz-sr-only' });
    status.setAttribute('role', 'status');
    el.append(status);
    let timer = 0;
    const update = (announce) => {
      const a = fg.xzColor?.get().color;
      const b = bg.xzColor?.get().color;
      if (!a || !b) return;
      const r = contrast(a, b);
      const shown = (Math.floor(r * 100) / 100).toFixed(2);
      el.style.setProperty('--xz-contrast-fg', toHex(a));
      el.style.setProperty('--xz-contrast-bg', toHex(b));
      if (ratioEl) ratioEl.textContent = shown;
      const passed = [];
      for (const m of marks) {
        const ok = r >= Number(m.dataset.level);
        m.classList.toggle('is-pass', ok);
        m.classList.toggle('is-fail', !ok);
        let sr = $('.xz-sr-only', m);
        if (!sr) m.append((sr = Object.assign(document.createElement('span'), { className: 'xz-sr-only' })));
        sr.textContent = ok ? ': passes' : ': fails';
        if (ok) passed.push(m.firstChild.textContent.trim());
      }
      fire(el, 'xz:contrast', { ratio: r, pass: passed });
      if (announce) {
        clearTimeout(timer);
        timer = setTimeout(() => (status.textContent = `Contrast ${shown} to 1. ${passed.length ? `Passes ${passed.join(', ')}.` : 'Fails every level.'}`), 700);
      }
    };
    el.addEventListener('xz:color', () => update(true));
    el.xzContrast = { ratio: () => contrast(fg.xzColor.get().color, bg.xzColor.get().color) };
    update(false);
  }
}

const MODELS = {
  rgb: { name: 'RGB', ch: [['Red', 255, 1], ['Green', 255, 1], ['Blue', 255, 1]], from: (c) => [c.r, c.g, c.b], to: ([r, g, b]) => ({ r, g, b }), unit: ['', '', ''] },
  hsl: { name: 'HSL', ch: [['Hue', 360, 1], ['Saturation', 100, 1], ['Lightness', 100, 1]], from: (c) => Object.values(toHsl(c)), to: ([h, s, l]) => fromHsl({ h, s, l }), unit: ['°', '%', '%'] },
  oklch: { name: 'OKLCH', ch: [['Lightness', 100, 0.1], ['Chroma', 0.37, 0.001], ['Hue', 360, 1]], from: (c) => { const o = toOklch(c); return [o.l * 100, o.c, o.h]; }, to: ([l, c, h]) => fromOklch({ l: l / 100, c, h }), unit: ['%', '', '°'] },
};

function initPickers(root, { icon, init }) {
  for (const el of $$('[data-xz-colorpicker]', root)) {
    if (ready(el, 'Colorpicker')) continue;
    el.classList.add('xz-colorpicker');
    let swatch = $('input[type="color"]', el);
    if (!swatch) {
      swatch = Object.assign(document.createElement('input'), { type: 'color', value: '#737373' });
      swatch.setAttribute('aria-label', 'Colour');
      el.prepend(swatch);
    }
    const id = nextId('picker');
    let model = MODELS[el.dataset.xzModel] ? el.dataset.xzModel : 'oklch';
    let current = parse(el.dataset.value) || parse(swatch.value);
    let values = MODELS[model].from(current);

    const seg = Object.assign(document.createElement('div'), { className: 'xz-segmented xz-segmented--cells' });
    seg.setAttribute('role', 'radiogroup');
    seg.setAttribute('aria-label', 'Colour model');
    seg.innerHTML = Object.entries(MODELS).map(([k, m]) => `<label><input type="radio" name="${id}-model" value="${k}"${k === model ? ' checked' : ''}><span>${m.name}</span></label>`).join('');
    const rows = [0, 1, 2].map((i) => {
      const row = Object.assign(document.createElement('div'), { className: 'xz-colorpicker__channel' });
      row.innerHTML = `<label for="${id}-r${i}"></label><input class="xz-slider xz-slider--fader" type="range" id="${id}-r${i}" min="0"><input class="xz-input" type="number" min="0" inputmode="decimal">`;
      return row;
    });
    const lines = Object.assign(document.createElement('div'), { className: 'xz-colorpicker__values' });
    lines.innerHTML = ['hex', 'rgb', 'hsl', 'oklch']
      .map((k) => `<div class="xz-valueline" data-format="${k}"><span class="xz-valueline__label">${k.toUpperCase()}</span><code class="xz-valueline__value"></code><button class="xz-btn xz-btn--ghost xz-btn--icon xz-btn--sm" type="button" data-xz-copy="" aria-label="Copy ${k.toUpperCase()} value">${icon('copy', { size: 'sm' })}</button></div>`)
      .join('');
    swatch.after(seg, ...rows, lines);

    const track = (i) => {
      const m = MODELS[model];
      const stops = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1].map((t) => {
        const v = [...values];
        v[i] = t * m.ch[i][1];
        return toHex(m.to(v));
      });
      return `linear-gradient(to right, ${stops.join(', ')})`;
    };
    const paint = () => {
      const m = MODELS[model];
      rows.forEach((row, i) => {
        const [name, max, stepSize] = m.ch[i];
        const [label, range, num] = row.children;
        label.textContent = name;
        for (const input of [range, num]) Object.assign(input, { max: String(max), step: String(stepSize) });
        const shown = stepSize < 1 ? Number(values[i]).toFixed(stepSize < 0.01 ? 3 : 1) : String(Math.round(values[i]));
        range.value = shown;
        if (document.activeElement !== num) num.value = shown;
        num.setAttribute('aria-label', `${name} value`);
        range.setAttribute('aria-valuetext', `${shown}${m.unit[i] === '°' ? ' degrees' : m.unit[i]}`);
        range.style.setProperty('--xz-fader-track', track(i));
      });
      swatch.value = toHex(current).toLowerCase();
      for (const line of lines.children) {
        const text = formats[line.dataset.format](current);
        line.querySelector('code').textContent = text;
        line.querySelector('[data-xz-copy]').setAttribute('data-xz-copy', text);
      }
    };
    const changed = () => {
      paint();
      fire(el, 'xz:color', details(current));
    };
    rows.forEach((row, i) => {
      const [, range, num] = row.children;
      const take = (input) => {
        const v = Number(input.value);
        if (!Number.isFinite(v)) return;
        values[i] = clamp(v, 0, MODELS[model].ch[i][1]);
        current = MODELS[model].to(values);
        changed();
      };
      range.addEventListener('input', () => take(range));
      num.addEventListener('change', () => take(num));
    });
    seg.addEventListener('change', (e) => {
      model = e.target.value;
      values = MODELS[model].from(current);
      paint();
    });
    swatch.addEventListener('input', () => {
      current = parse(swatch.value);
      values = MODELS[model].from(current);
      changed();
    });
    el.xzColorpicker = {
      get: () => details(current),
      set(v) {
        const c = parse(v);
        if (!c) return;
        current = c;
        values = MODELS[model].from(c);
        changed();
      },
    };
    paint();
    init?.(el);
  }
}

export function initColors(root, helpers) {
  initFields(root);
  initSwatches(root, helpers.init);
  initShades(root, helpers.init);
  initContrasts(root);
  initPickers(root, helpers);
}
