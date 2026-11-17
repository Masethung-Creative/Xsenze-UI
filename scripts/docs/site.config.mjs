// The docs site, page by page. scripts/docs/build.mjs reads this and each page's HTML
// and writes docs/site.generated.js (on every page) and docs/search.generated.js (loaded by the search box).
export default {
  pages: [
    { file: 'index.html', label: 'Home', kind: 'page' },
    { file: 'getting-started.html', label: 'Get started', kind: 'guide' },
    { file: 'foundations.html', label: 'Foundations', kind: 'guide' },
    { file: 'components.html', label: 'Components', kind: 'components' },
    { file: 'forms.html', label: 'Forms', kind: 'components' },
    { file: 'patterns.html', label: 'Guidelines', kind: 'guide' },
    { file: 'blocks.html', label: 'Blocks', kind: 'components' },
    { file: 'templates.html', label: 'Templates', kind: 'guide' },
    { file: 'create.html', label: 'Create a theme', kind: 'page' },
  ],
  // Which Foundations section documents each token, by name.
  tokens: [
    [/^(viz)-/, 'foundations.html#data-colours'],
    [/^(font|line-height|letter-spacing)/, 'foundations.html#typography'],
    [/^(space|container|breakpoint|gutter|grid)/, 'foundations.html#spacing'],
    [/^(radius|border-width|shadow|z-|opacity|blur|aspect)/, 'foundations.html#shape'],
    [/^(duration|ease)/, 'foundations.html#motion'],
    [/^(icon)/, 'foundations.html#icons'],
    [/./, 'foundations.html#colour'],
  ],
};
