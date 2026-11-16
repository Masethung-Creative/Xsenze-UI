// Flow: draws the lines between source, hub and targets, and lights a route when a target is pointed at
// or focused. data-xz-flow="auto" also walks through the routes on its own while nobody is pointing.
// Mark the exact element to connect with data-xz-flow-anchor (for example a card inside the source column).
import { $$, ready, fire, motionOn, onMotion, watch, perFrame } from '../shared.js';

const NS = 'http://www.w3.org/2000/svg';

export function initFlows(root) {
  for (const flow of $$('[data-xz-flow]', root)) {
    if (ready(flow, 'Flow')) continue;
    const source = flow.querySelector('.xz-flow__source');
    const hub = flow.querySelector('.xz-flow__hub');
    const targets = $$('[data-xz-flow-target]', flow);
    if (!source || !hub || !targets.length) continue;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'xz-flow__lines');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    flow.prepend(svg);
    const anchor = (part) => part.querySelector('[data-xz-flow-anchor]') || part;
    const wideQuery = matchMedia('(min-width: 1024px)');
    const auto = flow.getAttribute('data-xz-flow') === 'auto';
    let routes = [];
    let active = -1;
    let holding = false;
    let visible = true;
    let timer = 0;

    const path = (d, cls) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', cls);
      p.setAttribute('pathLength', '100');
      svg.append(p);
      return p;
    };
    const paint = () => {
      for (const p of svg.querySelectorAll('.xz-flow__line')) {
        p.classList.toggle('is-active', active >= 0 && (p.dataset.route === 'in' || Number(p.dataset.route) === active));
      }
      svg.querySelector('.xz-flow__pulse')?.remove();
      if (active >= 0 && routes[active]) path(routes[active].full, 'xz-flow__pulse');
      targets.forEach((t, i) => {
        t.classList.toggle('is-active', i === active);
        if (t.tagName === 'BUTTON') t.setAttribute('aria-pressed', String(i === active));
      });
    };
    const draw = () => {
      const box = flow.getBoundingClientRect();
      if (!box.width) return;
      const wide = wideQuery.matches;
      const rel = (el) => {
        const r = el.getBoundingClientRect();
        return { l: r.left - box.left, t: r.top - box.top, w: r.width, h: r.height };
      };
      const curve = (p, q) =>
        wide
          ? `C${(p.x + q.x) / 2},${p.y} ${(p.x + q.x) / 2},${q.y} ${q.x},${q.y}`
          : `C${p.x},${(p.y + q.y) / 2} ${q.x},${(p.y + q.y) / 2} ${q.x},${q.y}`;
      let start;
      let mid;
      let inEnd;
      let outStart;
      if (wide) {
        // Side by side: source edge to hub centre, hub centre to each target's near edge.
        const s = rel(anchor(source));
        const h = rel(anchor(hub));
        start = { x: s.l + s.w, y: s.t + s.h / 2 };
        mid = { x: h.l + h.w / 2, y: h.t + h.h / 2 };
        inEnd = mid;
        outStart = mid;
      } else {
        // Stacked: one straight run down the middle, between the three parts, never across their text.
        const s = rel(source);
        const h = rel(hub);
        const x = h.l + h.w / 2;
        start = { x, y: s.t + s.h };
        inEnd = { x, y: h.t };
        outStart = { x, y: h.t + h.h };
      }
      routes = targets.map((t) => {
        const r = wide ? rel(t) : rel(targets[0].closest('.xz-flow__targets') || t);
        const end = wide ? { x: r.l, y: r.t + r.h / 2 } : { x: outStart.x, y: r.t };
        const through = wide ? '' : ` M${outStart.x},${outStart.y}`;
        return { out: `M${outStart.x},${outStart.y} ${curve(outStart, end)}`, full: `M${start.x},${start.y} ${curve(start, inEnd)}${through} ${curve(outStart, end)}` };
      });
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      svg.replaceChildren();
      path(`M${start.x},${start.y} ${curve(start, inEnd)}`, 'xz-flow__line').dataset.route = 'in';
      routes.forEach((r, i) => (path(r.out, 'xz-flow__line').dataset.route = String(i)));
      paint();
    };
    const select = (i) => {
      if (i === active) return;
      active = i;
      paint();
      if (i >= 0) fire(flow, 'xz:route', { index: i, target: targets[i] });
    };
    const stop = () => {
      clearInterval(timer);
      timer = 0;
    };
    const start = () => {
      stop();
      if (auto && visible && !holding && motionOn()) timer = setInterval(() => select((active + 1) % targets.length), 2400);
    };
    targets.forEach((t, i) => {
      t.addEventListener('pointerenter', () => ((holding = true), stop(), select(i)));
      t.addEventListener('focus', () => ((holding = true), stop(), select(i)));
      t.addEventListener('pointerleave', () => {
        if (t.contains(document.activeElement)) return;
        holding = false;
        if (!auto) select(-1);
        start();
      });
      t.addEventListener('blur', () => {
        holding = false;
        if (!auto) select(-1);
        start();
      });
    });

    const redraw = perFrame(draw);
    if (typeof ResizeObserver === 'function') new ResizeObserver(redraw).observe(flow);
    addEventListener('resize', redraw);
    document.fonts?.ready.then(redraw);
    watch(flow, (v) => ((visible = v), start()));
    onMotion(start);
    draw();
    flow.xzFlow = { redraw: draw, select };
  }
}
