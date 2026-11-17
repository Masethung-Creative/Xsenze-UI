// Charts drawn in SVG from a table in the page, or from data passed in JavaScript.
// The table stays in the page for screen readers and as a "Show table" view, so the numbers are never only in a picture.
// Browser: load dist/xsenze-charts.min.js after dist/xsenze.min.js.
// Bundlers: import Xsenze from 'xsenze-ui'; import charts from 'xsenze-ui/charts'; Xsenze.use(charts);
import { scaleOf, formatter, parseValue } from './scale.js';
import { $$, fire, nextId, esc, motionOn, onMotion, watch, perFrame, dirKey } from '../shared.js';

const TYPES = ['bar', 'line', 'area', 'donut', 'pie', 'radar', 'radial'];
const TAU = Math.PI * 2;
const MAX_SLICES = 8;
let ctx2d = null;
const textWidth = (text, font) => {
  ctx2d ||= document.createElement('canvas').getContext('2d');
  ctx2d.font = font;
  return ctx2d.measureText(String(text)).width;
};
const colorOf = (c, i) => {
  const name = c || `viz-${(i % 8) + 1}`;
  return /^viz-\d+$/.test(name) ? `var(--xz-${name})` : name;
};
const round = (n) => Math.round(n * 10) / 10;

// ---------- data ----------
function readTable(table) {
  const head = table.tHead?.rows[0] || table.rows[0];
  if (!head) return { labels: [], series: [] };
  const series = Array.from(head.cells)
    .slice(1)
    .map((th, i) => ({ name: th.textContent.trim(), color: th.getAttribute('data-xz-color') || '', values: [], i }));
  const labels = [];
  for (const tr of Array.from(table.tBodies[0]?.rows || [])) {
    const cells = Array.from(tr.cells);
    if (!cells.length) continue;
    labels.push(cells[0].textContent.trim());
    series.forEach((s, i) => {
      const c = cells[i + 1];
      s.values.push(c ? parseValue(c.getAttribute('data-value') ?? c.textContent) : null);
    });
  }
  return { labels, series };
}
function normalize(data) {
  const labels = (data.labels || []).map(String);
  const series = (data.series || []).map((s, i) => ({
    name: String(s.name ?? `Series ${i + 1}`),
    color: colorOf(s.color, i),
    values: labels.map((_, j) => {
      const v = s.values?.[j];
      return v == null || Number.isNaN(Number(v)) ? null : Number(v);
    }),
  }));
  return { labels, series };
}

// ---------- shared tooltip ----------
let tipEl = null;
function tip() {
  if (tipEl?.isConnected) return tipEl;
  tipEl = document.createElement('div');
  tipEl.className = 'xz-chart-tip';
  tipEl.setAttribute('aria-hidden', 'true');
  tipEl.hidden = true;
  document.body.append(tipEl);
  return tipEl;
}
function placeTip(x, y) {
  const t = tip();
  const vw = document.documentElement.clientWidth;
  const r = t.getBoundingClientRect();
  let top = y - r.height - 12;
  if (top < 8) top = y + 16;
  t.style.left = `${Math.max(8, Math.min(x - r.width / 2, vw - r.width - 8))}px`;
  t.style.top = `${top}px`;
}

// ---------- the chart ----------
export function chart(el, options = {}) {
  if (!el) return null;
  if (el.xzChart && !Object.keys(options).length) return el.xzChart;
  el.xzChart?.destroy();
  el.xzChart = create(el, options);
  return el.xzChart;
}

