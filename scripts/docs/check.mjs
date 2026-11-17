// Checks the docs site without a browser: `npm run check:docs`.
//   - every internal link, src, form action and preview source points at a file that exists,
//     and every #hash points at an id on that page
//   - no page has the same id twice
//   - code samples use __XZ_VERSION__ and the other placeholders, not typed version numbers
//   - the generated docs data is up to date
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDocs } from './build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const r = (...p) => path.join(root, ...p);
const pages = [
  ...fs.readdirSync(r('docs')).filter((f) => f.endsWith('.html')).map((f) => `docs/${f}`),
  ...(fs.existsSync(r('docs/lab')) ? fs.readdirSync(r('docs/lab')).filter((f) => f.endsWith('.html')).map((f) => `docs/lab/${f}`) : []),
  ...fs.readdirSync(r('templates')).filter((f) => f.endsWith('.html')).map((f) => `templates/${f}`),
  'index.html',
];
const problems = [];
const idsCache = new Map();
const idsOf = (file) => {
  if (!idsCache.has(file)) idsCache.set(file, new Set([...fs.readFileSync(r(file), 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return idsCache.get(file);
};
// Code samples are text, not links: leave them out of the link check.
const withoutSamples = (html) =>
  html
    .replace(/<textarea[^>]*class="doc-snippet"[\s\S]*?<\/textarea>/g, '')
    .replace(/<pre[^>]*class="doc-snippet"[\s\S]*?<\/pre>/g, '')
    .replace(/<code[^>]*>[\s\S]*?<\/code>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '');

for (const file of pages) {
  const html = fs.readFileSync(r(file), 'utf8');
  // Duplicate ids
  const seen = new Map();
  for (const m of withoutSamples(html).matchAll(/\sid="([^"]+)"/g)) seen.set(m[1], (seen.get(m[1]) || 0) + 1);
  for (const [id, count] of seen) if (count > 1 && !/\$\{/.test(id)) problems.push(`${file}: id "${id}" is used ${count} times`);
  // Links
  const body = withoutSamples(html);
  for (const m of body.matchAll(/\s(href|src|action|data-src|data-template|poster)="([^"]*)"/g)) {
    const value = m[2].replace(/&amp;/g, '&');
    if (!value || /^(https?:|mailto:|tel:|data:|javascript:|blob:|\$\{)/.test(value) || value.includes('__XZ_') || value.includes('{')) continue;
    if (value.startsWith('/')) {
      problems.push(`${file}: "${value}" starts at the site root, which breaks on GitHub Pages; use a relative path`);
      continue;
    }
    const [pathPart, hash] = value.split('#');
    const target = pathPart ? path.posix.normalize(path.posix.join(path.posix.dirname(file), pathPart.split('?')[0])) : file;
    const targetFile = fs.existsSync(r(target)) && fs.statSync(r(target)).isDirectory() ? path.posix.join(target, 'index.html') : target;
    if (!fs.existsSync(r(targetFile))) {
      problems.push(`${file}: ${m[1]}="${value}" points at a missing file`);
      continue;
    }
    if (hash && targetFile.endsWith('.html') && !idsOf(targetFile).has(decodeURIComponent(hash))) problems.push(`${file}: ${m[1]}="${value}" points at a missing id`);
  }
  // Typed version numbers in code samples
  for (const m of html.matchAll(/<(textarea|pre)[^>]*class="doc-snippet"[\s\S]*?<\/\1>/g)) {
    const v = /(?:@v?|\$xz = '|\/)\d+\.\d+\.\d+/.exec(m[0]);
    if (v) problems.push(`${file}: a code sample types a version ("${v[0]}"); use __XZ_VERSION__ or __XZ_CDN__`);
  }
}

// The generated docs data must match the pages.
const generated = ['docs/site.generated.js', 'docs/search.generated.js'];
const before = generated.map((f) => (fs.existsSync(r(f)) ? fs.readFileSync(r(f), 'utf8') : ''));
await buildDocs();
generated.forEach((f, i) => {
  if (fs.readFileSync(r(f), 'utf8') !== before[i]) problems.push(`${f} was out of date. It has been rebuilt; commit the new file.`);
});

if (problems.length) {
  console.log(problems.map((p) => `  - ${p}`).join('\n'));
  console.log(`\n${problems.length} problem(s) in the docs`);
  process.exit(1);
}
console.log(`Docs check: ${pages.length} pages, links, ids and samples are fine`);
