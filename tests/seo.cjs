'use strict';
// Invariants for search and AI discovery. Asserts structure and consistency, not wording.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const origin = 'https://retrodarts.com';
const { publicFiles } = require('../scripts/prepare-pages.cjs');
const published = file => publicFiles.includes(file.replace(/^(?:\.\.\/|\.?\/)+/, ''));

function head(html) { return html.slice(0, html.indexOf('</head>')); }
function jsonLd(html, label) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert(blocks.length >= 1, `${label}: has JSON-LD`);
  return blocks.map(b => { try { return JSON.parse(b); } catch (e) { assert.fail(`${label}: JSON-LD must parse (${e.message})`); } });
}
function nodes(blocks) { return blocks.flatMap(b => (b['@graph'] ? b['@graph'] : [b])); }

const pages = { '/': 'index.html', '/faq/': 'faq/index.html', '/privacy/': 'privacy/index.html' };
for (const [url, file] of Object.entries(pages)) {
  const html = read(file), h = head(html);
  const title = (h.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  assert(title && title.trim().length >= 25 && title.trim().length <= 80, `${file}: title 25-80 characters`);
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  assert(desc && desc.length >= 60 && desc.length <= 170, `${file}: meta description 60-170 characters`);
  assert(h.includes(`<link rel="canonical" href="${origin}${url}">`), `${file}: canonical is ${origin}${url}`);
  assert(/<html lang="en-GB"/.test(html), `${file}: lang en-GB`);
  assert(!/noindex/i.test(h), `${file}: indexable`);
}

// Landing page: one WebApplication with the facts search engines and AI assistants read.
const idx = read('index.html');
const idxNodes = nodes(jsonLd(idx, 'index.html'));
const app = idxNodes.find(n => n['@type'] === 'WebApplication');
assert(app, 'index.html: WebApplication JSON-LD');
assert.equal(app.offers && app.offers.price, '0', 'app is free');
assert(app.isAccessibleForFree === true, 'app is accessible for free');
assert(Array.isArray(app.featureList) && app.featureList.length >= 4, 'app lists features');
assert(!('aggregateRating' in app) && !('review' in app), 'no invented ratings or reviews');
assert(idxNodes.some(n => n['@type'] === 'WebSite'), 'index.html: WebSite JSON-LD');
assert(/<noscript>[\s\S]*<h1>[\s\S]*<\/noscript>/.test(idx), 'index.html: crawlable no-JavaScript summary');
assert(idx.includes('href="https://retrodarts.com/faq/"'), 'app links to the FAQ');

// Guide: breadcrumb and FAQ markup must match the visible FAQ.
const guide = read('faq/index.html');
const gNodes = nodes(jsonLd(guide, 'faq/index.html'));
const faq = gNodes.find(n => n['@type'] === 'FAQPage');
assert(faq && faq.mainEntity.length >= 5, 'faq: FAQPage with at least 5 questions');
const visible = guide.slice(guide.indexOf('</script>', guide.indexOf('application/ld+json')) + 9);
for (const q of faq.mainEntity) {
  assert(visible.includes(`<h3>${q.name}</h3>`), `faq: FAQ question is visible on the page: ${q.name}`);
  assert(visible.includes(q.acceptedAnswer.text), `faq: FAQ answer is visible on the page: ${q.name}`);
}
assert(gNodes.some(n => n['@type'] === 'BreadcrumbList'), 'faq: breadcrumb');
assert.equal((guide.match(/<h1[ >]/g) || []).length, 1, 'faq: exactly one h1');

// Crawl files: sitemap lists real, canonical pages; robots points at it; llms.txt links resolve to real files.
const sitemap = read('sitemap.xml');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.deepEqual(locs.sort(), Object.keys(pages).map(u => origin + u).sort(), 'sitemap lists exactly the indexable pages');
assert(/Sitemap: https:\/\/retrodarts\.com\/sitemap\.xml/.test(read('robots.txt')), 'robots.txt names the sitemap');
assert(/User-agent: \*\s*\nAllow: \//.test(read('robots.txt')), 'robots.txt allows crawling');
assert(!/Disallow:\s*\//.test(read('robots.txt')), 'robots.txt does not block the site');
const llms = read('llms.txt');
assert(/^# Retro Darts Scorer\n\n> /.test(llms), 'llms.txt starts with an H1 and a summary');
for (const m of llms.matchAll(/\]\((https:\/\/retrodarts\.com\/[^)]*)\)/g)) {
  const rel = new URL(m[1]).pathname;
  assert(published(rel.endsWith('/') ? rel + 'index.html' : rel), `llms.txt link resolves to a published file: ${m[1]}`);
}

// 404: unknown URLs get a real 404 (Pages serves 404.html with status 404), not the app with a 200.
const nf = read('404.html');
assert(/<meta name="robots" content="noindex">/.test(nf), '404.html is noindex');

// Static pages share one stylesheet and follow the player's theme like the app does.
// The theme ids come from the app's theme picker (THEME_CHOICES), so adding or renaming a theme needs no test edits.
const appThemes = [...idx.match(/const THEME_CHOICES=\[([\s\S]*?)\];/)[1].matchAll(/id:'([^']+)'/g)].map(m => m[1]).sort();
assert(appThemes.length > 0, 'index.html: theme picker lists themes');
for (const f of ['faq/index.html', 'privacy/index.html', '404.html']) {
  const h = read(f);
  const saved = h.match(/localStorage\.getItem\('retro-darts-theme-v1'\);if\(\[([^\]]*)\]\.indexOf\(t\)>-1\)document\.documentElement\.setAttribute\('data-theme',t\)/);
  assert(saved, `${f}: applies the saved theme`);
  assert.deepEqual([...saved[1].matchAll(/'([^']+)'/g)].map(m => m[1]).sort(), appThemes, `${f}: accepts the same themes as the app picker`);
  assert(/<link rel="stylesheet" href="(\.\.\/|\/)site\.css">/.test(h), `${f}: uses the shared stylesheet`);
}
const css = read('site.css');
for (const theme of appThemes) assert(css.includes(`data-theme="${theme}"`), `site.css styles theme ${theme}`);
for (const font of css.matchAll(/url\(([^)]+\.woff2)\)/g)) assert(published(font[1]), `site.css font is published: ${font[1]}`);
assert(/\/guide\/? \/faq\/ 301/.test(read('_redirects')), 'old /guide/ URL redirects to /faq/');
// The FAQ cites the league example it uses.
assert(/shrewsburydarts\.org\.uk\/information\/rules\//.test(guide), 'faq: league example links its source');
assert(/not an endorsement/i.test(guide), 'faq: league example says it is not an endorsement');
console.log('SEO / DISCOVERY PASS');
