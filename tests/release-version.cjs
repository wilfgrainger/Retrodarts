'use strict';
const assert=require('node:assert/strict');
const {execFileSync,spawnSync}=require('node:child_process');
const fs=require('node:fs');
const root=require('node:path').resolve(__dirname,'..');
const run=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const app=fs.readFileSync(`${root}/index.html`,'utf8');
const worker=fs.readFileSync(`${root}/sw.js`,'utf8');
const manifest=fs.readFileSync(`${root}/manifest.webmanifest`,'utf8');
const menuVersion=html=>html.match(/<small class="app-menu-version"[^>]*>Version ([^<]+)<\/small>/)?.[1];
const appVersion=html=>html.match(/const APP_VERSION='([^']+)'/)?.[1];
const appCache=html=>html.match(/const APP_CACHE='([^']+)'/)?.[1];
const manifestVersion=html=>{try{return JSON.parse(html).version;}catch{return null;}};
const cache=js=>js.match(/const CACHE="([^"]+)"/)?.[1];
const currentVersion=appVersion(app);
const currentCache=cache(worker);
assert(currentVersion,'APP_VERSION is present in the app shell');
assert(menuVersion(app)===currentVersion,'menu version label must match APP_VERSION');
assert(manifestVersion(manifest)===currentVersion,'manifest version must match APP_VERSION');
assert(app.match(/"softwareVersion":\s*"([^"]+)"/)?.[1]===currentVersion,'JSON-LD softwareVersion must match APP_VERSION');
assert(currentCache,'service worker cache id is present');
assert(appCache(app)===currentCache,'page and service worker must agree on the current cache id');
const changelog=fs.readFileSync(`${root}/CHANGELOG.md`,'utf8').split(/^(?=## )/m).find(s=>s.startsWith('## '))||'';
assert(changelog.startsWith(`## ${currentVersion} (`)&&changelog.includes(currentCache),'CHANGELOG.md must start with the current version and cache id');

let baseSha;
const pushBase=process.env.RELEASE_BASE_SHA?.trim();
if(pushBase){
  assert.match(pushBase,/^[0-9a-f]{40}$/i,'RELEASE_BASE_SHA must be a full commit SHA');
  const commit=spawnSync('git',['cat-file','-e',`${pushBase}^{commit}`],{cwd:root,encoding:'utf8'});
  assert.equal(commit.status,0,'RELEASE_BASE_SHA must be available in the full-history checkout');
  const ancestor=spawnSync('git',['merge-base','--is-ancestor',pushBase,'HEAD'],{cwd:root,encoding:'utf8'});
  assert.equal(ancestor.status,0,'RELEASE_BASE_SHA must be an ancestor of HEAD');
  baseSha=pushBase;
}else{
  const base=spawnSync('git',['merge-base','HEAD','origin/main'],{cwd:root,encoding:'utf8'});
  if(base.status!==0){
    if(process.env.GITHUB_ACTIONS)throw new Error('origin/main must be fetched to run the release version check');
    console.log(`SKIP: origin/main is unavailable; current release metadata is consistent for ${currentVersion} / ${currentCache}`);
    process.exit(0);
  }
  baseSha=base.stdout.trim();
}
console.log(`Release version comparison base: ${baseSha}`);
const changed=[...new Set([
  ...run('diff','--name-only',`${baseSha}...HEAD`).split('\n'),
  ...run('diff','--name-only').split('\n'),
  ...run('diff','--cached','--name-only').split('\n'),
  ...run('ls-files','--others','--exclude-standard').split('\n'),
].filter(Boolean))];
const appFiles=changed.filter(file=>file==='index.html'||file.startsWith('icons/')||file==='manifest.webmanifest'||file==='sw.js');
if(!appFiles.length){console.log(`PASS: release metadata is consistent for ${currentVersion} / ${currentCache}; no app resource changes require a version bump`);process.exit(0);}
const baseApp=run('show',`${baseSha}:index.html`);
const baseWorker=run('show',`${baseSha}:sw.js`);
assert(currentVersion!==appVersion(baseApp),'app, icon or manifest changes require a changed APP_VERSION');
assert(currentCache!==cache(baseWorker),'app, worker or cached asset changes require a changed service-worker cache id');
console.log(`PASS: release version ${currentVersion} and cache id ${currentCache} changed with app resources`);