function create(fig, options) {
  fig.classList.add('xz-chart');
  const id = nextId('chart');
  const attr = (n) => fig.getAttribute(`data-xz-chart-${n}`);
  const flag = (n) => {
    const v = attr(n);
    return v !== null && v !== 'false' && v !== 'off';
  };
  const type = TYPES.includes(options.type) ? options.type : TYPES.includes(fig.getAttribute('data-xz-chart')) ? fig.getAttribute('data-xz-chart') : 'bar';
  const curve = options.curve || attr('curve');
  // 100%: each category adds up to the whole, so the bars or areas show shares.
  const expand = options.expand ?? flag('expand');
  const cfg = {
    type,
    round: type === 'donut' || type === 'pie' || type === 'radial',
    stacked: expand || (options.stacked ?? flag('stacked')),
    expand,
    gradient: options.gradient ?? flag('gradient'),
    horizontal: type === 'bar' && (options.horizontal ?? flag('horizontal')),
    curve: curve === 'smooth' || curve === 'step' ? curve : '',
    showValues: options.values ?? flag('values'),
    patterns: options.patterns ?? flag('patterns'),
    legend: options.legend ?? attr('legend') !== 'off',
    zero: options.zero ?? (type === 'bar' || type === 'area' || attr('zero') !== 'false'),
    min: options.min ?? (attr('min') !== null ? Number(attr('min')) : null),
    max: options.max ?? (attr('max') !== null ? Number(attr('max')) : null),
    empty: options.empty || attr('empty') || 'No data to show yet.',
  };
  const fmtName = options.format || attr('format') || 'number';
  const fmt = formatter(fmtName);
  const axisFmt = formatter(options.axisFormat || attr('axis-format') || fmtName, { axis: true });
  const pct = formatter('percent');

  const caption = fig.querySelector(':scope > figcaption');
  const table = fig.querySelector(':scope > table, :scope > .xz-table-wrap > table');
  const json = fig.querySelector(':scope > script.xz-chart__data');
  const source = () => {
    if (options.data || options.labels) return options.data || { labels: options.labels, series: options.series };
    if (json) {
      try {
        return JSON.parse(json.textContent);
      } catch {
        console.warn('[Xsenze] The chart data is not valid JSON.');
      }
    }
    return table ? readTable(table) : { labels: [], series: [] };
  };
  let data = normalize(source());

  // ---------- parts ----------
  const made = [];
  const add = (node, before) => {
    fig.insertBefore(node, before || null);
    made.push(node);
    return node;
  };
  const after = caption ? caption.nextSibling : fig.firstChild;
  const legend = add(Object.assign(document.createElement('div'), { className: 'xz-chart__legend' }), after);
  const plot = add(Object.assign(document.createElement('div'), { className: 'xz-chart__plot' }), legend.nextSibling);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'xz-chart__svg');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-roledescription', 'chart');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('focusable', 'true');
  plot.append(svg);
  const live = add(Object.assign(document.createElement('div'), { className: 'xz-sr-only' }), plot.nextSibling);
  live.setAttribute('aria-live', 'polite');
  let toggle = null;
  if (table) {
    table.id ||= `${id}-table`;
    table.classList.add('xz-chart__table');
    const wrap = table.closest('.xz-table-wrap') || table;
    toggle = add(Object.assign(document.createElement('button'), { type: 'button', className: 'xz-chart__toggle', textContent: 'Show table' }), wrap);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', table.id);
    toggle.addEventListener('click', () => {
      const on = !fig.classList.contains('is-table-shown');
      fig.classList.toggle('is-table-shown', on);
      toggle.setAttribute('aria-expanded', String(on));
      toggle.textContent = on ? 'Hide table' : 'Show table';
    });
  }
  fig.classList.add('is-ready');

  const hidden = new Set();
  let geom = null;
  let active = null;

  // ---------- legend ----------
  const keys = () => (cfg.round ? sliceList().map((s) => ({ name: s.label, color: s.color, key: s.key })) : data.series.map((s, i) => ({ name: s.name, color: s.color, key: i })));
  const drawLegend = () => {
    const list = keys();
    legend.hidden = !cfg.legend || list.length < 2;
    legend.innerHTML = list
      .map((k, n) => `<button type="button" class="xz-chart__key" data-key="${k.key}" aria-pressed="${!hidden.has(k.key)}"><i class="xz-chart__swatch${cfg.patterns ? ` xz-chart__swatch--p${n % 6}` : ''}" style="--_c:${k.color}"></i>${esc(k.name)}</button>`)
      .join('');
  };
  legend.addEventListener('click', (e) => {
    const b = e.target.closest('.xz-chart__key');
    if (!b) return;
    const key = cfg.round ? b.dataset.key : Number(b.dataset.key);
    if (hidden.has(key)) hidden.delete(key);
    else hidden.add(key);
    b.setAttribute('aria-pressed', String(!hidden.has(key)));
    active = null;
    hideTip();
    draw();
    fire(fig, 'xz:legend', { series: b.textContent.trim(), visible: !hidden.has(key) });
  });

  // ---------- slices for donut and pie ----------
  function sliceList() {
    const s = data.series[0];
    if (!s) return [];
    let slices = data.labels.map((label, i) => ({ label, value: Math.max(0, s.values[i] ?? 0), color: colorOf(null, i), key: label, i }));
    slices.sort((a, b) => b.value - a.value);
    if (slices.length > MAX_SLICES) {
      const rest = slices.slice(MAX_SLICES - 1);
      slices = slices.slice(0, MAX_SLICES - 1).concat({ label: 'Other', value: rest.reduce((t, r) => t + r.value, 0), color: 'var(--xz-viz-8)', key: 'Other', i: -1, parts: rest.length });
    }
    return slices.map((sl, n) => ({ ...sl, color: sl.key === 'Other' ? sl.color : colorOf(null, n) }));
  }

  // ---------- drawing ----------
  const patternDefs = (list) =>
    !cfg.patterns
      ? ''
      : `<defs>${list
          .map((c, n) => {
            const v = n % 6;
            const mark = ['', '<path d="M0 6 6 0" />', '<circle cx="3" cy="3" r="1.1" />', '<path d="M0 3h6M3 0v6" />', '<path d="M0 1.5h6M0 4.5h6" />', '<path d="M1.5 0v6M4.5 0v6" />'][v];
            return `<pattern id="${id}-p${n}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" style="fill:${c}"/>${mark ? `<g class="xz-chart__pattern-mark">${mark}</g>` : ''}</pattern>`;
          })
          .join('')}</defs>`;
  const fillOf = (color, n) => (cfg.patterns && n % 6 ? `url(#${id}-p${n})` : color);

  function draw() {
    const W = Math.round(plot.clientWidth);
    const H = Math.round(plot.clientHeight);
    if (!W || !H) return;
    const cs = getComputedStyle(fig);
    const font = `12px ${cs.fontFamily}`;
    const radius = parseFloat(cs.getPropertyValue('--xz-chart-radius')) || 0;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.classList.toggle('is-horizontal', cfg.horizontal);
    const visible = data.series.map((s, i) => ({ ...s, i })).filter((s) => !hidden.has(s.i));
    const hasData = cfg.round ? sliceList().some((s) => s.value > 0 && !hidden.has(s.key)) : visible.some((s) => s.values.some((v) => v != null));
    fig.classList.toggle('is-empty', !hasData);
    if (!hasData) {
      geom = null;
      svg.innerHTML = `<text class="xz-chart__empty" x="${W / 2}" y="${H / 2}" text-anchor="middle" dominant-baseline="middle">${esc(cfg.empty)}</text>`;
      svg.setAttribute('aria-label', `${caption?.textContent.trim() || 'Chart'}. ${cfg.empty}`);
      return;
    }
    svg.innerHTML = type === 'radial' ? drawRadial(W, H) : cfg.round ? drawRound(W, H) : type === 'radar' ? drawRadar(W, H, visible, font) : drawCartesian(W, H, visible, font, radius);
    svg.setAttribute('aria-label', summary());
    if (active) showActive(false);
  }

  function summary() {
    const name = caption?.textContent.trim() || 'Chart';
    const kind = cfg.round || type === 'radar' ? `${type} chart` : `${cfg.horizontal ? 'horizontal ' : ''}${cfg.expand ? '100% stacked ' : cfg.stacked ? 'stacked ' : ''}${type} chart`;
    const what = cfg.round ? `${sliceList().length} ${type === 'radial' ? 'rings' : 'parts'}` : `${data.labels.length} points, ${data.series.length} series`;
    return `${name}. ${kind}, ${what}. Use the arrow keys to read each value.`;
  }

  function drawCartesian(W, H, visible, font, radius) {
    const n = data.labels.length;
    // 100%: each value becomes its share of the category; the tooltip still shows the value itself.
    if (cfg.expand) {
      const totals = data.labels.map((_, i) => visible.reduce((t, s) => t + Math.max(0, s.values[i] ?? 0), 0));
      visible = visible.map((s) => ({ ...s, raw: s.values, values: s.values.map((v, i) => (v == null || !totals[i] ? null : Math.max(0, v) / totals[i])) }));
    }
    // value range
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i++) {
      if (cfg.stacked && cfg.type !== 'line') {
        let pos = 0;
        let neg = 0;
        for (const s of visible) {
          const v = s.values[i] ?? 0;
          if (v >= 0) pos += v;
          else neg += v;
        }
        lo = Math.min(lo, neg);
        hi = Math.max(hi, pos);
      } else
        for (const s of visible) {
          const v = s.values[i];
          if (v == null) continue;
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
    }
    if (cfg.min != null) lo = cfg.min;
    if (cfg.max != null) hi = cfg.max;
    if (cfg.expand) [lo, hi] = [0, 1];
    const sc = scaleOf(lo, hi, { count: Math.max(3, Math.min(6, Math.floor((cfg.horizontal ? W : H) / 56))), zero: cfg.zero });
    const tickText = sc.ticks.map(cfg.expand ? formatter('percent', { axis: true }) : axisFmt);
    const catWidth = Math.max(...data.labels.map((l) => textWidth(l, font)), 0);
    const pad = 8;
    let x0;
    let x1;
    let y0;
    let y1;
    if (cfg.horizontal) {
      x0 = Math.min(Math.ceil(catWidth) + 12, W * 0.4);
      x1 = W - Math.max(pad, textWidth(tickText[tickText.length - 1], font) / 2 + 2);
      y0 = pad;
      y1 = H - 22;
    } else {
      x0 = Math.ceil(Math.max(...tickText.map((t) => textWidth(t, font)))) + 12;
      x1 = W - pad;
      y0 = pad + 4;
      y1 = H - 24;
    }
    const span = sc.hi - sc.lo || 1;
    const val = cfg.horizontal ? (v) => x0 + ((v - sc.lo) / span) * (x1 - x0) : (v) => y1 - ((v - sc.lo) / span) * (y1 - y0);
    const band = ((cfg.horizontal ? y1 - y0 : x1 - x0) / Math.max(1, n));
    const bandStart = (i) => (cfg.horizontal ? y0 : x0) + i * band;
    const center = (i) => bandStart(i) + band / 2;
    let out = patternDefs(visible.map((s) => s.color));
    // grid and value axis
    out += '<g class="xz-chart__grid" aria-hidden="true">';
    sc.ticks.forEach((t, k) => {
      const p = round(val(t));
      if (cfg.horizontal) out += `<line x1="${p}" x2="${p}" y1="${y0}" y2="${y1}"${t === 0 ? ' class="is-zero"' : ''}/><text x="${p}" y="${H - 6}" text-anchor="middle">${esc(tickText[k])}</text>`;
      else out += `<line x1="${x0}" x2="${x1}" y1="${p}" y2="${p}"${t === 0 ? ' class="is-zero"' : ''}/><text x="${x0 - 8}" y="${p}" text-anchor="end" dominant-baseline="middle">${esc(tickText[k])}</text>`;
    });
    out += '</g>';
    // category axis: thin out labels that would overlap
    const step = cfg.horizontal ? Math.max(1, Math.ceil(16 / band)) : Math.max(1, Math.ceil((catWidth + 12) / band));
    out += '<g class="xz-chart__axis" aria-hidden="true">';
    data.labels.forEach((l, i) => {
      if (i % step && i !== n - 1) return;
      if (cfg.horizontal) out += `<text x="${x0 - 8}" y="${round(center(i))}" text-anchor="end" dominant-baseline="middle">${esc(l)}</text>`;
      else out += `<text x="${round(center(i))}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`;
    });
    out += '</g>';

    const cats = data.labels.map((label, i) => ({ label, i, at: center(i), band: [bandStart(i), bandStart(i) + band], items: [] }));
    if (cfg.type === 'bar') {
      const inner = band * 0.72;
      const groups = cfg.stacked ? 1 : visible.length;
      const gap = groups > 1 ? Math.min(4, inner * 0.08) : 0;
      const bw = Math.max(1, (inner - gap * (groups - 1)) / groups);
      const pos = new Array(n).fill(0);
      const neg = new Array(n).fill(0);
      visible.forEach((s, k) => {
        out += `<g class="xz-chart__series" style="--_c:${s.color}">`;
        s.values.forEach((v, i) => {
          if (v == null) return;
          let from = 0;
          if (cfg.stacked) {
            from = v >= 0 ? pos[i] : neg[i];
            if (v >= 0) pos[i] += v;
            else neg[i] += v;
          }
          const a = val(from);
          const b = val(from + v);
          const start = bandStart(i) + (band - inner) / 2 + (cfg.stacked ? 0 : k * (bw + gap));
          const r = Math.min(radius, bw / 2, Math.abs(b - a) / 2);
          const shape = cfg.horizontal ? barPath(Math.min(a, b), start, Math.abs(b - a), bw, r, v >= 0 ? 'end' : 'start', true) : barPath(start, Math.min(a, b), bw, Math.abs(b - a), r, v >= 0 ? 'top' : 'bottom', false);
          const neg_ = v < 0 ? ' is-negative' : '';
          out += `<path class="xz-chart__bar${neg_}" d="${shape}" style="fill:${fillOf(s.color, visible.indexOf(s))}"/>`;
          if (cfg.showValues && !cfg.stacked) {
            const label = esc(axisFmt(v));
            out += cfg.horizontal ? `<text class="xz-chart__value" x="${round(Math.max(a, b) + 6)}" y="${round(start + bw / 2)}" dominant-baseline="middle">${label}</text>` : `<text class="xz-chart__value" x="${round(start + bw / 2)}" y="${round(Math.min(a, b) - 6)}" text-anchor="middle">${label}</text>`;
          }
          cats[i].items.push({ s: s.i, name: s.name, color: s.color, value: v, raw: s.raw?.[i], x: cfg.horizontal ? Math.max(a, b) : start + bw / 2, y: cfg.horizontal ? start + bw / 2 : Math.min(a, b) });
        });
        out += '</g>';
      });
    } else {
      // line and area
      const stackedArea = cfg.type === 'area' && cfg.stacked;
      const acc = new Array(n).fill(0);
      const layers = visible.map((s) => {
        const pts = s.values.map((v, i) => {
          if (v == null) return null;
          const from = stackedArea ? acc[i] : 0;
          if (stackedArea) acc[i] += v;
          return { x: center(i), y: val(from + v), base: val(from), v, i };
        });
        return { s, pts };
      });
      // areas first, so lines sit on top; a gradient fades each area towards the axis
      if (cfg.type === 'area') {
        if (cfg.gradient) out += `<defs>${layers.map(({ s }, k) => `<linearGradient id="${id}-g${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${s.color};stop-opacity:var(--xz-chart-fade)"/><stop offset="1" style="stop-color:${s.color};stop-opacity:0"/></linearGradient>`).join('')}</defs>`;
        layers.forEach(({ s, pts }, k) => {
          for (const run of runs(pts)) {
            const top = pathOf(run.map((p) => [p.x, p.y]), cfg.curve);
            const bottom = pathOf(run.map((p) => [p.x, p.base]).reverse(), cfg.curve).replace(/^M/, 'L');
            out += `<path class="xz-chart__area${cfg.gradient ? ' is-gradient' : ''}" d="${top}${bottom}Z" style="--_c:${s.color}${cfg.gradient ? `;fill:url(#${id}-g${k})` : ''}"/>`;
          }
        });
      }
      layers.forEach(({ s, pts }, k) => {
        const dash = cfg.patterns ? ['', '6 4', '2 3', '10 4 2 4', '1 4', '8 3 2 3 2 3'][k % 6] : '';
        out += `<g class="xz-chart__series" style="--_c:${s.color}">`;
        for (const run of runs(pts)) out += `<path class="xz-chart__line" pathLength="1" d="${pathOf(run.map((p) => [p.x, p.y]), cfg.curve)}"${dash ? ` style="stroke-dasharray:${dash}"` : ''}/>`;
        const showPoints = n <= 31;
        for (const p of pts) {
          if (!p) continue;
          if (showPoints) out += pointShape(p.x, p.y, cfg.patterns ? k % 4 : 0, 'xz-chart__point');
          cats[p.i].items.push({ s: s.i, name: s.name, color: s.color, value: p.v, raw: s.raw?.[p.i], x: p.x, y: p.y });
        }
        out += '</g>';
      });
    }
    out += '<g class="xz-chart__focus" aria-hidden="true"></g>';
    geom = { kind: 'cartesian', cats, x0, x1, y0, y1, horizontal: cfg.horizontal, total: cfg.stacked };
    return out;
  }

  function drawRound(W, H) {
    const slices = sliceList().filter((s) => !hidden.has(s.key) && s.value > 0);
    const total = slices.reduce((t, s) => t + s.value, 0);
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.max(10, Math.min(W, H) / 2 - 4);
    const thickness = parseFloat(getComputedStyle(fig).getPropertyValue('--xz-chart-donut')) || 0.36;
    const r0 = cfg.type === 'donut' ? R * (1 - thickness) : 0;
    let a = 0;
    let out = patternDefs(sliceList().map((s) => s.color));
    const all = sliceList();
    const parts = [];
    out += '<g class="xz-chart__slices">';
    for (const s of slices) {
      const n = all.indexOf(s);
      const a1 = a + (s.value / total) * Math.PI * 2;
      out += `<path class="xz-chart__slice" d="${arcPath(cx, cy, r0, R, a, a1)}" style="--_c:${s.color};fill:${fillOf(s.color, n)}"/>`;
      parts.push({ ...s, a0: a, a1, share: s.value / total, x: cx + ((r0 + R) / 2) * Math.sin((a + a1) / 2), y: cy - ((r0 + R) / 2) * Math.cos((a + a1) / 2) });
      a = a1;
    }
    out += '</g>';
    if (cfg.type === 'donut') out += `<g class="xz-chart__total" aria-hidden="true"><text x="${cx}" y="${cy - 4}" text-anchor="middle">${esc(axisFmt(total))}</text><text class="xz-chart__total-label" x="${cx}" y="${cy + 14}" text-anchor="middle">Total</text></g>`;
    out += '<g class="xz-chart__focus" aria-hidden="true"></g>';
    geom = { kind: 'round', parts, cx, cy, r0, R, total };
    return out;
  }

  // Radar: one spoke per category and a shape per series, for scores across several skills.
  function drawRadar(W, H, visible, font) {
    const n = data.labels.length;
    let hi = 0;
    for (const s of visible) for (const v of s.values) if (v != null) hi = Math.max(hi, v);
    const sc = scaleOf(0, cfg.max ?? hi, { count: 4 });
    const cx = W / 2;
    const cy = H / 2;
    const labelW = Math.max(0, ...data.labels.map((l) => textWidth(l, font)));
    const R = Math.max(12, Math.min(W / 2 - labelW - 14, H / 2 - 20));
    const at = (i, r) => [cx + r * Math.sin((i / n) * TAU), cy - r * Math.cos((i / n) * TAU)];
    const rOf = (v) => (Math.max(0, v) / (sc.hi || 1)) * R;
    const xy = (p) => `${round(p[0])},${round(p[1])}`;
    // The scale's numbers sit between the first two spokes, clear of the points, which lie on the spokes.
    let out = '<g class="xz-chart__grid" aria-hidden="true">';
    for (const t of sc.ticks) {
      if (!t) continue;
      const [tx, ty] = at(0.5, rOf(t) * Math.cos(Math.PI / n));
      out += `<polygon points="${data.labels.map((_, i) => xy(at(i, rOf(t)))).join(' ')}"/><text x="${round(tx)}" y="${round(ty)}" text-anchor="middle" dominant-baseline="middle">${esc(axisFmt(t))}</text>`;
    }
    data.labels.forEach((_, i) => {
      const [x, y] = at(i, R);
      out += `<line x1="${cx}" y1="${cy}" x2="${round(x)}" y2="${round(y)}"/>`;
    });
    out += '</g><g class="xz-chart__axis" aria-hidden="true">';
    const cats = data.labels.map((label, i) => {
      const [x, y] = at(i, R + 10);
      const sin = Math.sin((i / n) * TAU);
      const cos = Math.cos((i / n) * TAU);
      out += `<text x="${round(x)}" y="${round(y)}" text-anchor="${Math.abs(sin) < 0.2 ? 'middle' : sin > 0 ? 'start' : 'end'}" dominant-baseline="${cos > 0.3 ? 'auto' : cos < -0.3 ? 'hanging' : 'middle'}">${esc(label)}</text>`;
      const [ex, ey] = at(i, R);
      return { label, i, x: ex, y: ey, items: [] };
    });
    out += '</g>';
    visible.forEach((s, k) => {
      const pts = s.values.map((v, i) => at(i, rOf(v ?? 0)));
      const dash = cfg.patterns ? ['', '6 4', '2 3', '10 4 2 4', '1 4', '8 3 2 3 2 3'][k % 6] : '';
      out += `<g class="xz-chart__series" style="--_c:${s.color}"><polygon class="xz-chart__radar" points="${pts.map(xy).join(' ')}"${dash ? ` style="stroke-dasharray:${dash}"` : ''}/>`;
      pts.forEach(([x, y], i) => {
        if (s.values[i] == null) return;
        out += pointShape(x, y, cfg.patterns ? k % 4 : 0, 'xz-chart__point');
        cats[i].items.push({ s: s.i, name: s.name, color: s.color, value: s.values[i], x, y });
      });
      out += '</g>';
    });
    out += '<g class="xz-chart__focus" aria-hidden="true"></g>';
    geom = { kind: 'radar', cats, cx, cy, R };
    return out;
  }

  // Radial bars: one ring per category, filled to its share of the largest value or of data-xz-chart-max.
  function drawRadial(W, H) {
    const rings = sliceList().filter((s) => !hidden.has(s.key));
    const max = cfg.max ?? (Math.max(0, ...rings.map((s) => s.value)) || 1);
    const all = sliceList();
    const cx = W / 2;
    const cy = H / 2;
    let r = Math.max(12, Math.min(W, H) / 2 - 6);
    const gap = 4;
    const size = Math.max(6, Math.min(16, (r * 0.62 - gap * (rings.length - 1)) / Math.max(1, rings.length)));
    const parts = [];
    let out = `${patternDefs(all.map((s) => s.color))}<g class="xz-chart__rings">`;
    for (const s of rings) {
      const n = all.indexOf(s);
      const a1 = Math.min(1, s.value / max) * TAU;
      out += `<path class="xz-chart__track" d="${arcPath(cx, cy, r - size, r, 0, TAU)}"/>`;
      if (a1 > 0.001) out += `<path class="xz-chart__slice" d="${arcPath(cx, cy, r - size, r, 0, a1)}" style="--_c:${s.color};fill:${fillOf(s.color, n)}"/>`;
      parts.push({ ...s, a0: 0, a1, r0: r - size, r1: r, share: s.value / max, x: cx + (r - size / 2) * Math.sin(Math.max(a1, 0.3) / 2), y: cy - (r - size / 2) * Math.cos(Math.max(a1, 0.3) / 2) });
      r -= size + gap;
    }
    out += '</g>';
    // One ring reads like a progress ring: its share sits in the middle.
    if (parts.length === 1) out += `<g class="xz-chart__total" aria-hidden="true"><text x="${cx}" y="${cy - 4}" text-anchor="middle">${esc(pct(parts[0].share))}</text><text class="xz-chart__total-label" x="${cx}" y="${cy + 14}" text-anchor="middle">${esc(parts[0].label)}</text></g>`;
    out += '<g class="xz-chart__focus" aria-hidden="true"></g>';
    geom = { kind: 'radial', parts, cx, cy, total: max };
    return out;
  }

  // ---------- focus, hover and the tooltip ----------
  const focusLayer = () => svg.querySelector('.xz-chart__focus');
  function hideTip() {
    if (tipEl && tipEl.xzOwner === fig) tipEl.hidden = true;
    const f = focusLayer();
    if (f) f.innerHTML = '';
  }
  function showActive(announce = true) {
    if (!geom || !active) return hideTip();
    const t = tip();
    t.xzOwner = fig;
    const box = svg.getBoundingClientRect();
    const f = focusLayer();
    let html = '';
    let say = '';
    let px;
    let py;
    if (geom.parts) {
      // donut, pie and radial bars
      const p = geom.parts[active.i];
      if (!p) return hideTip();
      html = `<div class="xz-chart-tip__row"><i style="--_c:${p.color}"></i><span>${esc(p.label)}</span><b>${esc(fmt(p.value))}</b></div><div class="xz-chart-tip__meta">${Math.round(p.share * 1000) / 10}% of ${esc(fmt(geom.total))}${p.parts ? ` · ${p.parts} smaller parts` : ''}</div>`;
      say = `${p.label}, ${fmt(p.value)}, ${Math.round(p.share * 100)}%`;
      f.innerHTML = `<path class="xz-chart__ring" d="${geom.kind === 'radial' ? arcPath(geom.cx, geom.cy, p.r1 + 1, p.r1 + 3, 0, Math.max(p.a1, 0.05)) : arcPath(geom.cx, geom.cy, geom.R + 3, geom.R + 6, p.a0, p.a1)}" style="--_c:${p.color}"/>`;
      px = box.left + p.x;
      py = box.top + p.y;
    } else {
      // bars, lines, areas and radar
      const c = geom.cats[active.i];
      if (!c) return hideTip();
      const items = c.items;
      const pick = active.s != null ? items.find((it) => it.s === active.s) : null;
      const shown = (it) => fmt(it.raw ?? it.value) + (it.raw != null ? ` · ${pct(it.value)}` : '');
      html = `<div class="xz-chart-tip__title">${esc(c.label)}</div>${items.map((it) => `<div class="xz-chart-tip__row${pick && pick.s !== it.s ? ' is-quiet' : ''}"><i style="--_c:${it.color}"></i><span>${esc(it.name)}</span><b>${esc(shown(it))}</b></div>`).join('')}`;
      if (geom.total && items.length > 1) html += `<div class="xz-chart-tip__meta">Total ${esc(fmt(items.reduce((t, it) => t + (it.raw ?? it.value), 0)))}</div>`;
      const read = pick ? [pick] : items;
      say = `${c.label}: ${read.map((it) => `${it.name} ${shown(it)}`).join(', ') || 'no value'}`;
      const far = (it) => Math.hypot(it.x - geom.cx, it.y - geom.cy);
      // a band behind the category, or a guide line, and rings on the points
      f.innerHTML =
        (geom.kind === 'radar' ? `<line class="xz-chart__guide" x1="${geom.cx}" y1="${geom.cy}" x2="${round(c.x)}" y2="${round(c.y)}"/>` : geom.horizontal ? `<rect class="xz-chart__band" x="${geom.x0}" y="${c.band[0]}" width="${geom.x1 - geom.x0}" height="${c.band[1] - c.band[0]}"/>` : cfg.type === 'bar' ? `<rect class="xz-chart__band" x="${c.band[0]}" y="${geom.y0}" width="${c.band[1] - c.band[0]}" height="${geom.y1 - geom.y0}"/>` : `<line class="xz-chart__guide" x1="${c.at}" x2="${c.at}" y1="${geom.y0}" y2="${geom.y1}"/>`) +
        (cfg.type === 'bar' ? '' : items.map((it) => `<circle class="xz-chart__hit" cx="${it.x}" cy="${it.y}" r="5" style="--_c:${it.color}"/>`).join(''));
      // The tooltip sits by the chosen point, or by the highest (or, on a radar, the outermost) point of the category.
      const anchor = pick || items.reduce((m, it) => (geom.kind === 'radar' ? (far(it) > far(m) ? it : m) : geom.horizontal ? (it.x > m.x ? it : m) : it.y < m.y ? it : m), items[0] || { x: c.x ?? c.at, y: c.y ?? geom.y0 });
      px = box.left + anchor.x;
      py = box.top + anchor.y;
    }
    t.innerHTML = html;
    t.hidden = false;
    placeTip(px, py);
    if (announce) live.textContent = say;
    fire(fig, 'xz:point', { index: active.i, series: active.s, label: say });
  }
  const count = () => (geom ? (geom.parts || geom.cats).length : 0);
  const seriesAt = (i) => (geom?.cats ? geom.cats[i]?.items.map((it) => it.s) : []);
  svg.addEventListener('keydown', (e) => {
    const n = count();
    if (!n) return;
    const dir = dirKey(e, fig);
    let { i = -1, s = null } = active || {};
    if (dir || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      i = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : Math.max(0, Math.min(n - 1, i + (dir === 'next' ? 1 : -1)));
      if (i < 0) i = 0;
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && geom.cats) {
      e.preventDefault();
      const list = seriesAt(Math.max(0, i));
      if (!list.length) return;
      const at = s == null ? -1 : list.indexOf(s);
      s = list[(at + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length];
      if (i < 0) i = 0;
    } else if (e.key === 'Escape') {
      active = null;
      return hideTip();
    } else return;
    active = { i, s };
    showActive();
  });
  svg.addEventListener('focus', () => {
    if (!active && count()) {
      active = { i: 0, s: null };
      showActive();
    }
  });
  svg.addEventListener('blur', () => {
    active = null;
    hideTip();
  });
  const pointAt = (e) => {
    if (!geom) return null;
    const box = svg.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    if (geom.cx != null) {
      const dx = x - geom.cx;
      const dy = y - geom.cy;
      const d = Math.hypot(dx, dy);
      let ang = Math.atan2(dx, -dy);
      if (ang < 0) ang += TAU;
      let i = -1;
      if (geom.kind === 'radial') i = geom.parts.findIndex((p) => d >= p.r0 - 2 && d <= p.r1 + 2);
      else if (geom.kind === 'radar') i = d > geom.R + 24 ? -1 : Math.round(ang / (TAU / geom.cats.length)) % geom.cats.length;
      else if (d >= geom.r0 && d <= geom.R + 6) i = geom.parts.findIndex((p) => ang >= p.a0 && ang < p.a1);
      return i < 0 ? null : { i, s: null };
    }
    const at = geom.horizontal ? y : x;
    const i = geom.cats.findIndex((c) => at >= c.band[0] && at < c.band[1]);
    return i < 0 ? null : { i, s: null };
  };
  const onMove = (e) => {
    if (e.pointerType === 'touch' && e.type === 'pointermove') return;
    const hit = pointAt(e);
    if (!hit) {
      if (active && document.activeElement !== svg) {
        active = null;
        hideTip();
      }
      return;
    }
    if (active && active.i === hit.i && active.s === hit.s) return;
    active = hit;
    showActive(false);
  };
  plot.addEventListener('pointermove', onMove);
  plot.addEventListener('pointerdown', (e) => e.pointerType === 'touch' && onMove(e));
  plot.addEventListener('pointerleave', () => {
    if (document.activeElement === svg) return;
    active = null;
    hideTip();
  });
  plot.addEventListener('click', () => active && fire(fig, 'xz:select', { index: active.i, label: (geom?.parts || geom?.cats)?.[active.i]?.label }));

  // ---------- size, motion and updates ----------
  const redraw = perFrame(() => {
    draw();
  });
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(redraw) : null;
  ro?.observe(plot);
  addEventListener('resize', redraw);
  document.fonts?.ready?.then(redraw);
  const scrollHide = () => active && document.activeElement !== svg && hideTip();
  document.addEventListener('scroll', scrollHide, true);

  // The chart grows in once, the first time it is on screen, unless motion is off.
  let io = null;
  const enter = () => {
    if (!motionOn()) return;
    svg.classList.add('is-entering');
    setTimeout(() => svg.classList.remove('is-entering'), 900);
  };
  io = watch(fig, (visible) => {
    if (!visible) return;
    io?.disconnect();
    enter();
  }, { threshold: 0.3 });
  onMotion((on) => !on && svg.classList.remove('is-entering'));

  drawLegend();
  draw();

  const api = {
    el: fig,
    get data() {
      return data;
    },
    /** Redraw with new data, or with the table again when called without data. */
    update(next) {
      data = normalize(next || source());
      for (const k of [...hidden]) if (!keys().some((x) => x.key === k)) hidden.delete(k);
      drawLegend();
      draw();
      return api;
    },
    destroy() {
      ro?.disconnect();
      io?.disconnect();
      removeEventListener('resize', redraw);
      document.removeEventListener('scroll', scrollHide, true);
      hideTip();
      made.forEach((m) => m.remove());
      table?.classList.remove('xz-chart__table');
      fig.classList.remove('is-ready', 'is-table-shown', 'is-empty');
      delete fig.xzChart;
    },
  };
  return api;
}

// ---------- shapes ----------
function barPath(x, y, w, h, r, round, horizontal) {
  if (r <= 0.5) return `M${round_(x)} ${round_(y)}h${round_(w)}v${round_(h)}h${round_(-w)}Z`;
  const [X, Y, Wd, Ht] = [x, y, w, h].map(round_);
  // only the end of the bar away from the axis is rounded
  if (!horizontal && round === 'top') return `M${X} ${Y + Ht}V${Y + r}Q${X} ${Y} ${X + r} ${Y}H${X + Wd - r}Q${X + Wd} ${Y} ${X + Wd} ${Y + r}V${Y + Ht}Z`;
  if (!horizontal) return `M${X} ${Y}V${Y + Ht - r}Q${X} ${Y + Ht} ${X + r} ${Y + Ht}H${X + Wd - r}Q${X + Wd} ${Y + Ht} ${X + Wd} ${Y + Ht - r}V${Y}Z`;
  if (round === 'end') return `M${X} ${Y}H${X + Wd - r}Q${X + Wd} ${Y} ${X + Wd} ${Y + r}V${Y + Ht - r}Q${X + Wd} ${Y + Ht} ${X + Wd - r} ${Y + Ht}H${X}Z`;
  return `M${X + Wd} ${Y}H${X + r}Q${X} ${Y} ${X} ${Y + r}V${Y + Ht - r}Q${X} ${Y + Ht} ${X + r} ${Y + Ht}H${X + Wd}Z`;
}
const round_ = (n) => Math.round(n * 10) / 10;

/** Split a list of points at missing values, so lines show gaps instead of inventing data. */
function runs(pts) {
  const out = [];
  let cur = [];
  for (const p of pts) {
    if (p) cur.push(p);
    else if (cur.length) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

/** A line through the points: straight, in steps that change halfway between points, or smooth without overshooting the data (monotone curve). */
function pathOf(pts, curve) {
  if (!pts.length) return '';
  const f = (p) => `${round_(p[0])} ${round_(p[1])}`;
  if (curve === 'step') return `M${f(pts[0])}${pts.slice(1).map((p, i) => `H${round_((pts[i][0] + p[0]) / 2)}V${round_(p[1])}H${round_(p[0])}`).join('')}`;
  if (curve !== 'smooth' || pts.length < 3) return `M${pts.map(f).join('L')}`;
  const n = pts.length;
  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = dx[i] ? (pts[i + 1][1] - pts[i][1]) / dx[i] : 0;
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  t[n - 1] = m[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${f(pts[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${f([pts[i][0] + h, pts[i][1] + t[i] * h])} ${f([pts[i + 1][0] - h, pts[i + 1][1] - t[i + 1] * h])} ${f(pts[i + 1])}`;
  }
  return d;
}

/** Points get different shapes when patterns are on, so series differ by more than colour. */
function pointShape(x, y, kind, cls) {
  const [X, Y] = [round_(x), round_(y)];
  if (kind === 1) return `<rect class="${cls}" x="${X - 3}" y="${Y - 3}" width="6" height="6"/>`;
  if (kind === 2) return `<path class="${cls}" d="M${X} ${Y - 4}L${X + 4} ${Y + 3}H${X - 4}Z"/>`;
  if (kind === 3) return `<path class="${cls}" d="M${X} ${Y - 4}L${X + 4} ${Y}L${X} ${Y + 4}L${X - 4} ${Y}Z"/>`;
  return `<circle class="${cls}" cx="${X}" cy="${Y}" r="3"/>`;
}

function arcPath(cx, cy, r0, r1, a0, a1) {
  // A whole circle is drawn as two halves, because one arc cannot start and end at the same point.
  if (a1 - a0 >= Math.PI * 2 - 1e-6) return arcPath(cx, cy, r0, r1, a0, a0 + Math.PI) + arcPath(cx, cy, r0, r1, a0 + Math.PI, a1 - 1e-6);
  const p = (a, r) => `${round_(cx + r * Math.sin(a))} ${round_(cy - r * Math.cos(a))}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  if (r0 <= 0) return `M${cx} ${cy}L${p(a0, r1)}A${r1} ${r1} 0 ${large} 1 ${p(a1, r1)}Z`;
  return `M${p(a0, r1)}A${r1} ${r1} 0 ${large} 1 ${p(a1, r1)}L${p(a1, r0)}A${r0} ${r0} 0 ${large} 0 ${p(a0, r0)}Z`;
}

// ---------- plugin ----------
const plugin = {
  name: 'chart',
  api: chart,
  init(root) {
    for (const el of $$('[data-xz-chart]', root)) if (!el.xzChart) chart(el);
  },
};

export default plugin;
export { plugin as charts };

// In the browser build, register with the kit, or wait for it if this file loaded first.
if (typeof window !== 'undefined') {
  if (window.Xsenze && typeof window.Xsenze.use === 'function') window.Xsenze.use(plugin);
  else (window.XsenzePlugins = window.XsenzePlugins || []).push(plugin);
}
