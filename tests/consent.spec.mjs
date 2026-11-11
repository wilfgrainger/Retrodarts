import {test, expect} from './helpers/test.mjs';

// Consent and Google sign-in invariants. Google is never contacted in tests: every request to a Google host is recorded and aborted.
test.use({storageState: {cookies: [], origins: []}});
const GOOGLE=/googletagmanager\.com|google-analytics\.com|analytics\.google\.com|accounts\.google\.com|googleapis\.com/;
// stubGis serves an empty stand-in for Google's sign-in script (no Google host is contacted), as when Google is reachable.
async function open(page,{stubGis=false}={}){
  const calls=[];
  await page.route(url=>GOOGLE.test(url.href),route=>{const u=route.request().url();calls.push(u);if(stubGis&&u.startsWith('https://accounts.google.com/gsi/client'))return route.fulfill({contentType:'text/javascript',body:''});return route.abort();});
  await page.goto('/');
  return calls;
}

test('analytics never loads before consent, and Reject keeps it off after a reload', async ({page})=>{
  const calls=await open(page);
  const banner=page.locator('#consent-banner');
  await expect(banner).toBeVisible();
  // Both choices carry the same weight and are proper touch targets.
  const sizes=await page.evaluate(()=>['#consent-accept','#consent-reject'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [Math.round(r.height),getComputedStyle(document.querySelector(s)).backgroundColor];}));
  expect(sizes[0][0]).toBeGreaterThanOrEqual(44);expect(sizes[1][0]).toBeGreaterThanOrEqual(44);
  expect(sizes[0][1]).toBe(sizes[1][1]);
  expect(calls.filter(u=>/googletagmanager|analytics/.test(u))).toEqual([]);
  await page.locator('#consent-reject').click();
  await expect(banner).toBeHidden();
  await page.reload({waitUntil:'networkidle'});
  await expect(banner).toBeHidden();
  expect(calls.filter(u=>/googletagmanager|analytics/.test(u))).toEqual([]);
});

test('Accept loads Google Analytics, and Cookie settings reopens the choice', async ({page})=>{
  const calls=await open(page);
  await page.locator('#consent-accept').click();
  await expect(page.locator('#consent-banner')).toBeHidden();
  await expect.poll(()=>calls.some(u=>u.includes('googletagmanager.com/gtag/js?id=G-'))).toBe(true);
  await page.locator('#menu-toggle').click();
  await page.locator('#cookie-settings').click();
  await expect(page.locator('#consent-banner')).toBeVisible();
});

test('first visit: Start a match is the only button, and no Google sign-in code loads until it is asked for', async ({page})=>{
  const calls=await open(page,{stubGis:true});
  await page.locator('#consent-reject').click();
  await expect(page.locator('#landing button:visible')).toHaveCount(1);
  await expect(page.locator('#get-started')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(calls.filter(u=>u.includes('accounts.google.com/gsi/client'))).toEqual([]);
});

test('a device that has never signed in can still score with no signal', async ({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,'onLine',{get:()=>false});});
  await open(page);
  await page.locator('#consent-reject').click();
  await expect(page.locator('#get-started')).toBeVisible();
  await page.locator('#get-started').click();
  await expect(page.locator('#team0')).toBeVisible();
});
