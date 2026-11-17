// Builds dist/ from tokens/ and src/.
//   dist/xsenze.css, xsenze.min.css      tokens + fonts + base + components + blocks (src/blocks)
//   dist/xsenze.js, xsenze.min.js        browser build, global `Xsenze`
//   dist/xsenze.esm.js                   ES module build
//   dist/xsenze-charts.*, xsenze-apps.*  optional files: charts; chat and quiz
//   dist/xsenze-tools.css, .min.css      optional: the tools pack styles (src/css/tools)
//   dist/xsenze-tools.js, .min.js, .esm  optional: the tools pack behaviours (src/js/tools)
//   dist/tokens/tokens.css               CSS variables only
//   dist/tokens/tokens.json              flat, resolved values per theme
//   dist/tokens/tokens.dtcg.json         source tokens (Design Tokens format, for Figma import)
//   dist/icons/                          sprite + single SVG files
//   dist/xsenze-satoshi.css              optional: Satoshi headings for projects with their own copy of the font
//   dist/fonts/                          self-hosted woff2
import { build, transform } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import iconNames from './icons.list.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(root, ...p);
const read = (p) => fs.readFileSync(r(p), 'utf8');
const write = (p, s) => {
  fs.mkdirSync(path.dirname(r(p)), { recursive: true });
  fs.writeFileSync(r(p), s);
};
const pkg = JSON.parse(read('package.json'));
const banner = `/*! Xsenze UI Kit v${pkg.version} | MIT */`;

// ---------- tokens ----------
const tokens = JSON.parse(read('tokens/tokens.json'));

/** Walk a token group and yield [pathParts, token]. */
function* walk(node, trail = []) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    if (value && typeof value === 'object' && '$value' in value) yield [[...trail, key], value];
    else if (value && typeof value === 'object') yield* walk(value, [...trail, key]);
  }
}

// core.color.brand.500 -> --xz-brand-500 ; core.space.4 -> --xz-space-4
const coreName = (parts) => '--xz-' + (parts[0] === 'color' ? parts.slice(1) : parts).join('-');
const core = [...walk(tokens.core)].map(([parts, t]) => [coreName(parts), t.$value]);
const coreByRef = new Map([...walk(tokens.core)].map(([parts, t]) => ['core.' + parts.join('.'), { name: coreName(parts), value: t.$value }]));

function themeVars(theme, resolve) {
  return [...walk(tokens.theme[theme])].map(([parts, t]) => {
    const ref = /^\{(.+)\}$/.exec(t.$value);
    if (!ref) return ['--xz-' + parts.join('-'), t.$value];
    const target = coreByRef.get(ref[1]);
    if (!target) throw new Error(`Unknown token reference ${t.$value} in theme.${theme}.${parts.join('.')}`);
    return ['--xz-' + parts.join('-'), resolve ? target.value : `var(${target.name})`];
  });
}

const block = (selector, vars, extra = '') =>
  `${selector} {\n${extra}${vars.map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`;

const tokensCss =
  `/* Generated from tokens/tokens.json. Do not edit. */\n` +
  block(':root', core) +
  '\n' +
  block(':root,\n[data-theme="light"]', themeVars('light'), '  color-scheme: light;\n') +
  '\n' +
  block('[data-theme="dark"]', themeVars('dark'), '  color-scheme: dark;\n');

const flat = {
  $version: pkg.version,
  core: Object.fromEntries(core.map(([k, v]) => [k.slice(5), v])),
  light: Object.fromEntries(themeVars('light', true).map(([k, v]) => [k.slice(5), v])),
  dark: Object.fromEntries(themeVars('dark', true).map(([k, v]) => [k.slice(5), v])),
};

write('dist/tokens/tokens.css', `${banner}\n${tokensCss}`);
write('dist/tokens/tokens.json', JSON.stringify(flat, null, 2) + '\n');
write('dist/tokens/tokens.dtcg.json', JSON.stringify(tokens, null, 2) + '\n');

