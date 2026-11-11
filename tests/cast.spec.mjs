import {test, expect, startLiveMatch} from './helpers/test.mjs';

// Cast to TV with a stand-in for Google's Cast library: it records what the scorer would send to the TV.
const FAKE_CAST=`(()=>{let session=null;const listeners=[],sent=window.__cast={msgs:[],requests:0};
window.chrome=window.chrome||{};window.chrome.cast={AutoJoinPolicy:{ORIGIN_SCOPED:'origin'}};
const ctx={setOptions(o){sent.options=o;},addEventListener(t,f){listeners.push(f);},removeEventListener(){},getCurrentSession:()=>session,
  getCastState:()=>window.__castState||'NOT_CONNECTED',
  requestSession:async()=>{sent.requests++;session={sendMessage:async(ns,m)=>{sent.msgs.push([ns,m]);}};listeners.forEach(f=>f());},
  endCurrentSession(){session=null;listeners.forEach(f=>f());}};
window.cast={framework:{CastContextEventType:{SESSION_STATE_CHANGED:'changed',CAST_STATE_CHANGED:'state'},CastContext:{getInstance:()=>ctx}}};
window.__onGCastApiAvailable(true);})();`;
const last=page=>page.evaluate(()=>{const m=window.__cast&&window.__cast.msgs;return m&&m.length?m[m.length-1]:null;});

test('Cast to TV sends the scoreboard as small messages, one per change', async ({page})=>{
  await page.route(/gstatic\.com\/cv\/js\/sender/,r=>r.fulfill({contentType:'text/javascript',body:FAKE_CAST}));
  await startLiveMatch(page,'/',false,['WHEATSHEAF B','GEORGE AND DRAGON'],'301');
  expect(await page.evaluate(()=>!!window.cast)).toBe(false);// nothing from Google loads until Cast to TV is tapped
  // The header icon is the quickest way in; it shows only where Chrome's Cast is available.
  await page.evaluate(()=>{document.getElementById('cast-toggle').hidden=false;});
  await page.locator('#cast-toggle').click();
  await expect.poll(()=>last(page)).not.toBeNull();
  let [ns,m]=await last(page);
  expect(ns).toBe('urn:x-cast:com.retrodarts.score');
  expect(m.playing).toBe(true);
  expect(m.teams.map(t=>t.name)).toEqual(['WHEATSHEAF B','GEORGE AND DRAGON']);
  expect(m.teams.map(t=>t.left)).toEqual(['301','301']);
  expect(m.teams.filter(t=>t.on).length).toBe(1);
  expect(JSON.stringify(m).length).toBeLessThan(1000);
  const before=await page.evaluate(()=>window.__cast.msgs.length);
  for(const d of '100')await page.locator(`.keypad [data-key="${d}"]`).click();
  await page.locator('#enter-score').click();
  await expect.poll(async()=>(await last(page))[1].teams.map(t=>t.left).sort()).toEqual(['201','301']);
  // One visit is one or two messages, never a stream.
  expect(await page.evaluate(()=>window.__cast.msgs.length)-before).toBeLessThanOrEqual(2);
  await expect(page.locator('#cast-toggle')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#cast-toggle')).toHaveAttribute('aria-label','Stop casting');
});

test('the TV page draws what it is sent, treats names as text and fits a 720p TV', async ({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/tv/?demo=static');
  await page.evaluate(()=>window.drawScore({theme:'modern',playing:true,format:'Best of 8 games',pos:'Game 3 · Leg 2',banner:'',teams:[
    {name:'<img src=x onerror=window.__xss=1> A VERY LONG TEAM NAME INDEED',games:'1',left:'132',last:'140',legs:'1',avg:'100.3',on:true},
    {name:'GEORGE AND DRAGON',games:'1',left:'301',last:'101',legs:'2',avg:'61.3',on:false}]}));
  await expect(page.locator('#left0')).toHaveText('132');
  await expect(page.locator('#games')).toHaveText('1-1');
  await expect(page.locator('#name0')).toContainText('<img');
  await expect(page.locator('#c0')).toHaveClass(/on/);
  expect(await page.evaluate(()=>window.__xss)).toBeUndefined();
  expect(await page.evaluate(()=>document.documentElement.getAttribute('data-theme'))).toBe('modern');
  const overflow=await page.evaluate(()=>[document.documentElement.scrollWidth>innerWidth,document.documentElement.scrollHeight>innerHeight,...[...document.querySelectorAll('.card')].map(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1)]);
  expect(overflow).toEqual([false,false,false,false]);
  // A message that is not a scoreboard is ignored.
  await page.evaluate(()=>window.drawScore({teams:'nope'}));
  await expect(page.locator('#left0')).toHaveText('132');
});

test('with no TV that can show the scoreboard, Cast to TV says so and does not open Chrome\'s empty Cast panel', async ({page})=>{
  await page.route(/gstatic\.com\/cv\/js\/sender/,r=>r.fulfill({contentType:'text/javascript',body:'window.__castState="NO_DEVICES_AVAILABLE";'+FAKE_CAST}));
  await startLiveMatch(page,'/',false,['HOME','AWAY'],'301');
  await page.evaluate(()=>{document.getElementById('cast-toggle').hidden=false;});
  await page.locator('#cast-toggle').click();
  await expect(page.locator('#toast')).toContainText('No TV found',{timeout:6000});
  expect(await page.evaluate(()=>window.__cast.requests)).toBe(0);
});
