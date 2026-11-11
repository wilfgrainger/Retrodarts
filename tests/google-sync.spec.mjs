import {test, expect, blockGoogle} from './helpers/test.mjs';

// Google sign-in behaviour with a stand-in for Google's library: counts token requests (each one is a brief Google popup
// on a real device) and serves an empty Drive. No real Google host is contacted.
const FAKE_GIS=`window.google={accounts:{oauth2:{initTokenClient:cfg=>({requestAccessToken:()=>{window.__tokenRequests=(window.__tokenRequests||0)+1;setTimeout(()=>cfg.callback({access_token:'test-token',expires_in:3600}),0);}}),revoke:()=>{}}}};`;
// Routes added after stubGoogle take precedence over its defaults.
async function stubGoogle(page){
  const drive={uploads:0,body:null,url:''};
  await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:FAKE_GIS}));
  await page.route(/https:\/\/www\.googleapis\.com\/oauth2\/v3\/userinfo/,r=>r.fulfill({contentType:'application/json',body:'{"email":"player@example.com","sub":"1"}'}));
  await page.route(/https:\/\/www\.googleapis\.com\/drive\/v3\/files\?/,r=>r.fulfill({contentType:'application/json',body:'{"files":[]}'}));
  await page.route(/https:\/\/www\.googleapis\.com\/upload\//,r=>{drive.uploads++;drive.body=r.request().postData();drive.url=r.request().url();return r.fulfill({contentType:'application/json',body:'{"id":"f1"}'});});
  return drive;
}
async function openSignedIn(page,{pending=false}={}){
  await page.addInitScript(p=>{localStorage.setItem('retro-darts-google-v1',JSON.stringify({email:'player@example.com',sub:'1',signedInAt:'2026-11-06T00:00:00Z',pending:p}));},pending);
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>!!window.google)).toBe(true);
}
async function signedInPage(page,options){const drive=await stubGoogle(page);await openSignedIn(page,options);return drive;}
const tokenRequests=page=>page.evaluate(()=>window.__tokenRequests||0);

test('opening the menu never asks Google for a token (no sign-in flash)', async ({page})=>{
  await signedInPage(page);
  for(let i=0;i<3;i++){await page.locator('#menu-toggle').click();await page.waitForTimeout(150);await page.keyboard.press('Escape');await page.waitForTimeout(150);}
  expect(await tokenRequests(page)).toBe(0);
  await expect(page.locator('#google-sync')).toContainText(/backed up to google drive/i);
});

test('Match history syncs with Drive once per session, not on every open', async ({page})=>{
  const drive=await signedInPage(page);
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await expect.poll(()=>drive.uploads).toBe(1);
  expect(await tokenRequests(page)).toBe(1);
  await page.waitForTimeout(600);
  await page.locator('#dialog-actions button').last().click();
  await expect(page.locator('#shade')).toBeHidden();
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await page.waitForTimeout(500);
  expect(await tokenRequests(page)).toBe(1);
  expect(drive.uploads).toBe(1);
});

test('a backup left waiting from an earlier session is sent at the next Start match', async ({page})=>{
  const drive=await signedInPage(page,{pending:true});
  await page.locator('#menu-toggle').click();await page.waitForTimeout(200);await page.keyboard.press('Escape');
  expect(await tokenRequests(page)).toBe(0);
  const start=page.getByRole('button',{name:'Start a match'});
  if(await start.isVisible().catch(()=>false))await start.click();
  await page.locator('#team0').fill('HOME');await page.locator('#team1').fill('AWAY');
  await page.evaluate(()=>{window.__fullscreenRequests=0;const f=document.documentElement.requestFullscreen;document.documentElement.requestFullscreen=function(){window.__fullscreenRequests++;return f.apply(this,arguments);};});
  await page.getByRole('button',{name:'Start match'}).click();
  await expect.poll(()=>drive.uploads).toBe(1);
  expect(await tokenRequests(page)).toBe(1);
  // The tap is spent on Google's sign-in window, so full screen is not requested this time.
  expect(await page.evaluate(()=>window.__fullscreenRequests)).toBe(0);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('retro-darts-google-v1')).pending)).toBe(false);
});

