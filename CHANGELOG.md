# Changelog

This project follows semantic versioning.

## Unreleased

- The docs are published at <https://xsenze-ui.vercel.app/docs/>. `vercel.json` and `npm run site` publish a `site` folder with the docs, the kit files and the templates, without the Satoshi font file

## 0.6.0 (17 Nov 2026)

High-priority work: install links, search, live previews, charts, a stronger data table and long-text styles, plus the blocks for landing pages.

- Install from a CDN: each version tag is served by jsDelivr straight from the GitHub repository, and `npm install github:Masethung-Creative/Xsenze-UI#v0.6.0` works without the npm registry. Getting started has guides for plain HTML, PHP, Laravel, WordPress, React and Next.js, and Vue. The docs are ready for GitHub Pages
- Command palette (`dialog[data-xz-command]`, `Xsenze.command`): finds pages and runs actions as people type, ranks the best matches first ("new inv" finds "New invoice"), remembers recent picks, can ask your server, and opens with Ctrl+K (⌘K on Apple devices). Event `xz:command`
- Docs search: Ctrl+K or the Search button finds any page, section, component, token and icon
- Data table: row selection with Shift ranges and "select all results", a bulk bar (`data-xz-bulk`, `xz:bulk`), filters by column (`data-xz-filter`) that combine with search, a Columns menu remembered on each device, detail rows (`tr.xz-table__detail`), CSV export with ₹ and Indian names intact, a sticky header that stays in view (`xz-table-wrap--scroll`) and a sticky first column. `table.xzTable` adds `refresh()` and `replace()` for rows added later. Selected rows are now clearly marked in the light theme
- Charts in an optional file, `xsenze-charts.min.js`: bar (grouped, stacked, horizontal), line, area, donut and pie, drawn from a table that stays for screen readers. Indian number formats on axes and tooltips, a legend that hides series, keyboard reading with the arrow keys, patterns for colour-blind readers, and a one-time entrance that respects reduced motion. `Xsenze.chart(el, options)`. In the main file: a sparkline (`data-xz-sparkline`) and a progress ring (`xz-ring`)
- Long text: `xz-prose` styles headings, lists, quotes, code, tables and images in articles and in rich text editor output. The editor gains quote and code block buttons, and `Xsenze.sanitize` now keeps `blockquote`, `pre` and `code`. If your server cleans editor HTML with its own list of tags, add these three
- Live previews on the Blocks and Templates pages have a toolbar: Preview or Code, desktop, tablet or phone width, reload, open in a new tab and copy
- `Xsenze.use(plugin)` lets optional files add themselves to the kit
- Search suggestions rank the best matches first within each group
- Fixed: a table's own `data-xz-search` no longer starts a suggestion box; table search ignores the text of row menus; number sorting reads "−", ₹, commas and L/Cr; running `Xsenze.init()` twice no longer turns formatted values into "₹NaN"; focus rings show on toasts; warning, danger and info progress bars have enough contrast against the track
- 9 more icons
- Blocks for landing pages, in `src/blocks/` and inside the same two files: hero, band, eyebrow, feature row, window, tiles, checklist, command with copy button, marquee, facts, flow diagram, compare, ledger, footer brand and wordmark, overlay navbar that follows the band beneath it, scroll progress and expanding tabs. Motion: reveal, rolling words, typewriter, scripted demos, border beam, dot field, layered stack, depth scroll and an opening band. Everything stops for reduced motion and with the new motion button (`data-xz-motion-toggle`, `Xsenze.motion`), and reads fully without the script. New Blocks page in the docs and a landing page template
- New token `--xz-duration-reveal` (640ms) for text and sections rising into place. New `Xsenze.copy(text)`
- Docs site: the header has five links (Get started, Docs, Blocks, Templates, Create). Foundations, Components, Forms and Guidelines sit under Docs, with a side menu on those pages to move between them. The side menu is a tree: the current page opens to its sections, the section you are reading opens to its sub-headings, and the menu keeps it in view as you scroll
- Footer: sets its own text colour, so a footer with its own `data-theme` reads correctly on any page
- Create page: every option is now a row of picture tiles (grey stripes, colour dots, "Aa" in each font, corner shapes, icon weights), picked with one click or the arrow keys. Lock a setting so Shuffle keeps it, and undo or redo any change (Ctrl+Z, Ctrl+Y). Get code stays on screen on laptops, and on phones the options open from a bar at the bottom so the preview stays visible. The exported theme is unchanged
- Satoshi's `@font-face` moves from `xsenze.css` to a new `xsenze-satoshi.css`, and the npm package no longer includes the Satoshi font file, because its licence does not allow passing it on. Add `xsenze-satoshi.css` after the main stylesheet and put your own `Satoshi-Variable.woff2` in `fonts/`. Without them, headings fall back to Space Grotesk
- Removed the unused DIN font files from `dist/fonts/`. The package is now about 280 KB instead of 5.9 MB

