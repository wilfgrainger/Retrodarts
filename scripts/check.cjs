'use strict';
const {spawnSync}=require('node:child_process');
const {resolve}=require('node:path');
const checks=[['tests/scorer.cjs'],['tests/fuzz.cjs','100','1'],['tests/reports.cjs'],['tests/offline.cjs'],['--test','tests/persistence.test.mjs'],['tests/fonts.cjs'],['tests/distribution.cjs'],['tests/pages-artifact.cjs'],['tests/release-version.cjs'],['tests/seo.cjs'],['tests/sync.cjs'],['scripts/write-headers.cjs','--check'],['tests/viewports.cjs']];
for(const args of checks){
  console.log(`\n> node ${args.join(' ')}`);
  const result=spawnSync(process.execPath,args,{cwd:resolve(__dirname,'..'),stdio:'inherit'});
  if(result.error){console.error(result.error.message);process.exit(1);}
  if(result.status!==0)process.exit(result.status||1);
}
console.log('\nAll repository checks passed.');
