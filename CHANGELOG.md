# Changelog

This project follows semantic versioning.

## Unreleased

## 0.8.0 (17 Nov 2026)

A tools pack for settings pages, editors, print set-ups, colour and maths, and a docs page that lists every part with its integration steps.

- New optional pair of files, `xsenze-tools.min.css` and `xsenze-tools.min.js` (`@sfj/ui-kit/tools.css` and `@sfj/ui-kit/tools`). Load them after the main files, on the pages that use them. Every part draws on the kit's tokens, so themes change the tools too
- Panel (`xz-panel`): rows with hairlines between them, a title bar, group labels, cells side by side, stages, empty rows and action strips. With it: option cells (`xz-segmented--cells`), a fader (`xz-slider--fader`), a number field with a unit (`xz-numfield`, `--big`), status dots (`xz-status`), copyable value lines (`xz-valueline`) and a compact file field (`data-xz-filefield`). CSS only, apart from the file name
- Split view (`data-xz-split`): two panes with a handle to drag or move with the arrow keys; Enter folds the first pane away. Sizes are remembered by name, rows work too, and phones stack the panes. Event `xz:resize`; `element.xzSplit`
- Menu bar (`data-xz-menubar`): File, Edit and View menus with tick items, dot items, submenus and key labels (`data-xz-shortcut`), and the keys of the WAI-ARIA menu bar. Event `xz:action`
- Dual list (`data-xz-duallist`): pick items into a second list and order them, such as table columns. It starts as checkboxes, so forms work without the script. Event `xz:change`
- Readouts: digits drawn as lit segments (`data-xz-readout`), a countdown and stopwatch (`data-xz-timer`) that warns once and says when time is up, lamps for live states, readings with level bars, change bars and a styled `meter`
- Pixel loaders (`xz-loader`): nine cells in five patterns, still with less motion
- Measure lines (`xz-measure`), a paper size picker for A3, A4, A5, Letter, Legal and ID cards (`data-xz-paper`), a page strip built on radio buttons, and a preview stage
- Before and after (`data-xz-beforeafter`): two pictures with a line to drag or move with the keys
- Colour: a field that takes any CSS colour with an eyedropper (`data-xz-color`), swatches that copy, eleven shades worked out in OKLCH (`data-xz-shades`), a WCAG contrast check (`data-xz-contrast`) and a colour picker with RGB, HSL and OKLCH faders (`data-xz-colorpicker`). `Xsenze.tools.color` reads, converts and compares colours
- Maths: plain text such as `sqrt(x^2+1)/(2x)` shown as MathML (`data-xz-math`), a maths answer box with live notation (`data-xz-mathfield`) and a keypad in four tabs (`data-xz-mathpad`). `Xsenze.tools.math.toMathML()`
- Text: a code block with a copy button and line numbers, a text box with paste, clear, share and a live count, and letter tiles that keep Hindi and Tamil letters whole
- Rail sidebar (`xz-sidebar--rail`) and lit rows (`data-tone`)
- Templates: Settings, and Certificate maker (menu bar, split view, paper, colours with a contrast check, page strip and an export job)
- Docs: a Tools page. It starts with an inventory of every part a full tool kit needs and where each one lives in Xsenze (new, already in the kit, or left out and why), then the integration steps and the design tokens, then a live demo and a reference table for each part. The Guidelines keyboard table, Getting started and the home page list the tools
- Core: 11 icons (mic, video, radio, circle-dot, contrast, sigma, ruler, clipboard-paste, keyboard, rotate-ccw, award), and optional parts can call `Xsenze.init` on markup they build. The main script's size limit is now 47 KB gzipped (45.7 KB today); the tools files have limits of 10 KB and 20 KB

## 0.7.0 (17 Nov 2026)

A new docs home page built from the kit's own blocks, and six components for school, college and learning-platform screens.