test('a renewed token from a different Google account backs nothing up', async ({page})=>{
  const drive=await stubGoogle(page);
  await page.route(/https:\/\/www\.googleapis\.com\/oauth2\/v3\/userinfo/,r=>r.fulfill({contentType:'application/json',body:'{"email":"other@example.com","sub":"2"}'}));
  await openSignedIn(page,{pending:true});
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await expect(page.locator('#toast')).toContainText('not the one signed in here');
  expect(drive.uploads).toBe(0);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('retro-darts-google-v1')).pending)).toBe(true);
});

test('signed in, Match history says it is backed up to Drive, not only on this device', async ({page})=>{
  await signedInPage(page);
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await expect(page.locator('#dialog-title')).toHaveText('Match history');
  await expect(page.locator('#dialog-kicker')).toHaveText('BACKED UP TO GOOGLE DRIVE');
  await expect(page.locator('#shade')).not.toContainText('not backed up');
  await expect(page.locator('#shade')).not.toContainText('Clearing browser data can remove them');
});

test('the menu account panel and front-screen note show the backup state', async ({page})=>{
  await signedInPage(page);
  await expect(page.locator('#google-sync')).toHaveAttribute('data-state','on');
  await expect(page.locator('#google-sync-sub')).toContainText('player@example.com');
  await expect(page.locator('#landing-note')).toContainText(/signed in as player@example\.com/i);
});

test('signed out on a device that signed in before, Start a match still opens setup', async ({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('retro-darts-device-v1','{"signedInAt":"2026-01-01T00:00:00.000Z","sub":"1"}');});
  await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await page.goto('/');
  await expect(page.locator('#google-sync')).toHaveAttribute('data-state','off');
  // Signing in is offered, never forced.
  await page.locator('#get-started').click();
  await expect(page.locator('#team0')).toBeVisible();
});

for(const [status,body] of [[500,'error'],[200,'null'],[200,'[]']])test(`a Drive backup that cannot be read is never overwritten (${status} ${body})`, async ({page})=>{
  const drive=await stubGoogle(page);
  await page.route(/https:\/\/www\.googleapis\.com\/drive\/v3\/files\?/,r=>r.fulfill({contentType:'application/json',body:'{"files":[{"id":"f1"}]}'}));
  await page.route(/https:\/\/www\.googleapis\.com\/drive\/v3\/files\/f1\?alt=media/,r=>r.fulfill({status,contentType:'application/json',body}));
  await openSignedIn(page);
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('retro-darts-google-v1')).pending)).toBe(true);
  await page.waitForTimeout(500);
  expect(drive.uploads).toBe(0);
});

test('a new device can still score when Google sign-in cannot be reached', async ({browser})=>{
  const context=await browser.newContext({storageState:{cookies:[],origins:[]}});
  await context.addInitScript(()=>{localStorage.setItem('retro-darts-consent-v1','{"analytics":"denied","at":"2026-01-01T00:00:00.000Z"}');});
  await blockGoogle(context);
  const page=await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Start a match'})).toBeVisible();
  await context.close();
});

