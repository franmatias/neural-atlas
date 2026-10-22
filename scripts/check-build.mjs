import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const root = new URL('../dist/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('.vite/manifest.json', root), 'utf8'));
const files = new Set();
function visit(key) {
  const entry = manifest[key];
  assert(entry, `Missing entry ${key}`);
  if (files.has(entry.file)) return;
  files.add(entry.file);
  for (const css of entry.css ?? []) files.add(css);
  for (const dependency of entry.imports ?? []) visit(dependency);
}
visit('index.html');
visit('src/features/home/HomePage.vue');
// Blocking theme initialization is part of the initial transfer too.
files.add('theme-init.js');
const sizes = { js: 0, css: 0 };
for (const file of files) {
  const type = file.endsWith('.js') ? 'js' : file.endsWith('.css') ? 'css' : null;
  if (type) sizes[type] += gzipSync(await readFile(new URL(file, root))).length;
}
assert(sizes.js <= 250 * 1024, 'Initial JS exceeds 250 KiB gzip');
assert(sizes.css <= 60 * 1024, 'Initial CSS exceeds 60 KiB gzip');
const html = await readFile(new URL('index.html', root), 'utf8');
assert(!html.includes('ws://'), 'Production CSP must not allow development WebSockets');
assert(!/<script(?![^>]*\bsrc=)[^>]*>\s*[^<\s]/i.test(html), 'Unexpected inline executable script');
assert(!html.includes("script-src 'self' 'unsafe-inline'"));
console.log(
  `Initial transfer (gzip): JS ${(sizes.js / 1024).toFixed(2)} KiB; CSS ${(sizes.css / 1024).toFixed(2)} KiB. Production CSP verified.`,
);
