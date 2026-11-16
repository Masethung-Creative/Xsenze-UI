// Landing page: live numbers, the theme demo, template thumbnails and scroll reveal.
document.addEventListener('DOMContentLoaded', () => {
  const { tokens, sizes, icons, version } = window.XZ_DOCS;
  const $ = (id) => document.getElementById(id);
  const kb = (n) => (n / 1024).toFixed(1) + ' KB';

  // ---- numbers from the last build ----
  $('lp-fact-css').textContent = Math.round(sizes.css.gzip / 1024) + ' KB';
  $('lp-fact-icons').textContent = icons.length;
  $('lp-version').textContent = 'v' + version;

  const names = { base: 'Base and layout', button: 'Buttons', forms: 'Forms', 'forms-advanced': 'Advanced form controls', display: 'Badges, avatars, loaders', composites: 'Cards, tabs, alerts', components: 'Menus, wizard, media', nav: 'Navigation', overlays: 'Overlays', table: 'Table', templates: 'Page templates', sections: 'Blocks' };
  $('lp-sizes').innerHTML =
    `<li><strong>xsenze.min.css</strong><strong>${kb(sizes.css.gzip)}</strong></li><li><strong>xsenze.min.js</strong><strong>${kb(sizes.js.gzip)}</strong></li>` +
    Object.entries(sizes.parts).map(([k, v]) => `<li><span>${names[k] || k}</span><span>${kb(v)}</span></li>`).join('');

  // ---- foundations tile ----
  $('lp-swatches').innerHTML = ['neutral-950', 'neutral-700', 'neutral-500', 'neutral-300', 'neutral-100', 'brand-500'].map((k) => `<i style="background:${tokens.core[k]}"></i>`).join('');
  $('lp-icons').innerHTML = ['house', 'users', 'calendar', 'indian-rupee', 'chart-column', 'bell', 'graduation-cap', 'settings'].map((n) => window.Xsenze.icon(n)).join('');

  // ---- Indian formats ----
  const amount = $('lp-amount');
  const f = window.Xsenze.format;
  const formats = () => {
    const n = Number(amount.value) || 0;
    $('lp-formats').innerHTML = [['format.inr()', f.inr(n)], ['format.inrCompact()', f.inrCompact(n)], ['format.number()', f.number(n)], ['format.date()', f.date(new Date())], ['format.financialYear()', f.financialYear()]]
      .map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join('');
  };
  amount.addEventListener('input', formats);
  formats();

  // ---- theme demo ----
  // Values come from the Create page's rules for the grey base, so the demo and the exported theme match.
  const KEYS = ['accent', 'accent-hover', 'accent-active', 'accent-strong', 'on-accent', 'accent-text', 'accent-soft', 'accent-border', 'focus'];
  const THEMES = {
    mono: { label: 'Mono', dot: '#171717', light: ['#171717', '#404040', '#525252', '#171717', '#fafafa', '#171717', '#f5f5f5', '#d4d4d4', '#171717'], dark: ['#fafafa', '#e5e5e5', '#d4d4d4', '#fafafa', '#171717', '#fafafa', 'rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.3)', '#d4d4d4'] },
    orange: { label: 'Orange', dot: '#ff6300', light: ['#ff6300', '#ff8a33', '#ffae6b', '#db5200', '#0a0a0a', '#a83e00', '#fff5eb', '#ffcfa3', '#db5200'], dark: ['#ff6300', '#ff8a33', '#ffae6b', '#ff6300', '#0a0a0a', '#ff8a33', 'rgba(255, 99, 0, 0.16)', 'rgba(255, 99, 0, 0.45)', '#ff8a33'] },
    coral: { label: 'Coral', dot: '#ff6f61', light: ['#ff6f61', '#ff8b7e', '#ffa99f', '#e5503f', '#0a0a0a', '#b83a2c', '#fff3f1', '#ffcbc4', '#e5503f'], dark: ['#ff6f61', '#ff8b7e', '#ffa99f', '#ff6f61', '#0a0a0a', '#ff8b7e', 'rgba(255, 111, 97, 0.16)', 'rgba(255, 111, 97, 0.45)', '#ff8b7e'] },
    blue: { label: 'Blue', dot: '#2563eb', light: ['#2563eb', '#1d4ed8', '#1e40af', '#2563eb', '#ffffff', '#2563eb', '#eff6ff', '#bfdbfe', '#2563eb'], dark: ['#3b82f6', '#60a5fa', '#93c5fd', '#3b82f6', '#0a0a0a', '#60a5fa', 'rgba(59, 130, 246, 0.16)', 'rgba(59, 130, 246, 0.45)', '#60a5fa'] },
    green: { label: 'Green', dot: '#22c55e', light: ['#22c55e', '#4ade80', '#86efac', '#16a34a', '#0a0a0a', '#15803d', '#f0fdf4', '#bbf7d0', '#16a34a'], dark: ['#22c55e', '#4ade80', '#86efac', '#22c55e', '#0a0a0a', '#4ade80', 'rgba(34, 197, 94, 0.16)', 'rgba(34, 197, 94, 0.45)', '#4ade80'] },
    violet: { label: 'Violet', dot: '#7c3aed', light: ['#7c3aed', '#6d28d9', '#5b21b6', '#7c3aed', '#ffffff', '#7c3aed', '#f5f3ff', '#ddd6fe', '#7c3aed'], dark: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#8b5cf6', '#0a0a0a', '#a78bfa', 'rgba(139, 92, 246, 0.16)', 'rgba(139, 92, 246, 0.45)', '#a78bfa'] },
  };
  const RADII = { 0: ['0', '0'], 4: ['4px', '4px'], 12: ['12px', '12px'], pill: ['9999px', '16px'] };
  const stage = $('lp-theme');
  const state = { theme: 'orange', radius: '4', mode: 'light' };

  const colours = $('lp-theme-colours');
  colours.insertAdjacentHTML('beforeend', Object.entries(THEMES).map(([k, t]) => `<button class="lp-dot" type="button" data-theme-key="${k}" style="--dot:${t.dot}" aria-label="${t.label}" aria-pressed="false" data-xz-tooltip="${t.label}"></button>`).join(''));

  const paint = () => {
    stage.dataset.theme = state.mode;
    THEMES[state.theme][state.mode].forEach((v, i) => stage.style.setProperty(`--xz-${KEYS[i]}`, v));
    const [control, surface] = RADII[state.radius];
    stage.style.setProperty('--xz-radius-control', control);
    stage.style.setProperty('--xz-radius-surface', surface);
    colours.querySelectorAll('.lp-dot').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeKey === state.theme)));
    $('lp-theme-radius').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.radius === state.radius)));
    const dark = state.mode === 'dark';
    $('lp-theme-mode').innerHTML = `${window.Xsenze.icon(dark ? 'sun' : 'moon', { size: 'sm' })}${dark ? 'Light' : 'Dark'}`;
    $('lp-theme-link').href = `create.html#preset=grey.${state.theme}.satoshi.grotesk.${state.radius}.regular&mode=${state.mode}`;
  };
  colours.addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme-key]');
    if (b) { state.theme = b.dataset.themeKey; paint(); }
  });
  $('lp-theme-radius').addEventListener('click', (e) => {
    const b = e.target.closest('[data-radius]');
    if (b) { state.radius = b.dataset.radius; paint(); }
  });
  $('lp-theme-mode').addEventListener('click', () => { state.mode = state.mode === 'dark' ? 'light' : 'dark'; paint(); });
  paint();

  // ---- template thumbnails: scale each 1280px page to its frame ----
  const fit = new ResizeObserver((entries) => {
    for (const e of entries) e.target.style.setProperty('--lp-scale', e.contentRect.width / 1280);
  });
  document.querySelectorAll('.lp-thumb__frame').forEach((el) => fit.observe(el));

  // ---- reveal on scroll ----
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll('.lp-head, .lp-tile, .lp-theme, .lp-stage, .lp-step, .lp-thumb, .lp-phases > *, .lp-faq');
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => { el.classList.add('lp-reveal'); io.observe(el); });
  }
});
