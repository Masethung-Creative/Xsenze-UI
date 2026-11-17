// Copies the website into site/, for hosts that publish one folder (Vercel): the redirect page at the root,
// docs/, dist/ and templates/. Everything is already built and committed, so this needs no packages.
// The Satoshi font file and the unlinked lab pages are never copied.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'site');
const parts = ['index.html', 'docs', 'dist', 'templates'];
const skip = (src) => /satoshi[^/\\]*\.(woff2?|ttf|otf)$|satoshi-ffl\.txt$/i.test(src) || /[/\\]docs[/\\]lab([/\\]|$)/.test(src);

fs.rmSync(out, { recursive: true, force: true });
let files = 0;
for (const part of parts) {
  const from = path.join(root, part);
  if (!fs.existsSync(from)) throw new Error(`Missing ${part}: run npm run build first.`);
  fs.cpSync(from, path.join(out, part), {
    recursive: true,
    filter: (src) => {
      if (skip(src)) return false;
      if (fs.statSync(src).isFile()) files++;
      return true;
    },
  });
}
// The published site cannot include Satoshi, so its stylesheet becomes an empty stand-in:
// pages and templates that link it ask for no font file, and headings use the fallback font.
fs.writeFileSync(path.join(out, 'dist/xsenze-satoshi.css'), '/* Satoshi is not published on this site, because its licence does not allow passing the font file on. Headings use the fallback font. */\n');
console.log(`Website copied to site/: ${files} files`);
