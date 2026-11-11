'use strict';
// Prints the sha256 hashes of every distinct inline <script> in the app and the static pages, in the form the CSP header expects.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const files=['index.html','faq/index.html','privacy/index.html','404.html'];
const seen=new Set();
for(const f of files){
  const html=fs.readFileSync(path.join(root,f),'utf8');
  for(const m of html.matchAll(/<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g))seen.add("'sha256-"+crypto.createHash('sha256').update(m[1],'utf8').digest('base64')+"'");
}
const hashes=[...seen];
if(require.main===module)console.log(hashes.join(' '));
module.exports={hashes};
