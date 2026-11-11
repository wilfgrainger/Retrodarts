import {test as base, expect} from '@playwright/test';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Tests never contact Google. Signed out and online, the app asks for Google sign-in before Start a match; with every
// Google host aborted it takes its "Google cannot be reached" path and offers Start a match, so tests can score.
// A test that needs Google stands it in with page.route, which takes precedence over these context routes.
export const blockGoogle=context=>context.route(url=>/googletagmanager\.com|google-analytics\.com|accounts\.google\.com|googleapis\.com/.test(url.href),route=>route.abort());
// The app's pages are served with the production Content-Security-Policy from _headers, and any violation fails the test.
const CSP=readFileSync(new URL('../../_headers',import.meta.url),'utf8').match(/^\/\*\n(?:[ \t]+.*\n)*?[ \t]+Content-Security-Policy: (.+)$/m)[1];
export const test=base.extend({context:async({context},use)=>{
  await blockGoogle(context);
  // Served from disk rather than route.fetch, which drops keep-alive connections to python's http.server under load.
  await context.route(url=>/^(127\.0\.0\.1|localhost)$/.test(url.hostname)&&/(\/|\.html)$/.test(url.pathname),route=>{
    const file=fileURLToPath(new URL(`../..${new URL(route.request().url()).pathname.replace(/\/$/,'/index.html')}`,import.meta.url));
    // _headers removes the header for /tv/, which carries its own policy in a meta tag.
    const headers={'cache-control':'no-cache',...(new URL(route.request().url()).pathname.startsWith('/tv/')?{}:{'content-security-policy':CSP})};
    return existsSync(file)?route.fulfill({path:file,contentType:'text/html',headers}):route.fallback();
  });
  const violations=[];
  await context.exposeBinding('__cspViolation',({page},v)=>{violations.push(`${page.url()}: ${v}`);});
  await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>window.__cspViolation(`${e.violatedDirective} ${e.blockedURI}`),true));
  await use(context);
  expect(violations,'Content-Security-Policy violations').toEqual([]);
}});
export {expect};

// Clicks inside #shade are ignored briefly after a dialog opens or closes. Retry until the click lands.
export async function tapDialogButton(button, landed) {
  await expect(async () => {
    if (await button.isVisible()) await button.click({timeout: 1000});
    await landed();
  }).toPass({timeout: 5000});
}

export async function startLiveMatch(page, path = '/', oneGame = false, teams = ['HOME', 'AWAY'], startScore = '301', options = {}) {
  // Navigate only when the page is not already on the app; works with '/' locally and on the live site.
  if (page.url() === 'about:blank' || (/^https?:/.test(path) && !page.url().startsWith(path))) await page.goto(path);
  if (await page.locator('#landing').isVisible().catch(() => false)) {
    await page.getByRole('button', {name: 'Start a match'}).click();
  }
  await expect(page.locator('#shade')).toBeHidden();
  await page.locator('#team0').fill(teams[0]);
  await page.locator('#team1').fill(teams[1]);
  const scoreToggle = page.locator('input[name="start-score"]');
  if (await scoreToggle.count()) await page.getByRole('radio',{name:startScore}).check();
  else await page.locator('#start-score').selectOption(startScore);
  if (oneGame) {
    await page.locator('#game-mode').selectOption('first');
    await page.locator('#game-count').selectOption(options.gameCount||'1');
    await page.locator('#leg-mode').selectOption('first');
    await page.locator('#leg-count').selectOption('1');
  } else {
    await page.locator('#game-mode').selectOption('all');
    await page.locator('#leg-mode').selectOption('best');
    await page.locator('#leg-count').selectOption('3');
  }
  await expect(page.locator('#local-status')).toBeHidden({timeout: 15000});
  await page.getByRole('button', {name: 'Start match'}).click();
  const starter = page.locator('.starter-pick button').first();
  await expect(starter).toBeVisible({timeout: 10000});
  const startGame = page.locator('#dialog-actions .primary');
  await expect(async () => {
    await starter.click({timeout: 1000});
    await expect(startGame).toBeEnabled({timeout: 300});
  }).toPass({timeout: 5000});
  await tapDialogButton(startGame, () => expect(page.locator('#shade')).toBeHidden({timeout: 300}));
  await expect(page.locator('#game')).toBeVisible();
  if (!options.keepFullscreen && await page.evaluate(() => !!document.fullscreenElement)) await page.evaluate(() => document.exitFullscreen());
  await page.evaluate(() => document.fonts.ready);
}