## 0.5.0 (16 Nov 2026)

Phase 2, second part: components.

- Media, profile and pricing cards, with a monthly and yearly price switch (`data-xz-pricing`)
- Segmented control (`xz-segmented`), built from radio buttons
- Popover (`data-xz-popover`) and a notification centre with unread count (`data-xz-notifications`)
- Context menu on right click, long press or Shift+F10 (`data-xz-context-menu`)
- Search with grouped suggestions, recent searches and optional server results (`data-xz-search`)
- Mega menu for the navbar (`data-xz-megamenu`)
- Bottom sheet that closes with a downward drag (`dialog.xz-sheet`, `Xsenze.sheet`)
- Bottom navigation for phones (`xz-bottom-nav`)
- Wizard that checks each step before moving on (`data-xz-wizard`)
- Carousel with arrows and dots (`data-xz-carousel`), gallery and lightbox (`data-xz-lightbox`)
- Video and audio player with kit controls, captions, speed, full screen and resume (`data-xz-player`)
- New `xz-badge--highlight` (orange)
- 10 more icons
- The docs dev server now serves video, audio and captions, and supports seeking

## 0.4.0 (16 Nov 2026)

Phase 2, first part.

- Foundations: motion tokens and entrance classes, an eight-colour chart palette (`viz-1` to `viz-8`), gradients, blur (`xz-glass`), aspect ratio classes, and imagery guidelines
- Advanced form controls: date picker, date range, time picker, file upload with drag and drop, slider, number stepper, rating, one-time code, tag input and a rich text editor
- `Xsenze.sanitize(html)` cleans editor HTML in the browser
- New Forms page in the docs
- New landing page for the docs site, built from kit components, with a live theme demo and template previews
- 12 more icons

## 0.3.0 (16 Nov 2026)

Mono look.

- The main colour is now near-black in the light theme and near-white in the dark theme (`accent`, buttons, links, focus, ticked controls)
- Neutrals are pure greys with no tint
- The brand orange `#ff6300` moves to the second accent (`accent-2`) and the logo. The `sun` ramp is removed
- The checkbox tick now follows `on-accent`, so it stays readable on any main colour
- New Create page in the docs: pick greys, main colour, fonts, corners and icon weight, preview the result live, and export it as CSS or JSON. It replaces the foundation preview page
- The X mark is removed until the final logo is ready. The logo is the name as text, and `xz-logo__mark` is now a slot for a logo image
- `xz-btn--solid` now looks the same as `xz-btn--primary`; it is kept for existing pages
- Breaking: `--xz-sun-*` variables are removed

## 0.2.0 (16 Nov 2026)

New foundation. Same components and class names, new look.

- Satoshi is now the primary font (headings, buttons, labels, numbers). Space Grotesk is the secondary font (body text, form content). New tokens: `font-display`, `letter-spacing-label`
- The brand orange moves from `#ff3800` to `#ff6300`, with a new `brand` ramp
- Warm charcoal neutrals replace the stone greys
- New second accent: the `sun` ramp and the `accent-2` theme tokens
- Corners are 4px (`radius-control`, `radius-surface`); every component now follows these two tokens
- Toasts, the logo mark and the sign-in side panel now follow the theme tokens
- Breaking: `--xz-stone-*` variables are renamed to `--xz-neutral-*`

## 0.1.0 (15 Nov 2026)

First release. Phase 1: foundation and core.

- Design tokens with CSS variable and JSON exports
- Light and dark themes
- Core components, navigation, overlays and a sortable table
- Login, signup, forgot password, dashboard, 404 and 500 templates
- Form validation, Indian number, currency and date formats
- Contrast check for WCAG 2.2 AA
- Documentation site