// ---------- fonts ----------
// All three are under the SIL Open Font License, so they ship in dist/fonts, on the CDN and in the npm package.
const fonts = [
  ['plus-jakarta-sans', 'latin', 'Plus Jakarta Sans Variable', '200 800'],
  ['plus-jakarta-sans', 'latin-ext', 'Plus Jakarta Sans Variable', '200 800'],
  ['space-grotesk', 'latin', 'Space Grotesk Variable', '300 700'],
  ['space-grotesk', 'latin-ext', 'Space Grotesk Variable', '300 700'],
  ['jetbrains-mono', 'latin', 'JetBrains Mono Variable', '100 800'],
];
const ranges = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
};
fs.mkdirSync(r('dist/fonts'), { recursive: true });
let fontCss = '';
for (const [pkgName, subset, family, weight] of fonts) {
  const file = `${pkgName}-${subset}-wght-normal.woff2`;
  fs.copyFileSync(r('node_modules/@fontsource-variable', pkgName, 'files', file), r('dist/fonts', file));
  fontCss += `@font-face {\n  font-family: "${family}";\n  font-style: normal;\n  font-display: swap;\n  font-weight: ${weight};\n  src: url("fonts/${file}") format("woff2-variations");\n  unicode-range: ${ranges[subset]};\n}\n`;
}

// Satoshi is optional. Headings use Plus Jakarta Sans, which ships with the kit. A project that has its own copy
// of Satoshi (ITF Free Font License, which does not allow passing the file on) links xsenze-satoshi.css after the
// main stylesheet and puts Satoshi-Variable.woff2 in fonts/. The file is never in the repository or the npm package.
const satoshiDir = 'src/fonts/Satoshi_Complete';
if (fs.existsSync(r(satoshiDir, 'Fonts/WEB/fonts/Satoshi-Variable.woff2'))) {
  fs.copyFileSync(r(satoshiDir, 'Fonts/WEB/fonts/Satoshi-Variable.woff2'), r('dist/fonts/Satoshi-Variable.woff2'));
  fs.copyFileSync(r(satoshiDir, 'License/FFL.txt'), r('dist/fonts/Satoshi-FFL.txt'));
}
const satoshiCss = `@font-face {\n  font-family: "Satoshi";\n  font-style: normal;\n  font-display: swap;\n  font-weight: 300 900;\n  src: url("fonts/Satoshi-Variable.woff2") format("woff2-variations");\n}\n:root {\n  --xz-font-display: "Satoshi", "Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Space Grotesk Variable", "Space Grotesk", "Noto Sans", system-ui, sans-serif;\n}\n`;

// ---------- css ----------
const cssOrder = fs.readdirSync(r('src/css')).filter((f) => f.endsWith('.css')).sort();
const componentsCss = cssOrder.map((f) => `/* ---- ${f.replace(/^\d+-|\.css$/g, '')} ---- */\n${read('src/css/' + f).trim()}\n`).join('\n');
// Blocks, one folder per kind. Motion comes first because the other blocks build on its states.
const blockKinds = ['motion', 'navigation', 'hero', 'content', 'forms', 'data-display', 'footer'];
const blockFiles = blockKinds.flatMap((kind) =>
  fs.existsSync(r('src/blocks', kind)) ? fs.readdirSync(r('src/blocks', kind)).filter((f) => f.endsWith('.css')).sort().map((f) => `${kind}/${f}`) : [],
);
const blocksCss = blockFiles.map((f) => `/* ---- blocks/${f.replace(/\.css$/, '')} ---- */\n${read('src/blocks/' + f).trim()}\n`).join('\n');
const fullCss = `${banner}\n${fontCss}\n${tokensCss}\n${componentsCss}\n${blocksCss}`;
write('dist/xsenze.css', fullCss);
write('dist/xsenze.min.css', banner + '\n' + (await transform(fullCss, { loader: 'css', minify: true })).code);
// The tools pack has its own stylesheet, loaded after xsenze.css on pages that use panels, colour or maths parts.
const toolFiles = fs.readdirSync(r('src/css/tools')).filter((f) => f.endsWith('.css')).sort();
const toolsCss = `/*! Xsenze UI Kit tools v${pkg.version} | MIT */\n/* Load after xsenze.css. */\n${toolFiles.map((f) => `/* ---- tools/${f.replace(/^\d+-|\.css$/g, '')} ---- */\n${read('src/css/tools/' + f).trim()}\n`).join('\n')}`;
write('dist/xsenze-tools.css', toolsCss);
write('dist/xsenze-tools.min.css', (await transform(toolsCss, { loader: 'css', minify: true })).code);
write('dist/xsenze-satoshi.css',`${banner}\n/* Optional: switches headings to Satoshi. Load after xsenze.css, and put your own licensed copy of Satoshi-Variable.woff2 in fonts/. Without this file, headings use Plus Jakarta Sans. */\n${satoshiCss}`);

