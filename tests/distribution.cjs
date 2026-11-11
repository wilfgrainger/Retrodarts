'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {resolve}=require('node:path');
process.chdir(resolve(__dirname,'..'));
const app=fs.readFileSync('index.html','utf8');
assert(app.includes(fs.readFileSync('LICENSE','utf8').trim()),'the PWA embeds the MIT notice');
const extract=(html,tag)=>[...html.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`,'g'))].map(m=>m[1]);
const requiredListenerIds=[...extract(app,'script').find(script=>script.includes('const localStore=browserStore();')).matchAll(/\$\('([^']+)'\)\.addEventListener/g)].map(match=>match[1]);
assert(requiredListenerIds.length>0,'found the app script event listeners');
for(const id of requiredListenerIds)assert(app.includes(`id="${id}"`),`missing required event target #${id}`);
assert(app.includes('save-blocker" class="save-blocker" hidden aria-hidden="true"'),'save blocker is hidden from accessibility tree when dismissed');
assert(app.includes('id="shade" class="shade" hidden aria-hidden="true"'),'dialog shade is hidden from accessibility tree when closed');
const worker=fs.readFileSync('sw.js','utf8');
const files=JSON.parse(worker.match(/const FILES=(\[[^;]+\]);/)[1]);
const {publicFiles}=require('../scripts/prepare-pages.cjs');
const published=file=>publicFiles.includes(file.replace(/^(?:\.\.\/|\.?\/)+/,''));
for(const file of files.map(file=>file==='./'?'index.html':file.replace(/^\.\//,''))){assert(fs.existsSync(file),`missing precache resource: ${file}`);assert(publicFiles.includes(file),`precached resource is not published: ${file}`);}
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
assert.equal(manifest.orientation,'any','installed app supports portrait and landscape');
// Install: the app links its manifest, registers the service worker and offers Install from the menu.
assert(app.includes('rel="manifest"'),'browser app links its web manifest');
assert(/navigator\.serviceWorker\.register\(['"]\.\/sw\.js['"](?:,\{[^}]+\})?\)/.test(app),'browser app registers offline support');
assert(app.includes('id="install-pwa"')&&app.includes('beforeinstallprompt'),'install action is available from the menu');
assert(app.includes('navigator.storage?.persist?.()'),'match start requests best-effort persistent storage');
assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
assert(manifest.icons.length>=2,'install metadata includes standard icon sizes');
assert(manifest.icons.some(icon=>icon.purpose==='any'),'install metadata includes a standard (non-maskable) icon');
for(const icon of manifest.icons)assert(published(icon.src),`icon is not published: ${icon.src}`);
for(const file of ['README.md','AGENTS.md','SECURITY.md','ASSETS.md','docs/ARCHITECTURE.md','docs/DISTRIBUTION_DECISION.md']){
 const text=fs.readFileSync(file,'utf8');
 for(const [,link] of text.matchAll(/\]\(([^)]+)\)/g)){
  if(/^(?:[a-z][a-z\d+.-]*:|#)/i.test(link))continue;
  const target=resolve(require('node:path').dirname(file),link.split('#')[0]);
  assert(fs.existsSync(target),`${file}: missing local link ${link}`);
 }
}
// Link previews: Open Graph and Twitter cards point at a real 1200x630 PNG, and the favicon and touch icons exist.
{
  const head=app.split('</head>')[0];
  const meta=(attr,name)=>(head.match(new RegExp('<meta[^>]*'+attr+'="'+name+'"[^>]*content="([^"]+)"'))||[])[1];
  assert(meta('property','og:title')&&meta('property','og:description')&&meta('property','og:url'),'Open Graph title, description and url are set');
  assert.equal(meta('name','twitter:card'),'summary_large_image','large Twitter card');
  const image=meta('property','og:image');assert(/^https:\/\/retrodarts\.com\/og-image\.png$/.test(image),'share image is an absolute https url');
  const png=fs.readFileSync('og-image.png');assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),1200,'share image is 1200 wide');assert.equal(png.readUInt32BE(20),630,'share image is 630 tall');
  assert(png.length<300*1024,'share image stays small enough for every crawler');
  for(const link of [...head.matchAll(/<link[^>]*rel="(?:icon|shortcut icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)].map(m=>m[1]))assert(published(link),'linked icon is not published: '+link);
}
console.log('PASS: PWA entry point, install metadata, precache resources, manifest icons and local documentation links');
