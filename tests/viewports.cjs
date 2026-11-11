'use strict';
const {spawnSync}=require('node:child_process');
const {existsSync,unlinkSync,writeFileSync}=require('node:fs');
const {resolve}=require('node:path');

if(process.env.SKIP_VIEWPORT_TESTS==='1'){
  console.log('SKIP_VIEWPORT_TESTS=1: skipping Playwright viewport checks');
  process.exit(0);
}

const root=resolve(__dirname,'..');
const playwrightVersion='1.64.1';
const bin=resolve(root,'node_modules/.bin/playwright');
const pkg=resolve(root,'package.json');
const installed=resolve(root,'node_modules/@playwright/test/package.json');

function run(command,args){
  const result=spawnSync(command,args,{cwd:root,stdio:'inherit',env:process.env});
  if(result.error){console.error(result.error.message);process.exit(1);}
  if(result.status!==0)process.exit(result.status||1);
}

// npx keeps the package outside this repo, so the config and spec cannot import it.
const versionOk=existsSync(installed)&&require(installed).version===playwrightVersion;
if(!versionOk){
  const createdPkg=!existsSync(pkg);
  if(createdPkg)writeFileSync(pkg,'{"private":true}\n');
  console.log(`\n> npm install --no-save @playwright/test@${playwrightVersion}`);
  try{
    run('npm',['install','--no-save','--no-package-lock','--ignore-scripts',`@playwright/test@${playwrightVersion}`]);
  }finally{
    if(createdPkg&&existsSync(pkg))unlinkSync(pkg);
  }
}

console.log('\n> playwright install chromium');
run(bin,['install','chromium']);

console.log('\n> playwright test -c tests/playwright.config.mjs');
run(bin,['test','-c','tests/playwright.config.mjs']);

console.log('PASS: viewport layout checks');