test('settings: the cog opens Settings, and vibration and the default match are remembered', async ({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Open settings'}).click();
  await expect(page.locator('#app-menu')).toBeVisible();
  await expect(page.locator('#setting-keep-local')).toBeHidden();
  await page.locator('#open-game-settings').click();
  await expect(page.locator('#game-settings')).toBeVisible();
  await expect(page.locator('#open-game-settings')).toBeHidden();
  await expect(page.locator('#setting-vibration')).toHaveAttribute('aria-checked','true');
  await page.locator('#setting-vibration').click();
  await expect(page.locator('#setting-vibration')).toHaveAttribute('aria-checked','false');
  await expect(page.locator('#setting-checkout')).toHaveAttribute('aria-checked','true');
  await page.locator('#settings-back').click();
  await expect(page.locator('#open-game-settings')).toBeVisible();
  await page.locator('#settings-close').click();
  await expect(page.locator('#app-menu')).toBeHidden();
  await page.getByRole('button',{name:'Start a match'}).click();
  await page.locator('#team0').fill('KINGS');await page.locator('#team1').fill('QUEENS');
  await page.locator('input[name="start-score"][value="501"]').check({force:true});
  await page.getByRole('button',{name:'Start match'}).click();
  const st=await page.evaluate(()=>JSON.parse(localStorage.getItem('retro-darts-settings-v1')));
  expect(st.vibration).toBe(false);
  expect(st.defaults.teams).toEqual(['KINGS','QUEENS']);
  expect(st.defaults.settings.startScore).toBe(501);
});

test('a new device picks up settings from Drive and fills in the default match', async ({page})=>{
  const remote={version:1,theme:'modern',themeUpdatedAt:'2026-11-06T00:00:00Z',deleted:{},fixtures:{},settings:{vibration:false,keepLocal:true,defaults:{teams:['ROSE','CROWN'],settings:{startScore:501,gameMode:'best',gameCount:5,legMode:'best',legCount:3}},updatedAt:'2026-11-06T00:00:00Z'}};
  const drive=await stubGoogle(page);
  await page.route(/https:\/\/www\.googleapis\.com\/drive\/v3\/files\?/,r=>r.fulfill({contentType:'application/json',body:'{"files":[{"id":"f1"}]}'}));
  await page.route(/https:\/\/www\.googleapis\.com\/drive\/v3\/files\/f1\?alt=media/,r=>r.fulfill({contentType:'application/json',body:JSON.stringify(remote)}));
  // Keep matches on this device is about this device, so Drive's value never replaces it.
  await page.addInitScript(()=>localStorage.setItem('retro-darts-settings-v1',JSON.stringify({keepLocal:false,updatedAt:'2026-01-01T00:00:00Z'})));
  await openSignedIn(page);
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await expect.poll(()=>drive.body!==null).toBe(true);
  expect(drive.body).toContain('"defaults"');
  await page.waitForTimeout(600);
  await page.locator('#dialog-actions button').last().click();
  await expect(page.locator('#shade')).toBeHidden();
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#setting-vibration')).toHaveAttribute('aria-checked','false');
  await expect(page.locator('#theme-value')).toHaveText('Modern');
  await expect(page.locator('#defaults-note')).toContainText('ROSE v CROWN');
  await page.locator('#settings-close').click();
  await page.getByRole('button',{name:'Start a match'}).click();
  await expect(page.locator('#team0')).toHaveValue('ROSE');
  await expect(page.locator('#game-mode')).toHaveValue('best');
  await expect(page.locator('#game-count')).toHaveValue('5');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('retro-darts-settings-v1')).keepLocal)).toBe(false);
});

