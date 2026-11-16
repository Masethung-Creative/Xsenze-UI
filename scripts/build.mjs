// Builds dist/ from tokens/ and src/.
//   dist/xsenze.css, xsenze.min.css      tokens + fonts + base + components + blocks (src/blocks)
//   dist/xsenze.js, xsenze.min.js        browser build, global `Xsenze`
//   dist/xsenze.esm.js                   ES module build
//   dist/tokens/tokens.css               CSS variables only
//   dist/tokens/tokens.json              flat, resolved values per theme
//   dist/tokens/tokens.dtcg.json         source tokens (Design Tokens format, for Figma import)
//   dist/icons/                          sprite + single SVG files
//   dist/xsenze-satoshi.css              heading font (the font file itself is not in the npm package)
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
const fonts = [
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

// Satoshi is the official, unmodified variable file from Fontshare (ITF Free Font License, copied next to it).
// That licence does not allow passing the font file on to others, so it lives in its own stylesheet,
// xsenze-satoshi.css, and package.json leaves the font file out of the npm package.
// Each project adds its own copy of Satoshi-Variable.woff2. Without it, headings use Space Grotesk.
const satoshiDir = 'src/fonts/Satoshi_Complete';
// The font is not in the public repository. Download Satoshi from Fontshare into src/fonts/Satoshi_Complete to use it.
if (fs.existsSync(r(satoshiDir, 'Fonts/WEB/fonts/Satoshi-Variable.woff2'))) {
  fs.copyFileSync(r(satoshiDir, 'Fonts/WEB/fonts/Satoshi-Variable.woff2'), r('dist/fonts/Satoshi-Variable.woff2'));
  fs.copyFileSync(r(satoshiDir, 'License/FFL.txt'), r('dist/fonts/Satoshi-FFL.txt'));
} else {
  console.log('Satoshi not found in src/fonts/Satoshi_Complete: headings will use Space Grotesk. Download it from Fontshare to add it.');
}
const satoshiCss = `@font-face {\n  font-family: "Satoshi";\n  font-style: normal;\n  font-display: swap;\n  font-weight: 300 900;\n  src: url("fonts/Satoshi-Variable.woff2") format("woff2-variations");\n}\n`;

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
write('dist/xsenze-satoshi.css', `${banner}\n/* Heading font. Load after xsenze.css, and put your own licensed copy of Satoshi-Variable.woff2 in fonts/. */\n${satoshiCss}`);

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

// ---------- data for the docs site ----------
const { gzipSync } = await import('node:zlib');
const size = (p) => ({ raw: fs.statSync(r(p)).size, gzip: gzipSync(fs.readFileSync(r(p))).length });
const cssParts = Object.fromEntries(await Promise.all(cssOrder.map(async (f) => [f.replace(/^\d+-|\.css$/g, ''), gzipSync((await transform(read('src/css/' + f), { loader: 'css', minify: true })).code).length])));
cssParts.sections = gzipSync((await transform(blocksCss, { loader: 'css', minify: true })).code).length;
write('docs/data.generated.js', `// Generated by scripts/build.mjs. Do not edit.
window.XZ_DOCS = ${JSON.stringify({ version: pkg.version, tokens: flat, icons: iconNames, sizes: { css: size('dist/xsenze.min.css'), js: size('dist/xsenze.min.js'), tokens: size('dist/tokens/tokens.css'), parts: cssParts } })};
`);

// ---------- report ----------
const kb = (p) => (fs.statSync(r(p)).size / 1024).toFixed(1).padStart(6) + ' KB  ' + p;
console.log(['dist/xsenze.min.css', 'dist/xsenze.min.js', 'dist/tokens/tokens.css', 'dist/tokens/tokens.json'].map(kb).join('\n'));
console.log(`${core.length} core tokens, ${themeVars('light').length} theme tokens x 2 themes, ${iconNames.length} icons`);