// ---------- icons ----------
const icons = {};
let sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n';
fs.mkdirSync(r('dist/icons'), { recursive: true });
for (const name of iconNames) {
  const src = r('node_modules/lucide-static/icons', name + '.svg');
  if (!fs.existsSync(src)) throw new Error(`Icon not found: ${name}`);
  const inner = fs.readFileSync(src, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<svg[\s\S]*?>/, '').replace('</svg>', '').replace(/\s*\n\s*/g, '').replace(/ \/>/g, '/>').trim();
  icons[name] = inner;
  sprite += `<symbol id="${name}" viewBox="0 0 24 24">${inner}</symbol>\n`;
  write(`dist/icons/${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square" stroke-linejoin="miter">${inner}</svg>\n`);
}
write('dist/icons/sprite.svg', sprite + '</svg>\n');
write('src/js/icons.generated.js', `// Generated by scripts/build.mjs. Do not edit.\nexport default ${JSON.stringify(icons)};\n`);

// ---------- brand ----------
fs.cpSync(r('src/brand'), r('dist/brand'), { recursive: true });

// ---------- js ----------
const common = { entryPoints: [r('src/js/index.js')], bundle: true, banner: { js: banner }, target: 'es2019', define: { __VERSION__: JSON.stringify(pkg.version) } };
await build({ ...common, format: 'iife', globalName: 'Xsenze', footer: { js: 'Xsenze = Xsenze.default;' }, outfile: r('dist/xsenze.js') });
await build({ ...common, format: 'iife', globalName: 'Xsenze', footer: { js: 'Xsenze=Xsenze.default;' }, minify: true, outfile: r('dist/xsenze.min.js') });
await build({ ...common, format: 'esm', outfile: r('dist/xsenze.esm.js') });
// Charts are an optional file: load it after the kit on pages that show charts. It registers itself with Xsenze.use().
const charts = { ...common, entryPoints: [r('src/js/charts/index.js')], banner: { js: `/*! Xsenze UI Kit charts v${pkg.version} | MIT */` } };
await build({ ...charts, format: 'iife', globalName: 'XsenzeCharts', outfile: r('dist/xsenze-charts.js') });
await build({ ...charts, format: 'iife', globalName: 'XsenzeCharts', minify: true, outfile: r('dist/xsenze-charts.min.js') });
await build({ ...charts, format: 'esm', outfile: r('dist/xsenze-charts.esm.js') });
// App pieces (chat, quiz) are another optional file, for pages that use them.
const apps = { ...common, entryPoints: [r('src/js/apps/index.js')], banner: { js: `/*! Xsenze UI Kit apps v${pkg.version} | MIT */` } };
await build({ ...apps, format: 'iife', globalName: 'XsenzeApps', outfile: r('dist/xsenze-apps.js') });
await build({ ...apps, format: 'iife', globalName: 'XsenzeApps', minify: true, outfile: r('dist/xsenze-apps.min.js') });
await build({ ...apps, format: 'esm', outfile: r('dist/xsenze-apps.esm.js') });
// The tools pack (panels, split view, menu bar, dual list, readouts, colour and maths) is the third optional file.
const tools = { ...common, entryPoints: [r('src/js/tools/index.js')], banner: { js: `/*! Xsenze UI Kit tools v${pkg.version} | MIT */` } };
await build({ ...tools, format: 'iife', globalName: 'XsenzeTools', outfile: r('dist/xsenze-tools.js') });
await build({ ...tools, format: 'iife', globalName: 'XsenzeTools', minify: true, outfile: r('dist/xsenze-tools.min.js') });
await build({ ...tools, format: 'esm', outfile: r('dist/xsenze-tools.esm.js') });