test('Keep matches on this device off: a match leaves the device once Drive has it, and history still lists it', async ({page})=>{
  const drive=await signedInPage(page);
  // Drive keeps what was uploaded, so the next sync finds the match there.
  let file=null;
  await page.route(/https:\/\/www\.googleapis\.com\/drive\/v3\/files\?/,r=>r.fulfill({contentType:'application/json',body:JSON.stringify({files:file?[{id:'f1'}]:[]})}));
  await page.route(/https:\/\/www\.googleapis\.com\/drive\/v3\/files\/f1\?alt=media/,r=>r.fulfill({contentType:'application/json',body:file}));
  await page.route(/https:\/\/www\.googleapis\.com\/upload\//,r=>{drive.uploads++;const parts=r.request().postData().split(/\r\n\r\n/);file=parts[2].split('\r\n--')[0];return r.fulfill({contentType:'application/json',body:'{"id":"f1"}'});});
  await page.evaluate(async()=>{
    localStorage.setItem('retro-darts-settings-v1',JSON.stringify({vibration:true,keepLocal:false,defaults:null,updatedAt:'2026-11-07T00:00:00Z'}));
    const db=await new Promise((res,rej)=>{const r=indexedDB.open('retro-darts-archive-v1',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('fixtures'))r.result.createObjectStore('fixtures',{keyPath:'id'});};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
    await new Promise((res,rej)=>{const tx=db.transaction('fixtures','readwrite');tx.objectStore('fixtures').put({id:'m1',version:1,archivedAt:'2026-11-07T09:00:00Z',owner:'1',fixture:{phase:'complete',teams:[{name:'ROSE',games:5},{name:'CROWN',games:3}],settings:{startScore:501},results:[],log:[],gameNumber:1}});tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});
    db.close();
  });
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await expect.poll(()=>drive.uploads).toBe(1);
  await expect(page.locator('#dialog-kicker')).toHaveText('IN YOUR GOOGLE DRIVE');
  await expect(page.locator('#dialog-content')).toContainText('ROSE 5–3 CROWN');
  const count=()=>page.evaluate(async()=>{const db=await new Promise(res=>{const r=indexedDB.open('retro-darts-archive-v1',1);r.onsuccess=()=>res(r.result);});const n=await new Promise(res=>{const q=db.transaction('fixtures').objectStore('fixtures').count();q.onsuccess=()=>res(q.result);});db.close();return n;});
  // The first upload is not yet proof: another device's upload at the same moment could replace it. The copy stays.
  expect(await count()).toBe(1);
  await page.waitForTimeout(600);
  await page.locator('#dialog-actions').getByRole('button',{name:'Back'}).click();
  await page.locator('#menu-toggle').click();
  await page.locator('#open-game-settings').click();
  await page.locator('#setting-checkout').click();
  await expect.poll(()=>drive.uploads,{timeout:8000}).toBe(2);
  await expect.poll(count).toBe(0);
});

const putRecord=(page,rec)=>page.evaluate(async rec=>{
  const db=await new Promise((res,rej)=>{const r=indexedDB.open('retro-darts-archive-v1',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('fixtures'))r.result.createObjectStore('fixtures',{keyPath:'id'});};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
  await new Promise((res,rej)=>{const tx=db.transaction('fixtures','readwrite');tx.objectStore('fixtures').put(rec);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});db.close();
},rec);
const record=(id,at,home,away,extra={})=>({id,version:1,archivedAt:at,...extra,fixture:{phase:'complete',teams:[{name:home,games:5},{name:away,games:3}],settings:{startScore:501,gameMode:'best',gameCount:8,legMode:'best',legCount:3},results:[],log:[],gameNumber:1}});

test('checkout hints: on by default the score box suggests a finish, and they can be turned off', async ({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Start a match'}).click();
  await page.locator('#team0').fill('HOME');await page.locator('#team1').fill('AWAY');
  await page.getByRole('button',{name:'Start match'}).click();
  const pick=page.locator('#dialog-content .starter-pick button').first();
  if(await pick.isVisible().catch(()=>false)){await page.waitForTimeout(500);await pick.click();await page.locator('#dialog-actions .primary').click();}
  for(const k of '140')await page.locator(`.keypad [data-key="${k}"]`).click();
  await page.locator('#enter-score').click();
  for(const k of '100')await page.locator(`.keypad [data-key="${k}"]`).click();
  await page.locator('#enter-score').click();
  await expect(page.locator('#preview')).toHaveText('Finish T20 T17 Bull');
  await page.locator('#menu-toggle').click();
  await page.locator('#open-game-settings').click();
  await page.locator('#setting-checkout').click();
  await expect(page.locator('#setting-checkout')).toHaveAttribute('aria-checked','false');
  await page.keyboard.press('Escape');
  await expect(page.locator('#preview')).toHaveText('Enter score');
});

test('Share result sends a readable match card from Match history', async ({page})=>{
  await page.addInitScript(()=>{navigator.share=async d=>{window.__shared=d;};});
  await page.goto('/');
  await putRecord(page,record('m1','2026-11-07T21:00:00Z','ROSE','CROWN'));
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await expect(page.locator('#dialog-content summary').first()).toBeVisible();
  await page.waitForTimeout(600);
  await page.locator('#dialog-content summary').first().click();
  await page.getByRole('button',{name:'Share result'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__shared&&window.__shared.text)).toContain('ROSE 5–3 CROWN');
  const text=await page.evaluate(()=>window.__shared.text);
  expect(text).toContain('ROSE wins the match');
  expect(text).toContain('retrodarts.com');
});

test('Match history lists matches newest first', async ({page})=>{
  await page.goto('/');
  await putRecord(page,record('zzz','2026-10-01T20:00:00Z','OLD','MATCH'));
  await putRecord(page,record('aaa','2026-11-07T20:00:00Z','NEW','MATCH'));
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await expect(page.locator('#dialog-content .archive-title').first()).toContainText('NEW');
});

test('two Drive backups made at once are merged into one and nothing is lost', async ({page})=>{
  const a={version:1,deleted:{},fixtures:{m1:record('m1','2026-11-07T20:00:00Z','ROSE','CROWN')}},b={version:1,deleted:{},fixtures:{m2:record('m2','2026-11-07T21:00:00Z','KINGS','QUEENS')}};
  const deleted=[];
  const drive=await stubGoogle(page);
  await page.route(/https:\/\/www\.googleapis\.com\/drive\/v3\/files/,r=>{
    const u=r.request().url();
    if(r.request().method()==='DELETE'){deleted.push(u);return r.fulfill({status:204,body:''});}
    if(/files\/f1\?alt=media/.test(u))return r.fulfill({contentType:'application/json',body:JSON.stringify(a)});
    if(/files\/f2\?alt=media/.test(u))return r.fulfill({contentType:'application/json',body:JSON.stringify(b)});
    return r.fulfill({contentType:'application/json',body:'{"files":[{"id":"f1"},{"id":"f2"}]}'});
  });
  await openSignedIn(page);
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await expect.poll(()=>deleted.length).toBe(1);
  expect(drive.url).toContain('/files/f1');
  expect(drive.body).toContain('"m1"');expect(drive.body).toContain('"m2"');
  expect(deleted[0]).toContain('/files/f2');
});

test('a change made while a backup is running stays waiting and is sent next', async ({page})=>{
  let release;const gate=new Promise(r=>{release=r;});
  const drive=await stubGoogle(page);
  await page.route(/https:\/\/www\.googleapis\.com\/drive\/v3\/files\?/,async r=>{if(drive.uploads===0)await gate;return r.fulfill({contentType:'application/json',body:'{"files":[]}'});});
  await openSignedIn(page);
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await page.waitForTimeout(700);
  await page.locator('#dialog-actions button').last().click();
  await page.locator('#menu-toggle').click();
  await page.locator('#open-game-settings').click();
  await page.locator('#setting-checkout').click();
  release();
  await expect.poll(()=>drive.uploads,{timeout:8000}).toBe(2);
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('retro-darts-google-v1')).pending)).toBe(false);
});

test('signing in with a different Google account does not send the first account\'s matches or signed-out ones', async ({page})=>{
  const drive=await stubGoogle(page);
  await page.route(/https:\/\/www\.googleapis\.com\/oauth2\/v3\/userinfo/,r=>r.fulfill({contentType:'application/json',body:'{"email":"other@example.com","sub":"2"}'}));
  await page.addInitScript(()=>{if(!localStorage.getItem('retro-darts-device-v1'))localStorage.setItem('retro-darts-device-v1',JSON.stringify({signedInAt:'2026-11-01T00:00:00Z',sub:'1'}));});
  await page.goto('/');
  await putRecord(page,record('a1','2026-11-05T20:00:00Z','FIRST','ACCOUNT',{owner:'1'}));
  await putRecord(page,record('n1','2026-11-06T20:00:00Z','SIGNED','OUT'));
  await page.locator('#menu-toggle').click();
  await page.locator('#google-sync').click();
  await expect.poll(()=>page.evaluate(()=>!!window.google)).toBe(true);
  await page.waitForTimeout(600);
  await page.locator('#dialog-actions').getByRole('button',{name:'Sign in with Google'}).click();
  await expect.poll(()=>drive.body!==null).toBe(true);
  expect(drive.body).not.toContain('"n1"');
  expect(drive.body).not.toContain('"a1"');
});

test('unticking Drive access on Google\'s consent screen does not leave a false backed-up account', async ({page})=>{
  let uploads=0;
  await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:FAKE_GIS.replace('revoke:()=>{}','revoke:()=>{},hasGrantedAllScopes:()=>false')}));
  await page.route(/https:\/\/www\.googleapis\.com\//,r=>{uploads++;return r.fulfill({contentType:'application/json',body:'{}'});});
  await page.goto('/');
  await page.locator('#menu-toggle').click();
  await page.locator('#google-sync').click();
  await expect.poll(()=>page.evaluate(()=>!!window.google)).toBe(true);
  await page.waitForTimeout(600);
  await page.locator('#dialog-actions').getByRole('button',{name:'Sign in with Google'}).click();
  await expect(page.getByText(/tick the Drive box/)).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('retro-darts-google-v1'))).toBeNull();
  expect(uploads).toBe(0);
});

