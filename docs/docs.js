// Documentation site chrome: header, footer, table of contents and code panels.
// Runs before the kit script, so the code panels show the markup exactly as written.
(() => {
  const page = document.body.dataset.page;
  const base = document.body.dataset.base || '';
  const version = (window.XZ_DOCS && window.XZ_DOCS.version) || '0.5.0';
  const nav = [
    ['get-started', 'Get started', 'getting-started.html'],
    ['foundations', 'Foundations', 'foundations.html'],
    ['components', 'Components', 'components.html'],
    ['forms', 'Forms', 'forms.html'],
    ['patterns', 'Guidelines', 'patterns.html'],
    ['templates', 'Templates', 'templates.html'],
    ['create', 'Create', 'create.html'],
  ];
  const link = ([key, label, href]) => `<li><a class="xz-navbar__link" href="${base}${href}"${key === page ? ' aria-current="page"' : ''}>${label}</a></li>`;

  const header = document.querySelector('[data-doc-header]');
  if (header) {
    header.className = 'xz-navbar';
    header.innerHTML = `
      <a class="xz-logo" href="${base}index.html">Xsenze UI Kit</a>
      <span class="xz-badge xz-hide-mobile">v${version}</span>
      <nav aria-label="Main"><ul class="xz-navbar__nav">${nav.map(link).join('')}</ul></nav>
      <span class="xz-navbar__spacer"></span>
      <div class="xz-navbar__actions">
        <button class="xz-btn xz-btn--ghost xz-btn--icon" type="button" data-xz-theme-toggle aria-label="Switch between light and dark theme" data-xz-tooltip="Switch theme" data-xz-tooltip-place="bottom"><i data-xz-icon="sun"></i></button>
        <button class="xz-btn xz-btn--ghost xz-btn--icon xz-hide-desktop" type="button" data-xz-open="#doc-nav" aria-label="Open menu"><i data-xz-icon="menu"></i></button>
      </div>`;
    document.body.insertAdjacentHTML(
      'beforeend',
      `<dialog class="xz-drawer xz-drawer--left xz-drawer--nav" id="doc-nav" aria-label="Menu">
        <div class="xz-sidebar">
          <div class="xz-sidebar__header xz-row xz-row--between"><span class="xz-logo">Xsenze</span>
          <button class="xz-btn xz-btn--ghost xz-btn--icon" type="button" data-xz-close aria-label="Close menu"><i data-xz-icon="x"></i></button></div>
          <ul class="xz-sidebar__nav xz-sidebar__section">${nav.map(([key, label, href]) => `<li><a class="xz-sidebar__link" href="${base}${href}"${key === page ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}</ul>
        </div>
      </dialog>`,
    );
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

  for (const ex of document.querySelectorAll('.doc-example')) {
    const source = dedent(ex.innerHTML);
    const preview = document.createElement('div');
    preview.className = 'doc-example__preview';
    preview.append(...ex.childNodes);
    ex.append(preview);
    if (ex.dataset.code === 'off') continue;
    const details = document.createElement('details');
    details.className = 'doc-example__code';
    details.append(document.createElement('summary'), codeBlock(source));
    if (ex.dataset.code === 'open') details.open = true;
    ex.append(details);
  }

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

  // ---- table of contents from the page's h2 headings ----
  const toc = document.querySelector('[data-doc-toc]');
  const sections = [...document.querySelectorAll('.doc-section[id]')];
  if (toc && sections.length) {
    toc.setAttribute('aria-label', 'On this page');
    toc.innerHTML = `<div class="doc-toc__title">On this page</div>` + sections.map((s) => `<a href="#${s.id}">${s.querySelector('h2').textContent}</a>`).join('');
    const links = [...toc.querySelectorAll('a')];
    const spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          links.forEach((a) => a.classList.toggle('is-active', a.hash === '#' + e.target.id));
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    sections.forEach((s) => spy.observe(s));
  }

})();
