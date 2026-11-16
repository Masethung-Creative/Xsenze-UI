# Xsenze UI Kit

Design tokens, CSS components and small behaviours for Xsenze products. It works in plain HTML, PHP and any framework, and has no run-time dependencies.

- Black and white on pure grey neutrals, with one orange (`#ff6300`) for highlights and the logo; 4px corners, 1px borders
- Satoshi for headings, buttons and numbers; Space Grotesk for body text; JetBrains Mono for code
- Satoshi is licensed under the ITF Free Font License, which does not allow passing the font files on to others. So the font file is not in the npm package: its `@font-face` is in `dist/xsenze-satoshi.css`, and each project puts its own copy of `Satoshi-Variable.woff2` in `fonts/`. Without it, headings use Space Grotesk. This repository leaves the font out too: to build with it, download Satoshi from Fontshare and unzip it to `src/fonts/Satoshi_Complete`
- Light and dark themes
- WCAG 2.2 AA contrast, tested by a script on every build
- Indian formats: ₹, lakh and crore grouping, day-first dates

Version 0.5.0 covers Phase 1 (foundation and core) and the first two parts of Phase 2: new foundations, advanced form controls, the Create page and 13 new components. See [ROADMAP.md](ROADMAP.md) for what comes next.

## Quick start

```bash
npm install
npm run build
```

Copy the `dist/` folder into your project and link two files:

```html
<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/assets/xsenze/xsenze.min.css">
  <script src="/assets/xsenze/xsenze.min.js" defer></script>
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

Keep `dist/` together. The stylesheet loads its fonts from the `fonts/` folder beside it.

## Documentation

```bash
npm run dev
```

Then open <http://localhost:4173/docs/>. The docs cover installation, foundations, every component with copyable markup, guidelines and the page templates.

## What is included

| Area | Contents |
| --- | --- |
| Foundations | Colour (brand, neutrals, status, surfaces, text, borders, states), typography, spacing, grid, breakpoints, containers, radius, border widths, elevation, layers, opacity, 102 icons, logo rules |
| Components | Buttons, inputs, textarea, checkbox, radio, toggle, select, searchable combobox, labels and messages, badges, tags, chips, avatars, links, dividers, tooltips, spinners, progress bars, skeletons |
| Composites | Cards, stat cards, tabs, accordion, breadcrumbs, pagination, alerts, banners, lists, empty states |
| Navigation and overlays | Navbar, sidebar, footer, app shell, modal, drawer, toast, dropdown menu |
| Data | Table with sorting, search, pagination and row actions |
| Templates | Login, signup, forgot password, dashboard, 404, 500 |
| Helpers | Form validation with plain-language messages, Indian number, currency and date formats, theme switch |

## Output files

| File | Use |
| --- | --- |
| `dist/xsenze.min.css` | Fonts, tokens and all components |
| `dist/xsenze.min.js` | Behaviours and icons, global `Xsenze` |
| `dist/xsenze.esm.js` | ES module build |
| `dist/tokens/tokens.css` | CSS variables only |
| `dist/tokens/tokens.json` | Flat values for each theme |
| `dist/tokens/tokens.dtcg.json` | Design Tokens format, for Figma variables |
| `dist/icons/` | SVG files and `sprite.svg` |
| `dist/fonts/`, `dist/brand/` | Self-hosted fonts, logo and mark |

## Project layout

```
tokens/tokens.json   Source of truth for every value
src/css/             Component styles, one file per group
src/js/              Behaviours (index.js) and formats (format.js)
src/brand/           Logo files
scripts/build.mjs    Builds dist/
scripts/contrast.mjs Checks colour pairs against WCAG AA
docs/                Documentation site
templates/           Page templates
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Builds `dist/` and the data file the docs read |
| `npm run check` | Tests colour contrast in both themes. Fails if a pair is below AA. |
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