test('Match history on a shared device lists only the signed-in account\'s matches', async ({page})=>{
  await signedInPage(page);
  await putRecord(page,record('mine','2026-11-05T20:00:00Z','OUR','TEAM',{owner:'1'}));
  await putRecord(page,record('theirs','2026-11-06T20:00:00Z','OTHER','ACCOUNT',{owner:'2'}));
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await expect(page.locator('#shade')).toContainText('OUR');
  await expect(page.locator('#shade')).not.toContainText('OTHER');
});

test('signed out, Match history shows only this device\'s matches, and Escape closes it', async ({page})=>{
  await page.goto('/');
  await putRecord(page,record('o1','2026-11-07T21:00:00Z','ROSE','CROWN',{owner:'1'}));
  await putRecord(page,record('d1','2026-11-07T20:00:00Z','KINGS','QUEENS'));
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await expect(page.locator('#dialog-content')).toContainText('KINGS');
  await expect(page.locator('#dialog-content')).not.toContainText('ROSE');
  await page.waitForTimeout(600);
  await page.locator('#dialog-content summary').first().click();
  await page.getByRole('button',{name:'Delete match',exact:true}).click();
  await expect(page.locator('#dialog-copy')).toContainText('not in any Google Drive backup');
  await page.waitForTimeout(600);
  await page.getByRole('button',{name:'Delete match',exact:true}).click();
  await expect(page.locator('#dialog-content')).not.toContainText('KINGS');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('retro-darts-deleted-v1')||'{}'))).not.toHaveProperty('d1');
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  await expect(page.locator('#shade')).toBeHidden();
});

