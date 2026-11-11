const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const license = fs.readFileSync('third-party/DSEG-LICENSE.txt', 'utf8');
assert(license.includes('Copyright (c) 2017, keshikan'));
assert(license.includes('SIL OPEN FONT LICENSE Version 1.1'));
const barlow = fs.readFileSync('third-party/BARLOW-CONDENSED-LICENSE.txt', 'utf8');
assert(barlow.includes('The Barlow Project Authors'));
assert(barlow.includes('SIL Open Font License, Version 1.1'));
const file = 'index.html';
const html = fs.readFileSync(file, 'utf8');
assert(html.includes(license), file + ' includes the bundled font licence');
assert(html.includes(barlow.trim()), file + ' includes the Barlow Condensed licence');
// Which elements use DSEG7 is checked on computed styles in tests/viewports.spec.mjs.
assert(/font-family:\s*DSEG7Classic/.test(html), file + ' uses the segmented DSEG7 face for score digits');
const embedded = [...html.matchAll(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/g)].map(m => m[1]);
assert.equal(embedded.length, 4, file + ' embeds both segmented fonts and both Barlow Condensed weights');
for (const source of embedded) {
  const bytes = Buffer.from(source, 'base64');
  assert.equal(bytes.subarray(0, 4).toString(), 'wOF2', file + ' contains a WOFF2 font');
  assert(bytes.length > 4000, file + ' contains a complete font');
}
const dseg7 = html.match(/@font-face\{font-family:DSEG7Classic;src:url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\) format\("woff2"\);font-weight:400;font-style:italic;/);
assert(dseg7, file + ' registers the original DSEG7 face as italic 400');
assert.equal(crypto.createHash('sha256').update(Buffer.from(dseg7[1], 'base64')).digest('hex'), '383af6b9f743706d055459521e1cd2de8b080ce25300fc78661edec3d1129580', file + ' keeps the exact original DSEG7 WOFF2 asset');
console.log('SEGMENTED FONTS / FONT LICENCE PASS');