- Docs home page: rebuilt from kit blocks. A hero with a live mini dashboard; numbers from the last build; five live demos (command palette, data table, charts, themes and Indian formats); tiles to every part of the docs; the dashboard template in the live preview; file sizes; questions; and a closing band. Docs pages with parts that move by themselves get the motion button in the header
- Calendar month view (`section[data-xz-calendar]`): events written as a list become a month grid with coloured chips and "+n more", the chosen day's events show under the grid, and phones get an agenda. Arrow keys, Home, End, Page Up and Page Down move through days and months. Events can also load month by month from your server (`data-xz-calendar-url`). Events `xz:day` and `xz:month`; `element.xzCalendar`
- Hover card (`data-xz-hovercard`): a preview that opens when the pointer rests on a link or the link gets keyboard focus, and stays open while the pointer is on it. One `template` can serve every row of a table. It never opens on touch screens, where a tap follows the link
- Timeline (`ol.xz-timeline`): events with a marker, a title, a line of detail and actions, coloured markers, day headings and a compact size. CSS only
- Tree view (`ul[data-xz-tree]`): nested lists that open and close with the keys people know from file managers, plus type-ahead and `*` to open a whole level. The way to the current page opens by itself, and open folders are remembered. Events `xz:toggle` and `xz:select`; `element.xzTree`
- New optional file `xsenze-apps.min.js` (`@sfj/ui-kit/apps`), added with `Xsenze.use()` like the charts file:
  - Chat and AI pieces (`[data-xz-chat]`, `form[data-xz-prompt]`): message bubbles with avatar, time, sources, and copy, retry and feedback buttons; typing dots; replies written as they arrive (`xzChat.stream()`); "Jump to latest"; suggestion chips. The prompt box grows as you type and sends on Enter, while Shift+Enter adds a line. Enter never sends while an input method is still building a word, as when typing Hindi or Tamil. Send turns into Stop while a reply is being written, and attachments use the file upload. Screen readers hear each finished reply once. Without the script the prompt posts as a plain form. Events `xz:send`, `xz:stop`, `xz:retry` and `xz:feedback`
  - Quiz and questionnaire (`form[data-xz-quiz]`): one question at a time, with a count, progress, Flag for review, a review grid and a check before submitting with questions left. Practice mode scores in the browser and shows why each answer is right. Exam mode sends the answers to your server, so the right answers are never in the page. Survey mode has no right answers. A countdown that a reload does not reset, with warnings at 5 minutes and 1 minute, and answers saved as people go. Events `xz:quiz`, `xz:step` and `xz:timeup`
- The date picker and the calendar share one set of date helpers (`src/js/dates.js`). File upload gains `element.xzDropzone.clear()`
- Marquee: when it stands still (before the script, with motion off, or with less motion) its rows are centred and closer together, and no longer fade at the edges
- 10 more icons: bot, send, thumbs-up, thumbs-down, flag, timer, list-checks, folder-open, file and square
- Docs: Components has a section for each new part, the Guidelines keyboard table lists their keys, and Getting started shows the apps file. Lists inside examples no longer pick up the docs page's list spacing
- The main script's size limit is now 46 KB gzipped (45.2 KB today), for the new components and icons

## 0.6.1 (17 Nov 2026)

A heading font that can be shared, and the docs online.

- Headings, buttons, labels and numbers now use **Plus Jakarta Sans**, which ships with the kit under the SIL Open Font License, so pages look the same from the CDN, npm, the docs and your own server. Satoshi's licence does not allow passing the font file on, so the kit no longer depends on it. `xsenze-satoshi.css` is now optional: link it after the main stylesheet, with your own `Satoshi-Variable.woff2` in `fonts/`, to switch headings back to Satoshi. Create page presets that name Satoshi open with Plus Jakarta Sans
- The docs are published at <https://xsenze-ui.vercel.app/docs/>. `vercel.json` and `npm run site` publish a `site` folder with the docs, the kit files and the templates

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