// ---------- data for the docs site ----------
const { gzipSync } = await import('node:zlib');
const size = (p) => ({ raw: fs.statSync(r(p)).size, gzip: gzipSync(fs.readFileSync(r(p))).length });
const cssParts = Object.fromEntries(await Promise.all(cssOrder.map(async (f) => [f.replace(/^\d+-|\.css$/g, ''), gzipSync((await transform(read('src/css/' + f), { loader: 'css', minify: true })).code).length])));
cssParts.sections = gzipSync((await transform(blocksCss, { loader: 'css', minify: true })).code).length;
write('docs/data.generated.js', `// Generated by scripts/build.mjs. Do not edit.
window.XZ_DOCS = ${JSON.stringify({ version: pkg.version, tokens: flat, icons: iconNames, sizes: { css: size('dist/xsenze.min.css'), js: size('dist/xsenze.min.js'), charts: size('dist/xsenze-charts.min.js'), apps: size('dist/xsenze-apps.min.js'), toolsCss: size('dist/xsenze-tools.min.css'), tools: size('dist/xsenze-tools.min.js'), tokens: size('dist/tokens/tokens.css'), parts: cssParts } })};
`);

// ---------- docs site data: page list and search index ----------
const { buildDocs } = await import('./docs/build.mjs');
const docsInfo = await buildDocs();

// ---------- report and size budget ----------
// Gzipped size limits. The build warns when one is passed; `npm run build -- --strict` (used before publishing) fails.
// 0.6.0: the data table (selection, filters, columns, CSV) and the command palette brought the core file to about 41 KB.
// 0.7.0: calendar, hover card, tree view and 10 icons join the core (about 45.2 KB); chat and quiz go in the optional apps file.
// 0.8.0: 11 icons and one helper for optional parts join the core (limit 47 KB); the tools pack is its own pair of
// files, about 9 KB of CSS and 19 KB of script, most of it the colour maths and the maths reader and keypad.
const budget = { 'dist/xsenze.min.css': 31, 'dist/xsenze.min.js': 47, 'dist/xsenze-charts.min.js': 10, 'dist/xsenze-apps.min.js': 6, 'dist/xsenze-tools.min.css': 10, 'dist/xsenze-tools.min.js': 20 };
const kb = (p) => (fs.statSync(r(p)).size / 1024).toFixed(1).padStart(6) + ' KB  ' + p + (budget[p] ? `  (${(size(p).gzip / 1024).toFixed(1)} KB gzipped, limit ${budget[p]} KB)` : '');
console.log(['dist/xsenze.min.css', 'dist/xsenze.min.js', 'dist/xsenze-charts.min.js', 'dist/xsenze-apps.min.js', 'dist/xsenze-tools.min.css', 'dist/xsenze-tools.min.js', 'dist/tokens/tokens.css', 'dist/tokens/tokens.json'].map(kb).join('\n'));
console.log(`${core.length} core tokens, ${themeVars('light').length} theme tokens x 2 themes, ${iconNames.length} icons, ${docsInfo.items} docs search entries`);
const over = Object.entries(budget).filter(([p, limit]) => size(p).gzip / 1024 > limit);
for (const [p, limit] of over) console.warn(`Size budget: ${p} is over ${limit} KB gzipped.`);
if (over.length && process.argv.includes('--strict')) process.exit(1);
