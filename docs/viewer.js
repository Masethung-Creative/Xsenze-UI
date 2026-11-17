// Live previews with a toolbar: Preview or Code, desktop, tablet or phone width, reload, open in a new tab and copy.
//   <div class="doc-viewer" data-doc-viewer="fragment" data-template="../templates/landing.html" data-section="hero" data-title="Hero"></div>
//     One section of a template, cut out between its <!-- section:NAME --> comments. The frame is as tall as the section.
//   <div class="doc-viewer" data-doc-viewer="page" data-src="../templates/login.html" data-title="Login"></div>
//     A whole page at the height of the device, scrolling inside.
// Loaded after docs.js and before the kit, so the kit starts the toolbar's icons, tooltips and radios.
(() => {
  const viewers = [...document.querySelectorAll('[data-doc-viewer]')];
  if (!viewers.length) return;
  const DEVICES = {
    desktop: { label: 'Desktop', icon: 'monitor', w: 1280, h: 800 },
    tablet: { label: 'Tablet', icon: 'tablet', w: 768, h: 1024 },
    phone: { label: 'Phone', icon: 'smartphone', w: 390, h: 844 },
  };
  const root = document.documentElement;
  const sources = new Map();
  const getText = (url) => {
    if (!sources.has(url))
      sources.set(
        url,
        fetch(url).then((r) => {
          if (!r.ok) throw new Error(r.status);
          return r.text();
        }),
      );
    return sources.get(url);
  };
  const absolute = (url) => new URL(url, location.href).href;
  const dedent = (s) => (window.XZ_DOC ? window.XZ_DOC.dedent(s) : s);
  // Inside a section frame: links do nothing (it is a preview) and the frame reports its height.
  const inner = `<script>
document.addEventListener('click', (e) => { if (e.target.closest('a[href]')) e.preventDefault(); });
new ResizeObserver(() => parent.postMessage({ xzFrameHeight: Math.ceil(document.documentElement.getBoundingClientRect().height) }, '*')).observe(document.documentElement);
<\/script>`;
  const onPublicSite = () => location.protocol.startsWith('http') && !/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname);
  const all = [];
  let n = 0;

  for (const box of viewers) {
    const id = `viewer-${++n}`;
    const kind = box.getAttribute('data-doc-viewer') === 'page' ? 'page' : 'fragment';
    const title = box.getAttribute('data-title') || 'Preview';
    const template = box.getAttribute('data-template');
    const section = box.getAttribute('data-section');
    const src = box.getAttribute('data-src');
    const url = kind === 'page' ? src : template;
    const start = box.getAttribute('data-device') || 'desktop';
    const radios = (name, list, current) =>
      list
        .map(([value, label, icon]) => `<label${icon ? ` data-xz-tooltip="${label}"` : ''}><input type="radio" name="${name}" value="${value}"${value === current ? ' checked' : ''}${icon ? ` aria-label="${label}"` : ''}><span>${icon ? `<i data-xz-icon="${icon}" data-size="sm"></i>` : label}</span></label>`)
        .join('');
    box.classList.add('doc-viewer', `doc-viewer--${kind}`);
    box.innerHTML = `
      <div class="doc-viewer__bar" role="group" aria-label="${title} preview">
        <div class="xz-segmented" role="radiogroup" aria-label="Show">${radios(`${id}-view`, [['preview', 'Preview'], ['code', 'Code']], 'preview')}</div>
        <span class="doc-viewer__title">${title}</span>
        <div class="xz-segmented doc-viewer__devices" role="radiogroup" aria-label="Screen width">${radios(`${id}-device`, Object.entries(DEVICES).map(([k, d]) => [k, d.label, d.icon]), start)}</div>
        <button class="xz-btn xz-btn--ghost xz-btn--icon" type="button" data-act="reload" aria-label="Reload the preview" data-xz-tooltip="Reload"><i data-xz-icon="rotate-cw" data-size="sm"></i></button>
        <a class="xz-btn xz-btn--ghost xz-btn--icon" data-act="open" href="${url}" target="_blank" rel="noopener" aria-label="Open in a new tab" data-xz-tooltip="Open in a new tab"><i data-xz-icon="external-link" data-size="sm"></i></a>
        <button class="xz-btn xz-btn--ghost xz-btn--icon" type="button" data-act="copy" aria-label="Copy the code" data-xz-tooltip="Copy code"><i data-xz-icon="copy" data-size="sm"></i></button>
      </div>
      <div class="doc-viewer__stage"><div class="doc-viewer__screen"><iframe title="${title}, live preview" loading="lazy"></iframe></div></div>
      <div class="doc-viewer__code" hidden></div>
      <p class="doc-viewer__note" hidden>This preview needs the docs site running through <code class="xz-code">npm run dev</code>. You can also open the template file directly.</p>`;
    const stage = box.querySelector('.doc-viewer__stage');
    const screen = box.querySelector('.doc-viewer__screen');
    const frame = box.querySelector('iframe');
    const codeBox = box.querySelector('.doc-viewer__code');
    const note = box.querySelector('.doc-viewer__note');
    const v = { box, kind, frame, stage, screen, device: DEVICES[start] ? start : 'desktop', height: 0, grows: 0, loaded: false, source: '', html: '' };
    all.push(v);

    const fit = () => {
      const d = DEVICES[v.device];
      const cs = getComputedStyle(stage);
      const boxW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (!(boxW > 0)) return;
      const w = Math.min(d.w, v.device === 'phone' && boxW < d.w ? boxW : d.w);
      const fixedH = v.kind === 'page' || v.capped;
      const h = fixedH ? d.h : Math.max(v.height, 120);
      let scale = Math.min(1, boxW / w);
      if (v.kind === 'page') scale = Math.min(scale, (innerHeight * 0.8) / h);
      frame.style.width = `${w}px`;
      frame.style.height = `${h}px`;
      frame.style.transform = scale === 1 ? '' : `scale(${scale})`;
      screen.style.width = `${Math.round(w * scale)}px`;
      screen.style.height = `${Math.round(h * scale)}px`;
      box.dataset.device = v.device;
    };
    v.fit = fit;

    const page = (sectionHtml, head) =>
      `<!doctype html><html lang="en" data-theme="${root.dataset.theme || 'light'}"><head><base href="${absolute(template)}">${onPublicSite() ? head.replace(/<link[^>]+xsenze-satoshi\.css[^>]*>/g, '') : head}<style>body { min-height: ${section === 'navigation' ? '4.5rem' : '0'}; }</style></head><body>${sectionHtml}${inner}</body></html>`;
    const load = async () => {
      v.loaded = true;
      if (kind === 'page') {
        frame.src = src;
        return;
      }
      try {
        const html = await getText(template);
        const head = (/<head>([\s\S]*?)<\/head>/.exec(html) || [, ''])[1];
        const match = new RegExp(`<!-- section:${section} -->\\r?\\n([\\s\\S]*?)\\r?\\n<!-- /section:${section} -->`).exec(html);
        if (!match) throw new Error(`No section "${section}" in ${template}`);
        v.source = dedent(match[1]);
        v.html = page(match[1], head);
        frame.srcdoc = v.html;
      } catch {
        stage.hidden = true;
        note.hidden = false;
      }
    };
    v.load = load;
    frame.addEventListener('load', () => {
      // Whole pages follow the docs theme too.
      if (kind === 'page') {
        try {
          frame.contentDocument.documentElement.dataset.theme = root.dataset.theme;
        } catch {}
      }
    });

    box.addEventListener('change', (e) => {
      const t = e.target;
      if (t.name === `${id}-device`) {
        v.device = t.value;
        v.capped = false;
        v.grows = 0;
        fit();
      } else if (t.name === `${id}-view`) {
        const code = t.value === 'code';
        stage.hidden = code || !note.hidden;
        codeBox.hidden = !code;
        if (code && !codeBox.firstChild) showCode();
      }
    });
    const showCode = async () => {
      const text = kind === 'page' ? await getText(src).catch(() => '') : v.source || (await load(), v.source);
      if (window.XZ_DOC) codeBox.append(window.XZ_DOC.codeBlock(text || 'The code could not be loaded.'));
    };
    box.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'reload') {
        v.height = 0;
        v.grows = 0;
        v.capped = false;
        if (kind === 'page') frame.contentWindow?.location.reload();
        else if (v.html) frame.srcdoc = v.html;
        else load();
      } else if (act === 'copy') {
        const btn = e.target.closest('[data-act]');
        const text = kind === 'page' ? await getText(src).catch(() => '') : v.source;
        try {
          await navigator.clipboard.writeText(text);
          btn.setAttribute('data-xz-tooltip', 'Copied');
        } catch {
          btn.setAttribute('data-xz-tooltip', 'Copy did not work');
        }
        setTimeout(() => btn.setAttribute('data-xz-tooltip', 'Copy code'), 1600);
      }
    });
    fit();
  }

  // Section frames report their height. A section that keeps growing (sized to the screen height) is held at the device height and scrolls inside.
  addEventListener('message', (e) => {
    const v = all.find((x) => x.frame.contentWindow === e.source);
    if (!v || typeof e.data?.xzFrameHeight !== 'number') return;
    const h = Math.max(1, e.data.xzFrameHeight);
    if (h > v.height + 1) v.grows++;
    else v.grows = 0;
    v.height = h;
    if (v.grows > 5 || h > DEVICES[v.device].h * 6) v.capped = true;
    v.fit();
  });
  const resize = new ResizeObserver((entries) => entries.forEach((en) => all.find((v) => v.stage === en.target)?.fit()));
  // Frames load as they come near the screen.
  const near = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const v = all.find((x) => x.stage === en.target);
        if (v && !v.loaded) v.load();
        near.unobserve(en.target);
      }
    },
    { rootMargin: '800px 0px' },
  );
  for (const v of all) {
    resize.observe(v.stage);
    near.observe(v.stage);
  }
  // The previews follow the docs page's light or dark theme.
  new MutationObserver(() => {
    for (const v of all) {
      try {
        const d = v.frame.contentDocument?.documentElement;
        if (d) d.dataset.theme = root.dataset.theme;
      } catch {}
    }
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
})();
