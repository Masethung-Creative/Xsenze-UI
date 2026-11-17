# Roadmap

## Phase 1: Foundation and core (versions 0.1.0 to 0.3.0)

Goal: build standard screens such as login, dashboard, forms and tables.

| Item | Status |
| --- | --- |
| Colour, typography, spacing, grid, breakpoints, containers | Done |
| Radius, border widths, elevation, layers, opacity | Done |
| Icon set and sizes, logo rules | Done |
| Buttons, inputs, checkbox, radio, toggle, select, combobox | Done |
| Labels, helper text, error messages, form validation | Done |
| Badges, tags, chips, avatars, links, dividers, tooltips | Done |
| Spinners, progress bars, skeletons | Done |
| Cards, stat cards, tabs, accordion, breadcrumbs, pagination | Done |
| Alerts, banners, empty states | Done |
| Navbar, sidebar, footer, modal, drawer, toast | Done |
| Table with sorting, pagination and row actions | Done |
| Login, signup, forgot password, dashboard, 404, 500 templates | Done |
| Interaction states, AA contrast, focus rings, 44px touch targets | Done |
| Microcopy basics, Indian formats | Done |
| Token export to CSS variables and JSON | Done |
| Browser build for HTML and PHP, quick-start guide | Done |
| Figma team library with variables and styles | Partly done. The Figma file "Xsenze UI Kit" has 191 variables: Primitives (103), Theme (44, light) and Theme (Dark) (44). Still to do: text styles, effect styles, components, and publishing as a team library. Publishing and a single Theme collection with Light and Dark modes both need a paid Figma plan. |

Dark theme mappings and basic motion tokens belong to Phase 2 but shipped early, because the brand is dark first and the components needed transitions.

## Phase 2: Expansion and product patterns

Goal: cover complex workflows, plus LMS, ERP and CRM needs.

- **Done (0.4.0)** Foundations: motion, data-visualisation palette, gradients, blur, aspect ratios, illustration and imagery guidelines
- **Done (0.4.0)** Forms: date, time and date range pickers, file upload, slider, stepper, rating, OTP input, tag input, rich text editor
- **Done (0.4.0)** Create page: build a theme (greys, main colour, fonts, corners, icon weight), preview it and export CSS or JSON
- **Done (0.5.0)** Components: media, profile and pricing cards, context menus, segmented control, search with suggestions, popover, bottom sheet, notification centre, wizard, mega menu, bottom navigation, carousel, lightbox, video and audio player
- **Done (0.6.0)** Blocks for landing pages and a landing page template
- **Done (0.6.0)** Data: table with filters, row selection and bulk actions, a column menu, detail rows, CSV export and a sticky header; charts (bar, line, area, donut, pie) in an optional file; sparklines and progress rings
- **Done (0.6.0)** Command palette, long-text styles, CDN links from GitHub release tags, install guides per platform, docs search, live previews with a toolbar
- **Done (0.7.0)** Calendar month view, hover card, timeline and tree view; chat and AI pieces and a quiz in an optional file; a docs home page built from the kit's blocks
- **Done (0.8.0)** Tools pack in optional files: panels of rows, resizable split view, menu bar, dual list, readouts and timer, lamps, pixel loaders, measure lines and paper sizes, page strip, before and after, colour field, shades, contrast check and colour picker, maths view, answer box and keypad, code block, text tools, rail sidebar; a Tools docs page with an inventory, integration steps and design tokens; settings and certificate maker templates
- Next (0.9.0): one docs page per component, code previews, changelog and theming pages, AI-friendly copies of the docs (llms.txt, Markdown) and a kanban board
- Then (0.10.0): named styles and chart colours on the Create page, a collapsible section, scroll areas, and right-to-left languages
- Domain: course card, lesson player, quiz (**done in 0.7.0**), progress dashboards, attendance grid, leaderboard, certificates (**certificate maker template in 0.8.0**), approval workflow, role-based views, CSV import and export, invoices and receipts
- Templates: onboarding, settings (**done in 0.8.0**) and profile, list and detail, multi-step forms, search results, inbox
- Responsive: mobile behaviour for every component, swipe actions, action sheets, pull-to-refresh
- Installation: **done (0.6.0)** CDN and npm install from GitHub release tags; still to do: publish `xsenze-ui` to the npm registry, Tailwind and SCSS token exports, theme provider, component playground

## Phase 3: Scale, localisation and governance

Goal: make the kit enterprise-grade, multilingual and self-sustaining.

- Localisation: Indic script support, bundled Noto Sans fallbacks, text expansion rules, right-to-left support if needed
- Components: command palette (**done in 0.6.0**), chat bubbles (**done in 0.7.0**), comments, colour picker, transfer list and code block (**done in 0.8.0**), floating action button, back to top, scroll areas, consent banner, checkout patterns
- Content: voice and tone guide, writing standards, full microcopy library
- Brand assets: email, social, presentation and document templates, favicon and app icons, print stylesheets
- Engineering: framework packages, design-to-code linking, visual regression tests, performance budgets, browser support matrix
- Governance: versioning and changelog, migration guides, contribution rules, deprecation policy, design QA checklist, accessibility audits, ownership and approvals
