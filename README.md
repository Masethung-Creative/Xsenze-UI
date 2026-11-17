# Xsenze UI Kit

Design tokens, CSS components and small behaviours for Xsenze products. It works in plain HTML, PHP and any framework, and has no run-time dependencies.

- Black and white on pure grey neutrals, with one orange (`#ff6300`) for highlights and the logo; 4px corners, 1px borders
- Plus Jakarta Sans for headings, buttons and numbers; Space Grotesk for body text; JetBrains Mono for code. All three are under the SIL Open Font License and ship with the kit
- Satoshi is optional: its licence (ITF Free Font License) does not allow passing the file on, so it is never in this repository or the npm package. A project with its own copy links `dist/xsenze-satoshi.css` after the main stylesheet and puts `Satoshi-Variable.woff2` in `fonts/`
- Light and dark themes
- WCAG 2.2 AA contrast, tested by a script on every build
- Indian formats: ₹, lakh and crore grouping, day-first dates

Version 0.6.1 covers Phase 1 (foundation and core), the first two parts of Phase 2 (new foundations, advanced form controls, the Create page and 13 components), landing page blocks, and the high-priority additions: a command palette, charts, a stronger data table, long-text styles, CDN links and docs search. See [CHANGELOG.md](CHANGELOG.md) for details and [ROADMAP.md](ROADMAP.md) for what comes next.

Documentation: <https://xsenze-ui.vercel.app/docs/>

## Quick start

Add two tags to any HTML or PHP page. They load the kit from jsDelivr, straight from this repository's release tag:

```html
<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Masethung-Creative/Xsenze-UI@v0.6.1/dist/xsenze.min.css">
  <script src="https://cdn.jsdelivr.net/gh/Masethung-Creative/Xsenze-UI@v0.6.1/dist/xsenze.min.js" defer></script>
</head>
<body>
  <main class="xz-container">
    <button class="xz-btn xz-btn--primary" type="button" data-xz-toast="It works.">
      <i data-xz-icon="check"></i> Try it
    </button>
  </main>
</body>
</html>
```

On pages with charts, add `xsenze-charts.min.js` from the same address after the main script.

With npm, install the release from GitHub; the import name stays `@sfj/ui-kit`:

```bash
npm install github:Masethung-Creative/Xsenze-UI#v0.6.1
```

To host the files yourself, run `npm install` and `npm run build`, then copy `dist/` into your project. Keep `dist/` together: the stylesheet loads its fonts from the `fonts/` folder beside it.

## Documentation

```bash
npm run dev
```

Then open <http://localhost:4173/docs/>. The docs cover installation, foundations, every component with copyable markup, guidelines and the page templates. Press Ctrl+K (⌘K on Apple devices) to search them.

## What is included

| Area | Contents |
| --- | --- |
| Foundations | Colour (brand, neutrals, status, surfaces, text, borders, states), typography and long-text styles, spacing, grid, breakpoints, containers, radius, border widths, elevation, layers, opacity, 135 icons, logo rules |
| Components | Buttons, inputs, textarea, checkbox, radio, toggle, select, searchable combobox, labels and messages, badges, tags, chips, avatars, links, dividers, tooltips, spinners, progress bars and rings, skeletons |
| Composites | Cards, stat cards, tabs, accordion, breadcrumbs, pagination, alerts, banners, lists, empty states |
| Navigation and overlays | Navbar, sidebar, footer, app shell, modal, drawer, toast, dropdown menu, command palette |
| Data | Table with sorting, search, filters, pages, row selection and bulk actions, a column menu, detail rows and CSV export; charts (bar, line, area, donut, pie) in an optional file; sparklines |
| Blocks | Hero, band, feature row, window, tiles, checklist, command with copy, marquee, facts, flow diagram, compare, ledger, footer wordmark, overlay navbar, scroll progress, expanding tabs, and motion: reveal, rolling words, typewriter, scripted demos, border beam, dot field, layered stack, depth scroll, opening band, and one button that pauses it all |
| Templates | Login, signup, forgot password, dashboard, 404, 500, landing page |
| Helpers | Form validation with plain-language messages, Indian number, currency and date formats, theme switch |

## Output files

| File | Use |
| --- | --- |
| `dist/xsenze.min.css` | Fonts, tokens and all components, including chart styles |
| `dist/xsenze.min.js` | Behaviours and icons, global `Xsenze` |
| `dist/xsenze.esm.js` | ES module build |
| `dist/xsenze-charts.min.js` | Charts, optional. `dist/xsenze-charts.esm.js` for bundlers (`import charts from '@sfj/ui-kit/charts'`) |
| `dist/xsenze-satoshi.css` | Optional: switches headings to Satoshi, for projects with their own copy of the font |
| `dist/tokens/tokens.css` | CSS variables only |
| `dist/tokens/tokens.json` | Flat values for each theme |
| `dist/tokens/tokens.dtcg.json` | Design Tokens format, for Figma variables |
| `dist/icons/` | SVG files and `sprite.svg` |
| `dist/fonts/`, `dist/brand/` | Self-hosted fonts, logo and mark |

## Project layout

```
tokens/tokens.json      Source of truth for every value
src/css/                Component styles, one file per group
src/js/                 Behaviours (index.js), formats (format.js), table, command palette, and charts/ (optional file)
src/blocks/             Blocks for landing pages, one folder per kind (navigation, hero, content, forms, data-display, footer, motion)
src/brand/              Logo files
scripts/build.mjs       Builds dist/ and the docs data
scripts/contrast.mjs    Checks colour pairs against WCAG AA
scripts/docs/           Docs site data (site.config.mjs lists the pages), search index and the docs checker
docs/                   Documentation site
templates/              Page templates
tests/                  Pages for checking behaviour in a browser
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Builds `dist/`, the docs data and the search index. Warns when a file passes its size limit |
| `npm run check` | Tests colour contrast in both themes. Fails if a pair is below AA. |
| `npm run check:docs` | Checks every docs link, id and code sample, and that the docs data is up to date |
| `npm run dev` | Serves the docs and templates on port 4173 |
## Changing tokens

1. Edit `tokens/tokens.json`.
2. Run `npm run build`.
3. Run `npm run check`.

To add an icon, add its name to `scripts/icons.list.mjs` and build.

## Conventions

- Classes start with `xz-` and follow block, `__element`, `--modifier`.
- CSS variables start with `--xz-`.
- Behaviour is set with `data-xz-*` attributes.
- State uses ARIA attributes (`aria-pressed`, `aria-selected`, `aria-current`, `aria-invalid`), not classes.

## Browser support

The last two versions of Chrome, Edge, Firefox and Safari. The kit needs the `dialog` element and the `:has()` selector: Chrome 105, Firefox 121, Safari 15.4 or later.

## Licence

MIT. Fonts are under the SIL Open Font License. Icons are from Lucide, under the ISC licence.