test('signing out while Drive is being read writes nothing to this device and backs nothing up', async ({page})=>{
  let release,reading;const gate=new Promise(r=>{release=r;}),started=new Promise(r=>{reading=r;});
  const remote={version:1,deleted:{},settings:null,fixtures:{r1:record('r1','2026-11-07T20:00:00Z','DRIVE','ONLY',{owner:'1'})}};
  const drive=await stubGoogle(page);
  await page.route(/https:\/\/www\.googleapis\.com\/drive\/v3\/files\?/,r=>r.fulfill({contentType:'application/json',body:'{"files":[{"id":"f1"}]}'}));
  await page.route(/https:\/\/www\.googleapis\.com\/drive\/v3\/files\/f1\?alt=media/,async r=>{reading();await gate;return r.fulfill({contentType:'application/json',body:JSON.stringify(remote)});});
  await openSignedIn(page);
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await started;
  await page.evaluate(()=>localStorage.removeItem('retro-darts-google-v1'));
  const done=page.waitForResponse(/alt=media/);release();await done;
  await page.waitForTimeout(500);// shortcut: the stopped sync leaves no signal to wait for; replace if it ever reports
  expect(await page.evaluate(()=>localStorage.getItem('retro-darts-deleted-v1'))).toBeNull();
  const ids=await page.evaluate(async()=>{const db=await new Promise(res=>{const r=indexedDB.open('retro-darts-archive-v1',1);r.onsuccess=()=>res(r.result);});const all=await new Promise(res=>{const q=db.transaction('fixtures').objectStore('fixtures').getAllKeys();q.onsuccess=()=>res(q.result);});db.close();return all;});
  expect(ids).not.toContain('r1');
  expect(drive.uploads).toBe(0);
});

