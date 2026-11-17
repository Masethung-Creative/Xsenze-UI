// Create page: builds a theme from a few choices, previews it live and exports it as CSS or JSON.
// Runs before the kit script, so the kit initialises the icons and tabs it adds.
(() => {
  const preview = document.querySelector('[data-cr-preview]');
  if (!preview) return;

  // ---------- options ----------
  const BASES = {
    grey: { label: 'Grey (no tint)', ramp: { 50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717', 950: '#0a0a0a' } },
    warm: { label: 'Warm charcoal', ramp: { 50: '#f7f5f2', 100: '#efece8', 200: '#e2ded9', 300: '#cfcac4', 400: '#a8a39d', 500: '#7a7570', 600: '#5c5854', 700: '#454240', 800: '#32302e', 900: '#282624', 950: '#1e1c1b' } },
    cool: { label: 'Cool slate', ramp: { 50: '#f8f9fb', 100: '#f1f3f6', 200: '#e3e6eb', 300: '#cfd4dc', 400: '#9ea5b1', 500: '#6f7785', 600: '#535a66', 700: '#3f4550', 800: '#272b33', 900: '#181b21', 950: '#0b0d11' } },
  };
  const THEMES = {
    mono: { label: 'Mono', ramp: null },
    orange: { label: 'Orange', ramp: { 50: '#fff5eb', 100: '#ffe8d1', 200: '#ffcfa3', 300: '#ffae6b', 400: '#ff8a33', 500: '#ff6300', 600: '#db5200', 700: '#a83e00', 800: '#853200', 900: '#5e2400', 950: '#381500' } },
    coral: { label: 'Coral', ramp: { 50: '#fff3f1', 100: '#ffe4e0', 200: '#ffcbc4', 300: '#ffa99f', 400: '#ff8b7e', 500: '#ff6f61', 600: '#e5503f', 700: '#b83a2c', 800: '#922f24', 900: '#6b231b', 950: '#40130e' } },
    blue: { label: 'Blue', ramp: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' } },
    green: { label: 'Green', ramp: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16' } },
    violet: { label: 'Violet', ramp: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' } },
  };
  const FONTS = {
    jakarta: { label: 'Plus Jakarta Sans', stack: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Space Grotesk Variable", "Space Grotesk", "Noto Sans", system-ui, sans-serif' },
    grotesk: { label: 'Space Grotesk', stack: '"Space Grotesk Variable", "Space Grotesk", "Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
    mono: { label: 'JetBrains Mono', stack: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, "Cascadia Code", Consolas, monospace' },
    system: { label: 'System font', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif' },
  };
  const RADII = {
    0: { label: 'Square', control: '0', surface: '0' },
    4: { label: '4 px', control: '4px', surface: '4px' },
    8: { label: '8 px', control: '8px', surface: '8px' },
    12: { label: '12 px', control: '12px', surface: '12px' },
    pill: { label: 'Pill', control: '9999px', surface: '16px' },
  };
  const ICONS = { thin: { label: 'Thin', width: 1.5 }, regular: { label: 'Regular', width: 1.75 }, bold: { label: 'Bold', width: 2.25 } };
  const OPTIONS = { base: BASES, theme: THEMES, heading: FONTS, body: FONTS, radius: RADII, icon: ICONS };
  const ORDER = ['base', 'theme', 'heading', 'body', 'radius', 'icon'];
  const DEFAULTS = { base: 'grey', theme: 'mono', heading: 'jakarta', body: 'grotesk', radius: '4', icon: 'regular', mode: 'dark' };
  // Presets made before 0.6.0 name the old heading font; they now open with the kit's shipped heading font.
  const ALIASES = { satoshi: 'jakarta' };

  // ---------- colour maths (same as scripts/contrast.mjs) ----------
  const parse = (c) => {
    if (c.startsWith('#')) return [...[1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), 1];
    const m = c.match(/[\d.]+/g).map(Number);
    return [m[0], m[1], m[2], m[3] ?? 1];
  };
  const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3])).concat(1);
  const lum = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (fg, bg) => {
    const b = parse(bg);
    const [hi, lo] = [lum(over(parse(fg), b)), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const hex = (n) => Math.round(n).toString(16).padStart(2, '0');
  const mix = (a, b, t = 0.5) => {
    const [x, y] = [parse(a), parse(b)];
    return '#' + [0, 1, 2].map((i) => hex(x[i] + (y[i] - x[i]) * t)).join('');
  };
  const alpha = (c, a) => {
    const [r, g, b] = parse(c);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };
  /** First candidate that reaches `min` against every background, else the last one. */
  const pick = (candidates, backgrounds, min) => candidates.find((c) => backgrounds.every((bg) => ratio(c, bg) >= min)) || candidates[candidates.length - 1];

  // ---------- theme tokens for one mode ----------
  function tokens(state, mode) {
    const n = BASES[state.base].ramp;
    const c = THEMES[state.theme].ramp;
    const light = mode === 'light';
    const t = light
      ? { bg: n[50], surface: '#ffffff', 'surface-2': n[100], 'surface-3': n[200], inverse: n[900], 'on-inverse': n[50], text: n[950], 'text-muted': n[600], border: n[300], 'border-strong': n[950], 'on-warning': n[950], overlay: alpha(n[950], 0.55), 'disabled-bg': n[200], 'disabled-text': n[400], 'shadow-color': alpha(n[950], 0.12) }
      : { bg: n[950], surface: n[900], 'surface-2': n[800], 'surface-3': n[700], inverse: n[50], 'on-inverse': n[900], text: n[50], 'text-muted': n[400], border: 'rgba(255, 255, 255, 0.12)', 'border-strong': n[50], 'on-success': n[950], 'on-warning': n[950], 'on-danger': n[950], 'on-info': n[950], overlay: 'rgba(0, 0, 0, 0.7)', 'disabled-bg': n[800], 'disabled-text': n[500], 'shadow-color': 'rgba(0, 0, 0, 0.5)' };
    t['text-subtle'] = light ? pick([n[500], mix(n[500], n[600]), n[600]], [t['surface-2']], 4.5) : pick([n[500], mix(n[500], n[400]), n[400]], [t['surface-2']], 4.5);
    t['border-control'] = light ? pick([n[400], mix(n[400], n[500]), n[500]], [t.surface, t.bg], 3) : pick([n[600], n[500], n[400]], [t.surface, t.bg], 3);

    if (!c) {
      Object.assign(t, light
        ? { accent: n[900], 'accent-hover': n[700], 'accent-active': n[600], 'accent-strong': n[900], 'on-accent': n[50], 'accent-text': n[900], 'accent-soft': n[100], 'accent-border': n[300], focus: n[900] }
        : { accent: n[50], 'accent-hover': n[200], 'accent-active': n[300], 'accent-strong': n[50], 'on-accent': n[900], 'accent-text': n[50], 'accent-soft': 'rgba(255, 255, 255, 0.1)', 'accent-border': 'rgba(255, 255, 255, 0.3)', focus: n[300] });
    } else if (light) {
      // A white label is used when it is readable on the 600 step; otherwise the 500 step carries a dark label.
      const white = ratio('#ffffff', c[600]) >= 4.5;
      Object.assign(t, white ? { accent: c[600], 'accent-hover': c[700], 'accent-active': c[800], 'on-accent': '#ffffff' } : { accent: c[500], 'accent-hover': c[400], 'accent-active': c[300], 'on-accent': n[950] });
      t['accent-strong'] = pick([t.accent, c[600], c[700]], [t.surface], 3);
      t['accent-soft'] = c[50];
      t['accent-border'] = c[200];
      t['accent-text'] = pick([c[600], c[700], c[800]], [t.surface, t['surface-2'], t.bg, c[50]], 4.5);
      t.focus = pick([c[600], c[700]], [t.surface, t.bg], 3);
    } else {
      const base = ratio(n[950], c[500]) >= 4.5 ? c[500] : c[400];
      Object.assign(t, { accent: base, 'accent-hover': base === c[500] ? c[400] : c[300], 'accent-active': base === c[500] ? c[300] : c[200], 'accent-strong': base, 'on-accent': n[950], 'accent-soft': alpha(c[500], 0.16), 'accent-border': alpha(c[500], 0.45), focus: c[400] });
      const softOnSurface = '#' + over(parse(t['accent-soft']), parse(t.surface)).slice(0, 3).map(hex).join('');
      t['accent-text'] = pick([c[400], c[300], c[200]], [t.surface, t['surface-2'], t.bg, softOnSurface], 4.5);
    }
    return t;
  }

  const shared = (state) => ({
    'font-display': FONTS[state.heading].stack,
    'font-sans': FONTS[state.body].stack,
    'radius-control': RADII[state.radius].control,
    'radius-surface': RADII[state.radius].surface,
    ...Object.fromEntries(Object.entries(BASES[state.base].ramp).map(([k, v]) => [`neutral-${k}`, v])),
  });

  // Rules that tokens alone cannot express.
  function extras(state, p) {
    const rules = [`${p}.xz-icon { stroke-width: ${ICONS[state.icon].width}; }`];
    if (state.radius === 'pill') {
      rules.push(`${p}.xz-check input { border-radius: 6px; }`, `${p}.xz-textarea, ${p}.xz-alert, ${p}.xz-table-wrap, ${p}.xz-menu__list { border-radius: 16px; }`);
    }
    return rules;
  }

  // ---------- contrast report ----------
  const CHECKS = [
    ['text', 'bg', 4.5, 'Text on the page'], ['text-muted', 'surface-2', 4.5, 'Muted text on a muted fill'], ['text-subtle', 'surface-2', 4.5, 'Placeholder text'],
    ['on-accent', 'accent', 4.5, 'Label on the main button'], ['on-accent', 'accent-hover', 4.5, 'Label on a hovered button'], ['on-accent', 'accent-active', 4.5, 'Label on a pressed button'],
    ['accent-text', 'surface', 4.5, 'Link on a card'], ['accent-text', 'surface-2', 4.5, 'Link on a muted fill'],
    ['accent-strong', 'surface', 3, 'Outline of a ticked box'], ['border-control', 'surface', 3, 'Input outline'], ['focus', 'bg', 3, 'Focus ring'],
  ];
  const failures = (state) => ['light', 'dark'].flatMap((mode) => {
    const t = tokens(state, mode);
    return CHECKS.filter(([fg, bg, min]) => ratio(t[fg], t[bg]) < min).map(([fg, bg, min, label]) => `${label}, ${mode} (${ratio(t[fg], t[bg]).toFixed(2)}, needs ${min})`);
  });

  // ---------- export ----------
  const block = (selector, vars, head = '') => `${selector} {\n${head}${Object.entries(vars).map(([k, v]) => `  --xz-${k}: ${v};`).join('\n')}\n}`;
  const presetOf = (state) => ORDER.map((k) => state[k]).join('.');
  function css(state) {
    return [
      `/* Xsenze UI Kit theme. Preset: ${presetOf(state)}\n   Load this file after xsenze.css. */`,
      block(':root', shared(state)),
      block(':root,\n[data-theme="light"]', tokens(state, 'light'), '  color-scheme: light;\n'),
      block('[data-theme="dark"]', tokens(state, 'dark'), '  color-scheme: dark;\n'),
      extras(state, '').join('\n'),
    ].join('\n\n') + '\n';
  }
  const json = (state) => JSON.stringify({ preset: presetOf(state), core: shared(state), light: tokens(state, 'light'), dark: tokens(state, 'dark'), iconStrokeWidth: ICONS[state.icon].width }, null, 2) + '\n';

  // ---------- state ----------
  function fromPreset(code) {
    const parts = String(code || '').trim().toLowerCase().split('.').map((p) => ALIASES[p] || p);
    if (parts.length !== ORDER.length) return null;
    const out = {};
    for (const [i, key] of ORDER.entries()) {
      if (!(parts[i] in OPTIONS[key])) return null;
      out[key] = parts[i];
    }
    return out;
  }
  const hash = new URLSearchParams(location.hash.slice(1));
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('xz-create')) || {};
  } catch {
    /* start from the defaults */
  }
  const state = { ...DEFAULTS, ...saved, ...(fromPreset(hash.get('preset')) || {}) };
  for (const key of ORDER) {
    if (ALIASES[state[key]]) state[key] = ALIASES[state[key]];
    if (!(state[key] in OPTIONS[key])) state[key] = DEFAULTS[key];
  }
  if (hash.get('mode') === 'light' || hash.get('mode') === 'dark') state.mode = hash.get('mode');
  if (state.mode !== 'light' && state.mode !== 'dark') state.mode = DEFAULTS.mode;

  // ---------- controls: one row of picture tiles per setting ----------
  const style = document.createElement('style');
  document.head.append(style);
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const MODES = { light: { label: 'Light' }, dark: { label: 'Dark' } };
  const FONT_NAMES = { jakarta: 'Jakarta', grotesk: 'Grotesk', mono: 'Mono', system: 'System' };

  // Each row: its name, its choices and the small picture drawn in each tile.
  const ROWS = {
    mode: { name: 'Mode', options: MODES, face: (k) => `<i data-xz-icon="${k === 'light' ? 'sun' : 'moon'}" data-size="sm"></i><span class="cr-tile__text">${MODES[k].label}</span>` },
    base: { name: 'Base colour', options: BASES, face: (k, o) => `<span class="cr-sym-stripes">${[100, 500, 900].map((n) => `<i style="background:${o.ramp[n]}"></i>`).join('')}</span><span class="cr-tile__text">${o.label.split(' ')[0]}</span>` },
    theme: { name: 'Main colour', options: THEMES, face: (k) => `<span class="cr-sym-dot" data-cr-dot="${k}"></span>` },
    heading: { name: 'Heading font', options: FONTS, tall: true, face: (k, o) => `<span class="cr-sym-font" style="font-family:${esc(o.stack)}">Aa</span><span class="cr-tile__name" style="font-family:${esc(o.stack)}">${FONT_NAMES[k]}</span>` },
    body: { name: 'Body font', options: FONTS, tall: true, face: (k, o) => `<span class="cr-sym-font" style="font-family:${esc(o.stack)}">Aa</span><span class="cr-tile__name" style="font-family:${esc(o.stack)}">${FONT_NAMES[k]}</span>` },
    radius: { name: 'Corners', options: RADII, face: (k) => `<span class="cr-sym-corner" style="border-top-left-radius:${k === 'pill' ? '1.25rem' : k + 'px'}"></span>` },
    icon: { name: 'Icon weight', options: ICONS, face: (k, o) => `<span class="cr-sym-icon" style="--cr-w:${o.width}"><i data-xz-icon="star"></i></span>` },
  };

  for (const row of $$('[data-cr-opt]')) {
    const key = row.dataset.crOpt;
    const def = ROWS[key];
    const lockable = ORDER.includes(key);
    row.innerHTML = `
      <div class="cr-opt__head">
        <span class="cr-opt__name" id="cr-opt-${key}">${def.name}</span>
        <span class="cr-opt__value" data-cr-value="${key}"></span>
        ${lockable ? `<button type="button" class="cr-lock" data-cr-lock="${key}" aria-pressed="false" aria-label="Lock ${def.name.toLowerCase()} for Shuffle" data-xz-tooltip="Keep this when you shuffle"><i data-xz-icon="lock-open" data-size="sm"></i></button>` : ''}
      </div>
      <div class="cr-opt__tiles${def.tall ? ' cr-opt__tiles--tall' : ''}" role="radiogroup" aria-labelledby="cr-opt-${key}">
        ${Object.entries(def.options).map(([k, o]) => `<label class="cr-tile" data-xz-tooltip="${esc(o.label)}"><input class="cr-tile__input" type="radio" name="cr-${key}" value="${k}"><span class="cr-tile__face" aria-hidden="true">${def.face(k, o)}</span><span class="xz-sr-only">${esc(o.label)}</span></label>`).join('')}
      </div>`;
  }

  // ---------- locks and history ----------
  let locks = new Set();
  try {
    locks = new Set((JSON.parse(localStorage.getItem('xz-create-locks')) || []).filter((k) => ORDER.includes(k)));
  } catch {
    /* no saved locks */
  }
  const past = [];
  const future = [];
  const snap = () => ({ ...state });
  /** Remember the current state before it changes, so it can be undone. */
  const record = () => {
    past.push(snap());
    if (past.length > 50) past.shift();
    future.length = 0;
  };
  const same = (a, b) => [...ORDER, 'mode'].every((k) => a[k] === b[k]);
  /** Applies a change as one undoable step. */
  const change = (next) => {
    if (same({ ...state, ...next }, state)) return;
    record();
    Object.assign(state, next);
    render();
  };
  const undo = () => {
    if (!past.length) return;
    future.push(snap());
    Object.assign(state, past.pop());
    render();
  };
  const redo = () => {
    if (!future.length) return;
    past.push(snap());
    Object.assign(state, future.pop());
    render();
  };

  function render() {
    const scope = '.cr-preview';
    preview.dataset.theme = state.mode;
    style.textContent = block(scope, { ...shared(state), ...tokens(state, state.mode) }, `  --cr-icon-stroke: ${ICONS[state.icon].width};\n  color-scheme: ${state.mode};\n`) + '\n' + extras(state, scope + ' ').join('\n');

    for (const input of $$('.cr-tile__input')) input.checked = state[input.name.slice(3)] === input.value;
    for (const el of $$('[data-cr-value]')) el.textContent = ROWS[el.dataset.crValue].options[state[el.dataset.crValue]].label;
    // Each colour dot shows the exact button colour for the current mode and greys.
    for (const dot of $$('[data-cr-dot]')) {
      const k = dot.dataset.crDot;
      const n = BASES[state.base].ramp;
      dot.style.background = THEMES[k].ramp ? tokens({ ...state, theme: k }, state.mode).accent : `linear-gradient(135deg, ${n[900]} 50%, ${n[50]} 50%)`;
    }
    for (const btn of $$('[data-cr-lock]')) {
      const on = locks.has(btn.dataset.crLock);
      if (btn.getAttribute('aria-pressed') !== String(on)) {
        btn.setAttribute('aria-pressed', String(on));
        btn.setAttribute('data-xz-tooltip', on ? 'Locked. Shuffle keeps this' : 'Keep this when you shuffle');
        if (window.Xsenze) btn.innerHTML = window.Xsenze.icon(on ? 'lock' : 'lock-open', { size: 'sm' });
        else btn.querySelector('[data-xz-icon]')?.setAttribute('data-xz-icon', on ? 'lock' : 'lock-open');
      }
    }
    const shuffleBtn = $('[data-cr-action="shuffle"]');
    const allLocked = ORDER.every((k) => locks.has(k));
    shuffleBtn.disabled = allLocked;
    shuffleBtn.setAttribute('data-xz-tooltip', allLocked ? 'Unlock a setting to shuffle' : 'Changes every setting that is not locked');
    $('[data-cr-action="undo"]').disabled = !past.length;
    $('[data-cr-action="redo"]').disabled = !future.length;

    const code = presetOf(state);
    $('[data-cr-preset]').value = code;
    $('[data-cr-preset-short]').textContent = code;
    const bad = failures(state);
    $('[data-cr-status]').innerHTML = bad.length
      ? `<span class="xz-badge xz-badge--danger">${bad.length} contrast ${bad.length === 1 ? 'check fails' : 'checks fail'}</span><ul>${bad.map((b) => `<li>${b}</li>`).join('')}</ul>`
      : '<span class="xz-badge xz-badge--success">Readable in light and dark (WCAG AA)</span>';
    $('[data-cr-code="css"]').textContent = css(state);
    $('[data-cr-code="json"]').textContent = json(state);
    try {
      localStorage.setItem('xz-create', JSON.stringify(state));
      localStorage.setItem('xz-create-locks', JSON.stringify([...locks]));
    } catch {
      /* the page still works without storage */
    }
    history.replaceState(null, '', `#preset=${code}&mode=${state.mode}`);
  }

  $('[data-cr-form]').addEventListener('change', (e) => {
    const input = e.target.closest('.cr-tile__input');
    if (input) change({ [input.name.slice(3)]: input.value });
  });

  const copy = async (text, done) => {
    try {
      await navigator.clipboard.writeText(text);
      window.Xsenze?.toast({ title: 'Copied', message: done, duration: 2500 });
    } catch {
      window.Xsenze?.toast({ title: 'Could not copy', message: 'Select the text and copy it by hand.', variant: 'danger' });
    }
  };
  const download = (name, text, type) => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type })), download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const actions = {
    shuffle() {
      const free = ORDER.filter((k) => !locks.has(k));
      if (!free.length) return;
      const any = (o) => Object.keys(o)[Math.floor(Math.random() * Object.keys(o).length)];
      // Try until the result differs from the current theme and passes every contrast check.
      for (let i = 0; i < 60; i++) {
        const next = Object.fromEntries(free.map((k) => [k, any(OPTIONS[k])]));
        // A system heading font or a mono body font rarely looks good, so Shuffle only keeps them when locked.
        if (next.heading === 'system' || next.body === 'mono') continue;
        const candidate = { ...state, ...next };
        if (presetOf(candidate) !== presetOf(state) && !failures(candidate).length) return change(next);
      }
      window.Xsenze?.toast({ title: 'Nothing new to shuffle', message: 'Unlock another setting and try again.' });
    },
    reset: () => change({ ...DEFAULTS }),
    undo,
    redo,
    'copy-link': () => copy(location.href, 'The link to this theme is on your clipboard.'),
    'copy-css': () => copy(css(state), 'The theme CSS is on your clipboard.'),
    'copy-json': () => copy(json(state), 'The theme tokens are on your clipboard.'),
    'download-css': () => download('theme.css', css(state), 'text/css'),
    'download-json': () => download('theme.json', json(state), 'application/json'),
  };

  document.addEventListener('click', (e) => {
    const lock = e.target.closest('[data-cr-lock]');
    if (lock) {
      const key = lock.dataset.crLock;
      locks.has(key) ? locks.delete(key) : locks.add(key);
      render();
    }
    const action = e.target.closest('[data-cr-action]');
    if (action && !action.disabled) actions[action.dataset.crAction]?.();
  });

  // Ctrl+Z undoes and Ctrl+Y or Ctrl+Shift+Z redoes, except while typing in a text box.
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    if (e.target.matches('input[type="text"], input:not([type]), textarea, [contenteditable="true"]') || document.querySelector('dialog[open]')) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
      e.preventDefault();
      redo();
    }
  });

  const presetInput = $('[data-cr-preset]');
  const openPreset = () => {
    const next = fromPreset(presetInput.value);
    if (next) {
      presetInput.removeAttribute('aria-invalid');
      change(next);
    } else {
      presetInput.setAttribute('aria-invalid', 'true');
      window.Xsenze?.toast({ title: 'That code is not a preset', message: 'A preset looks like grey.mono.jakarta.grotesk.4.regular', variant: 'danger' });
    }
  };
  presetInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      openPreset();
    }
  });
  presetInput.addEventListener('change', () => presetInput.value !== presetOf(state) && openPreset());
  $('[data-cr-form]').addEventListener('submit', (e) => e.preventDefault());
  preview.addEventListener('submit', (e) => e.preventDefault());

  // A pasted or edited link in the same tab only changes the hash, so read it again.
  addEventListener('hashchange', () => {
    const next = new URLSearchParams(location.hash.slice(1));
    const preset = fromPreset(next.get('preset'));
    const mode = next.get('mode');
    change({ ...(preset || {}), ...(mode === 'light' || mode === 'dark' ? { mode } : {}) });
  });

  // ---------- phones and tablets: the panel opens from a bar at the bottom ----------
  const panel = $('[data-cr-panel]');
  const toggle = $('[data-cr-toggle]');
  const setOpen = (open, focus) => {
    panel.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    $('[data-cr-toggle-text]').textContent = open ? 'Done' : 'Customise';
    if (open && focus) panel.querySelector('.cr-tile__input:checked')?.focus({ preventScroll: true });
    if (!open && focus) toggle.focus();
  };
  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('is-open'), true));
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('is-open') && getComputedStyle(toggle.parentElement).display !== 'none') {
      e.preventDefault();
      setOpen(false, true);
    }
  });

  render();
})();
