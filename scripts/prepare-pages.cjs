'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const commitSha = process.env.CF_PAGES_COMMIT_SHA || null;
const branch = process.env.CF_PAGES_BRANCH || null;
// Keep the public Pages artifact explicit: only these files are published.
const publicFiles = [
  'index.html',
  'sw.js',
  'manifest.webmanifest',
  '_headers',
  '_redirects',
  'LICENSE',
  'ASSETS.md',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon.svg',
  'icons/favicon-32.png',
  'favicon.ico',
  'og-image.png',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  '404.html',
  'faq/index.html',
  'site.css',
  'fonts/barlow-condensed-400-700.woff2',
  'fonts/barlow-condensed-800-900.woff2',
  'fonts/dseg7-classic-italic.woff2',
  '.well-known/security.txt',
  'privacy/index.html',
  'tv/index.html',
  'tv/tv.js',
  'third-party/DSEG-LICENSE.txt',
  'third-party/BARLOW-CONDENSED-LICENSE.txt',
];

function assertNoSymlink(relativePath) {
  let current = root;
  for (const segment of relativePath.split(path.sep)) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Refusing symlink in public source path: ${relativePath}`);
    }
  }
}

module.exports = { publicFiles };
if (require.main !== module) return;

if (
  process.env.CF_PAGES === '1' &&
  (!/^[0-9a-f]{40}$/i.test(String(commitSha || '')) || branch !== 'main')
) {
  throw new Error('Cloudflare Pages must build a full commit SHA from main');
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const relativePath of publicFiles) {
  const source = path.join(root, relativePath);
  assertNoSymlink(relativePath);
  if (!fs.lstatSync(source).isFile()) throw new Error(`Expected regular public file: ${relativePath}`);
  const destination = path.join(output, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
}

console.log(`Staged ${publicFiles.length} allowlisted Cloudflare Pages files.`);