test('a device that saved checkout hints off before 1.4.7 has them turned on once', async ({page})=>{
  await page.addInitScript(()=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('retro-darts-settings-v1',JSON.stringify({checkout:false,updatedAt:'2026-11-01T00:00:00Z'}));}});
  await page.goto('/');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('retro-darts-settings-v1')).checkout)).toBe(true);
  await page.evaluate(()=>localStorage.setItem('retro-darts-settings-v1',JSON.stringify({checkout:false,updatedAt:'2026-11-09T00:00:00Z'})));
  await page.reload();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('retro-darts-settings-v1')).checkout)).toBe(false);
});

test('a tap on the dimmed page behind Settings closes it and presses nothing underneath', async ({page})=>{
  await page.goto('/');
  const start=await page.locator('#get-started').boundingBox();
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#app-menu')).toBeVisible();
  const menu=await page.locator('#app-menu').boundingBox();
  const x=start.x+start.width/2,y=start.y+start.height/2;
  // Only meaningful when the button is outside the panel; on this viewport it sits below it.
  expect(y>menu.y+menu.height||x<menu.x).toBe(true);
  await page.mouse.click(x,y);
  await expect(page.locator('#app-menu')).toBeHidden();
  await expect(page.locator('#landing')).toBeVisible();
  await expect(page.locator('#setup')).toBeHidden();
});

test('Delete matches: tick several, confirm once, and only those are deleted', async ({page})=>{
  await page.goto('/');
  for(const [id,at,h,a] of [['k1','2026-11-05T20:00:00Z','KEEP','ME'],['d1','2026-11-06T20:00:00Z','GONE','ONE'],['d2','2026-11-07T20:00:00Z','GONE','TWO']])await putRecord(page,record(id,at,h,a));
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await expect(page.locator('#dialog-content')).toContainText('KEEP');
  await page.waitForTimeout(600);
  await page.getByRole('button',{name:'Delete matches'}).click();
  await expect(page.locator('#dialog-title')).toHaveText('Delete matches');
  const go=page.locator('#dialog-actions .delete-go');
  await expect(go).toBeDisabled();
  await page.waitForTimeout(600);
  await page.getByRole('checkbox',{name:/GONE 5–3 ONE/}).check();
  await page.getByRole('checkbox',{name:/GONE 5–3 TWO/}).check();
  await expect(go).toHaveText('Delete 2 matches');
  await expect(page.getByRole('checkbox',{name:'Select all'})).not.toBeChecked();
  await page.waitForTimeout(600);
  await go.click();
  await expect(page.locator('#dialog-title')).toHaveText('Delete 2 matches?');
  await expect(page.locator('#dialog-copy')).toHaveText('This deletes them from this device.');
  await page.waitForTimeout(600);
  await page.locator('#dialog-actions').getByRole('button',{name:'Delete',exact:true}).click();
  await expect(page.locator('#dialog-title')).toHaveText('Match history');
  await expect(page.locator('#dialog-content')).toContainText('KEEP');
  await expect(page.locator('#dialog-content')).not.toContainText('GONE');
  await expect(page.locator('#toast')).toContainText('2 matches deleted');
});

test('Delete matches: Select all ticks every match, and Keep matches deletes nothing', async ({page})=>{
  await page.goto('/');
  for(const [id,at] of [['a1','2026-11-05T20:00:00Z'],['a2','2026-11-06T20:00:00Z']])await putRecord(page,record(id,at,'ROSE','CROWN'));
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
  await page.waitForTimeout(600);
  await page.getByRole('button',{name:'Delete matches'}).click();
  await page.waitForTimeout(600);
  await page.getByRole('checkbox',{name:'Select all'}).check();
  await expect(page.locator('#dialog-actions .delete-go')).toHaveText('Delete 2 matches');
  await page.waitForTimeout(600);
  await page.locator('#dialog-actions .delete-go').click();
  await page.waitForTimeout(600);
  await page.getByRole('button',{name:'Keep matches'}).click();
  await expect(page.locator('#dialog-title')).toHaveText('Delete matches');
  await page.keyboard.press('Escape');
  await expect(page.locator('#dialog-title')).toHaveText('Match history');
  await expect(page.locator('#dialog-content details')).toHaveCount(2);
});
