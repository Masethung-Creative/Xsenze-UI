// Documentation site chrome: header, footer, table of contents and code panels.
// Runs before the kit script, so the code panels show the markup exactly as written.
(() => {
  const page = document.body.dataset.page;
  const base = document.body.dataset.base || '';
  // site.generated.js (written by the build) carries the version and the public addresses.
  const site = window.XZ_SITE || { urls: {} };
  const version = site.version || (window.XZ_DOCS && window.XZ_DOCS.version) || '';
  const urls = site.urls || {};
  // Snippets can say __XZ_VERSION__, __XZ_CDN__, __XZ_NPM__ or __XZ_REPO__; the current values go in before the code is shown.
  const vars = { __XZ_VERSION__: version, __XZ_CDN__: urls.cdn || '', __XZ_NPM__: urls.npm || '', __XZ_REPO__: urls.repo || '' };
  const fill = (s) => s.replace(/__XZ_(VERSION|CDN|NPM|REPO)__/g, (m) => vars[m] ?? m);
  for (const el of document.querySelectorAll('textarea.doc-snippet')) el.value = fill(el.value);
  for (const el of document.querySelectorAll('pre.doc-snippet, [data-doc-var]')) if (el.textContent.includes('__XZ_')) el.textContent = fill(el.textContent);
  for (const el of document.querySelectorAll('[data-doc-copy]')) el.setAttribute('data-doc-copy', fill(el.getAttribute('data-doc-copy')));
  // Links and kit copy buttons can use the placeholders too.
  for (const el of document.querySelectorAll('a[href*="__XZ_"], [data-xz-copy*="__XZ_"]')) for (const name of ['href', 'data-xz-copy']) if (el.hasAttribute(name)) el.setAttribute(name, fill(el.getAttribute(name)));
  // The reference pages share one "Docs" link in the header and a side menu inside the pages.
  const docsPages = [
    ['parts', 'All parts', 'parts.html'],
    ['foundations', 'Foundations', 'foundations.html'],
    ['components', 'Components', 'components.html'],
    ['forms', 'Forms', 'forms.html'],
    ['tools', 'Tools', 'tools.html'],
    ['patterns', 'Guidelines', 'patterns.html'],
  ];
  const inDocs = docsPages.some(([key]) => key === page);
  const nav = [
    ['get-started', 'Get started', 'getting-started.html'],
    ['docs', 'Docs', 'foundations.html', docsPages],
    ['blocks', 'Blocks', 'blocks.html'],
    ['templates', 'Templates', 'templates.html'],
    ['create', 'Create', 'create.html'],
  ];
  // This page's sections (h2) and their sub-headings (h3), for the side menu and the phone menu.
  // Sub-headings without an id get one from the section and their text.
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sections = [...document.querySelectorAll('.doc-section[id]')].map((el) => ({
    el,
    id: el.id,
    // A family label just before a section starts a group, shown in the side menu too.
    family: el.previousElementSibling?.matches('.doc-family-label') ? el.previousElementSibling.textContent.trim() : '',
    title: (el.querySelector('h2')?.textContent || el.id).trim(),
    subs: [...el.querySelectorAll(':scope > h3')].map((h) => {
      if (!h.id) {
        let id = `${el.id}--${slug(h.textContent)}`;
        for (let n = 2; document.getElementById(id); n++) id = `${el.id}--${slug(h.textContent)}-${n}`;
        h.id = id;
      }
      return { el: h, id: h.id, title: h.textContent.trim() };
    }),
  }));

  const current = (key) => key === page || (key === 'docs' && inDocs);
  const link = ([key, label, href]) => `<li><a class="xz-navbar__link" href="${base}${href}"${current(key) ? ' aria-current="page"' : ''}>${label}</a></li>`;
  // In the phone menu the current page also lists its sections.
  const drawerSections = () => sections.length ? `<ul class="xz-sidebar__nav doc-drawer__sections">${sections.map((s) => `<li><a class="xz-sidebar__link" href="#${s.id}">${s.title}</a></li>`).join('')}</ul>` : '';
  const sideLink = ([key, label, href]) => `<li><a class="xz-sidebar__link" href="${base}${href}"${key === page ? ' aria-current="page"' : ''}>${label}</a>${key === page ? drawerSections() : ''}</li>`;
  // Phone menu: the same order, with the Docs pages listed under their own heading.
  const drawerNav = nav
    .map(([key, label, href, children]) => children
      ? `<li><div class="xz-sidebar__heading">${label}</div><ul class="xz-sidebar__nav">${children.map(sideLink).join('')}</ul></li>`
      : sideLink([key, label, href]))
    .join('');

  const header = document.querySelector('[data-doc-header]');
  // Pages with parts that move by themselves get the kit's motion button, so anyone can pause them.
  const moving = document.querySelector('[data-xz-rotator], .xz-marquee, .xz-dotfield, [data-xz-sequence]');
  const motionBtn = moving ? '<button class="xz-btn xz-btn--ghost xz-btn--icon" type="button" data-xz-motion-toggle aria-label="Pause animations" data-xz-tooltip="Pause animations" data-xz-tooltip-place="bottom"><i data-xz-icon="pause"></i></button>' : '';
  if (header) {
    header.className = 'xz-navbar';
    header.innerHTML = `
      <a class="xz-logo" href="${base}index.html">Xsenze UI Kit</a>
      <span class="xz-badge xz-hide-mobile">v${version}</span>
      <nav aria-label="Main"><ul class="xz-navbar__nav">${nav.map(link).join('')}</ul></nav>
      <span class="xz-navbar__spacer"></span>
      <div class="xz-navbar__actions">
        <button class="xz-btn doc-search-btn" type="button" data-doc-search aria-label="Search the docs" aria-keyshortcuts="Control+K Meta+K"><i data-xz-icon="search" data-size="sm"></i><span class="xz-hide-mobile">Search</span><kbd class="xz-kbd xz-hide-mobile" data-doc-search-key>Ctrl K</kbd></button>
        ${motionBtn}
        <button class="xz-btn xz-btn--ghost xz-btn--icon" type="button" data-xz-theme-toggle aria-label="Switch between light and dark theme" data-xz-tooltip="Switch theme" data-xz-tooltip-place="bottom"><i data-xz-icon="sun"></i></button>
        <button class="xz-btn xz-btn--ghost xz-btn--icon xz-hide-desktop" type="button" data-xz-open="#doc-nav" aria-label="Open menu"><i data-xz-icon="menu"></i></button>
      </div>`;
    document.body.insertAdjacentHTML(
      'beforeend',
      `<dialog class="xz-drawer xz-drawer--left xz-drawer--nav" id="doc-nav" aria-label="Menu">
        <div class="xz-sidebar">
          <div class="xz-sidebar__header xz-row xz-row--between"><span class="xz-logo">Xsenze</span>
          <button class="xz-btn xz-btn--ghost xz-btn--icon" type="button" data-xz-close aria-label="Close menu"><i data-xz-icon="x"></i></button></div>
          <ul class="xz-sidebar__nav xz-sidebar__section">${drawerNav}</ul>
        </div>
      </dialog>`,
    );
    // A section link in the phone menu closes the menu, so the page shows where it went.
    const drawer = document.getElementById('doc-nav');
    drawer.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) drawer.close(); });
  }

  const footer = document.querySelector('[data-doc-footer]');
  if (footer) {
    footer.className = 'xz-footer xz-footer--simple';
    footer.innerHTML = `<div class="xz-footer__bottom"><span>Xsenze UI Kit v${version}. MIT licence.</span><span>Built in India. Formats: ₹, lakh and crore, DD/MM/YYYY.</span></div>`;
  }

  // ---- examples: keep the written markup as a code panel ----
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const dedent = (s) => {
    const lines = s.replace(/^\s*\n|\s+$/g, '').split('\n');
    const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
    return lines.map((l) => l.slice(indent)).join('\n');
  };
  const highlight = (html) =>
    // One pass, so the spans added for one kind of token are never matched as another.
    escape(html).replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([\w-]+)|([\w:-]+)=("[^"]*")/g, (m, comment, lt, tag, attr, value) =>
      comment ? `<span class="c">${comment}</span>` : tag ? `${lt}<span class="t">${tag}</span>` : `<span class="a">${attr}</span>=<span class="s">${value}</span>`,
    );

  function codeBlock(source, { plain } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'doc-code';
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.innerHTML = plain ? escape(source) : highlight(source);
    pre.tabIndex = 0;
    pre.append(code);
    const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'doc-code__copy', textContent: 'Copy' });
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(source);
        btn.textContent = 'Copied';
      } catch {
        btn.textContent = 'Press Ctrl+C';
        getSelection().selectAllChildren(code);
      }
      setTimeout(() => (btn.textContent = 'Copy'), 1600);
    });
    wrap.append(pre, btn);
    return wrap;
  }

  // Every preview has its own light and dark switch. Wide parts, whose layout changes with the screen,
  // also get desktop, tablet and phone: tablet and phone draw the example in a frame of that width,
  // so the kit's own small-screen layouts show. data-widths="on" or "off" overrides the guess.
  const WIDE = '.xz-table-wrap, .xz-table, .xz-panel, .xz-split, .xz-duallist, .xz-calendar-view, .xz-chat, .xz-quiz, .xz-tabs, .xz-wizard, .xz-navbar, .xz-sidebar, .xz-hero, .xz-band, .xz-feature, .xz-footer, .xz-codeblock, .xz-readings, .xz-shades, .xz-colorpicker, .xz-contrast, .xz-beforeafter, .xz-pagestrip, .xz-carousel, .xz-player, .xz-editor, .xz-dropzone, .xz-chart, .xz-menubar, .xz-stage, .xz-card, .xz-pricing, .xz-profile, .xz-notifications, .xz-bottom-nav, .xz-megamenu, .xz-flow, .xz-ledger, .xz-compare, .xz-window, .xz-tiles, .xz-facts, .xz-grid, .xz-auth, .xz-gallery';
  const WIDTHS = { desktop: ['Desktop', 'monitor', 0], tablet: ['Tablet', 'tablet', 768], phone: ['Phone', 'smartphone', 390] };
  const kitFiles = {
    css: ['../dist/xsenze.css', '../dist/xsenze-tools.css'],
    js: ['../dist/xsenze.js', '../dist/xsenze-charts.js', '../dist/xsenze-apps.js', '../dist/xsenze-tools.js'],
  };
  const pageTheme = () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const frameDoc = (html, theme, layout) => `<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><base href="${location.href.split('#')[0]}">${kitFiles.css.map((h) => `<link rel="stylesheet" href="${h}">`).join('')}${kitFiles.js.map((s) => `<script src="${s}" defer><\/script>`).join('')}<style>body { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 16px; margin: 0; padding: 24px 16px; background: var(--xz-surface); color: var(--xz-text); } body.stack { flex-direction: column; } body.stack > * { width: 100%; } body.block { display: block; } body.block > * { margin-inline: auto; }</style></head><body class="${layout}">${html}<script>document.addEventListener('click', (e) => { if (e.target.closest('a[href]')) e.preventDefault(); }); new ResizeObserver(() => parent.postMessage({ xzExampleHeight: Math.ceil(document.documentElement.getBoundingClientRect().height) }, '*')).observe(document.documentElement);<\/script></body></html>`;
  const radioSet = (name, label, items, checked) =>
    `<div class="xz-segmented doc-example__set" role="radiogroup" aria-label="${label}">${items.map(([value, text, icon]) => `<label data-xz-tooltip="${text}"><input type="radio" name="${name}" value="${value}"${value === checked ? ' checked' : ''} aria-label="${text}"><span><i data-xz-icon="${icon}" data-size="sm"></i></span></label>`).join('')}</div>`;
  const frames = [];
  let exampleId = 0;
  for (const ex of document.querySelectorAll('.doc-example')) {
    const id = `doc-ex-${++exampleId}`;
    const source = dedent(ex.innerHTML);
    const preview = document.createElement('div');
    preview.className = 'doc-example__preview';
    preview.append(...ex.childNodes);
    ex.append(preview);
    const wide = ex.dataset.widths === 'on' || (ex.dataset.widths !== 'off' && Boolean(preview.querySelector(WIDE)));
    ex.dataset.kind = wide ? 'wide' : preview.querySelector('.xz-field, .xz-input, .xz-select, .xz-textarea, .xz-colorfield, .xz-input-group') ? 'field' : 'small';
    const foot = Object.assign(document.createElement('div'), { className: 'doc-example__foot' });
    const bar = Object.assign(document.createElement('div'), { className: 'doc-example__bar' });
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Preview settings');
    bar.innerHTML =
      (wide ? radioSet(`${id}-width`, 'Screen width', Object.entries(WIDTHS).map(([k, [t, i]]) => [k, t, i]), 'desktop') : '') +
      radioSet(`${id}-theme`, 'Theme of this preview', [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon']], pageTheme());
    foot.append(bar);
    if (ex.dataset.code !== 'off') {
      const details = document.createElement('details');
      details.className = 'doc-example__code';
      details.append(document.createElement('summary'), codeBlock(source));
      if (ex.dataset.code === 'open') details.open = true;
      foot.append(details);
    } else foot.classList.add('doc-example__foot--bare');
    ex.append(foot);

    let frameBox = null;
    let frame = null;
    let width = 'desktop';
    const theme = () => preview.getAttribute('data-theme') || pageTheme();
    const fitFrame = (height) => {
      if (!frameBox) return;
      const w = WIDTHS[width][2];
      const room = frameBox.clientWidth - 32;
      const scale = Math.min(1, room / w);
      if (height) frame.dataset.height = height;
      const h = Number(frame.dataset.height || 400);
      frame.style.width = `${w}px`;
      frame.style.height = `${h}px`;
      frame.style.transform = scale < 1 ? `scale(${scale})` : '';
      frame.parentElement.style.width = `${Math.round(w * scale)}px`;
      frame.parentElement.style.height = `${Math.round(h * scale)}px`;
    };
    ex.addEventListener('change', (e) => {
      const t = e.target;
      if (t.name === `${id}-theme`) {
        preview.setAttribute('data-theme', t.value);
        frameBox?.setAttribute('data-theme', t.value);
        try {
          if (frame) frame.contentDocument.documentElement.dataset.theme = t.value;
        } catch {}
      } else if (t.name === `${id}-width`) {
        width = t.value;
        ex.dataset.width = width;
        if (width === 'desktop') {
          preview.hidden = false;
          if (frameBox) frameBox.hidden = true;
          return;
        }
        if (!frameBox) {
          frameBox = Object.assign(document.createElement('div'), { className: 'doc-example__frame' });
          frameBox.innerHTML = `<div class="doc-example__screen"><iframe title="Preview at a smaller screen width" loading="lazy"></iframe></div>`;
          if (preview.hasAttribute('data-theme')) frameBox.setAttribute('data-theme', preview.getAttribute('data-theme'));
          preview.after(frameBox);
          frame = frameBox.querySelector('iframe');
          frame.srcdoc = frameDoc(source, theme(), ex.dataset.layout || 'row');
          // The kit in the frame restores the saved site theme on load, so the preview's choice goes on after it.
          frame.addEventListener('load', () => {
            try {
              frame.contentDocument.documentElement.dataset.theme = theme();
            } catch {}
          });
          frames.push({ frame, fit: fitFrame });
        }
        preview.hidden = true;
        frameBox.hidden = false;
        fitFrame();
      }
    });
    // Without a choice of its own, a preview follows the page's theme switch.
    new MutationObserver(() => {
      if (preview.hasAttribute('data-theme')) return;
      const radio = bar.querySelector(`input[name="${id}-theme"][value="${pageTheme()}"]`);
      if (radio) radio.checked = true;
      try {
        if (frame) frame.contentDocument.documentElement.dataset.theme = pageTheme();
      } catch {}
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  addEventListener('message', (e) => {
    const f = frames.find((x) => x.frame.contentWindow === e.source);
    if (f && typeof e.data?.xzExampleHeight === 'number') f.fit(Math.max(80, e.data.xzExampleHeight));
  });
  addEventListener('resize', () => frames.forEach((f) => f.fit()));
  // Motion demos: a box marked data-motion="class" plays that entrance again when selected.
  document.addEventListener('click', (e) => {
    const box = e.target.closest('[data-motion]');
    if (!box) return;
    box.classList.remove(box.dataset.motion);
    void box.offsetWidth; // restart the animation
    box.classList.add(box.dataset.motion);
  });

  // <pre class="doc-snippet"> or <textarea class="doc-snippet" data-lang="html"> -> code block with a copy button
  for (const pre of document.querySelectorAll('.doc-snippet')) {
    // Write HTML samples in a <textarea hidden> so the browser does not parse them.
    pre.replaceWith(codeBlock(dedent(pre.value ?? pre.textContent), { plain: pre.dataset.lang !== 'html' }));
  }
  for (const btn of document.querySelectorAll('[data-doc-copy]')) {
    btn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(btn.dataset.docCopy).catch(() => {});
      const old = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => (btn.textContent = old), 1600);
    });
  }

  // ---- side menu: a tree ----
  // Docs pages: the page names, the current one opened to its sections. Other pages: their sections.
  // Only the section you are reading opens to its sub-headings, so the menu stays short.
  const toc = document.querySelector('[data-doc-toc]');
  if (toc && (inDocs || sections.length)) {
    const tree = sections.length
      ? `<ul class="doc-tree__list">${sections.map((s) => `${s.family ? `<li class="doc-tree__family">${s.family}</li>` : ''}<li class="doc-tree__item" data-id="${s.id}"><a class="doc-tree__link" href="#${s.id}">${s.title}</a>${s.subs.length
        ? `<ul class="doc-tree__list doc-tree__list--sub" hidden>${s.subs.map((h) => `<li class="doc-tree__item"><a class="doc-tree__link" href="#${h.id}">${h.title}</a></li>`).join('')}</ul>`
        : ''}</li>`).join('')}</ul>`
      : '';
    const label = inDocs ? 'Docs' : 'On this page';
    toc.innerHTML = `<nav aria-label="${label}"><div class="doc-toc__title">${label}</div>${inDocs
      ? `<ul class="doc-tree">${docsPages.map(([key, name, href]) => `<li><a class="doc-tree__group" href="${base}${href}"${key === page ? ' aria-current="page"' : ''}>${name}</a>${key === page ? tree : ''}</li>`).join('')}</ul>`
      : tree}</nav>`;
  }

  if (toc && sections.length) {
    const items = new Map([...toc.querySelectorAll('[data-id]')].map((li) => [li.dataset.id, li]));
    const links = [...toc.querySelectorAll('.doc-tree__link')];
    // The reading line sits a quarter of the way down the screen; the last heading above it is the current one.
    const passed = (el) => el.getBoundingClientRect().top <= innerHeight * 0.25;
    const pick = (list) => {
      let hit = list[0];
      for (const x of list) {
        if (passed(x.el)) hit = x;
        else break;
      }
      return hit;
    };
    // The side menu scrolls on its own: keep the current item in view, unless the pointer is on the menu.
    const follow = (a) => {
      if (toc.matches(':hover')) return;
      const box = toc.getBoundingClientRect();
      const r = a.getBoundingClientRect();
      if (r.top < box.top + 48 || r.bottom > box.bottom - 48) toc.scrollTop += r.top - box.top - box.height / 3;
    };
    let shown = '';
    const update = () => {
      if (!toc.offsetWidth) return; // hidden on narrow screens
      const atEnd = scrollY >= document.documentElement.scrollHeight - innerHeight - 2;
      const s = atEnd ? sections[sections.length - 1] : pick(sections);
      const sub = s.subs.length && passed(s.subs[0].el) ? pick(s.subs) : null;
      const key = `${s.id}|${sub ? sub.id : ''}`;
      if (key === shown) return;
      shown = key;
      for (const [id, li] of items) {
        const list = li.querySelector(':scope > ul');
        if (list) list.hidden = id !== s.id;
      }
      links.forEach((a) => { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
      const main = items.get(s.id).firstElementChild;
      const deep = sub ? items.get(s.id).querySelector(`a[href="#${CSS.escape(sub.id)}"]`) : main;
      main.classList.add('is-active');
      deep.classList.add('is-active');
      deep.setAttribute('aria-current', 'location');
      follow(deep);
    };
    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; update(); });
    };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    update();
  }

  // ---- search: Ctrl+K (⌘K on Apple devices) or the Search button ----
  // The index is a separate file, loaded the first time search opens (or when the pointer reaches the button).
  const apple = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
  for (const k of document.querySelectorAll('[data-doc-search-key]')) k.textContent = apple ? '⌘K' : 'Ctrl K';
  let index = null;
  const loadIndex = () =>
    (index ||= new Promise((resolve, reject) => {
      if (window.XZ_SEARCH) return resolve(window.XZ_SEARCH);
      const s = Object.assign(document.createElement('script'), { src: `${base}search.generated.js?v=${encodeURIComponent(version)}` });
      s.onload = () => resolve(window.XZ_SEARCH || []);
      s.onerror = () => {
        index = null;
        reject(new Error('The search index did not load.'));
      };
      document.head.append(s);
    }));
  const openSearch = async () => {
    if (!window.Xsenze?.command) return;
    let items;
    try {
      items = await loadIndex();
    } catch {
      return;
    }
    window.Xsenze.command.open({ items: items.map((it) => ({ ...it, href: it.href ? base + it.href : '' })), placeholder: 'Search components, sections, tokens and icons', recent: 'docs' });
  };
  const searchBtn = document.querySelector('[data-doc-search]');
  searchBtn?.addEventListener('click', openSearch);
  searchBtn?.addEventListener('pointerenter', () => loadIndex().catch(() => {}), { once: true });
  document.addEventListener('keydown', (e) => {
    if (!e.key || e.key.toLowerCase() !== 'k' || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.isComposing) return;
    e.preventDefault();
    if (document.querySelector('dialog.xz-command-palette[open]')) return window.Xsenze?.command.close();
    openSearch();
  });

  // For pages that build code panels later, such as the section templates read from a template file.
  window.XZ_DOC = { codeBlock, dedent, url: (key) => urls[key] || '' };
})();
