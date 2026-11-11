import {test, expect, startLiveMatch, blockGoogle} from './helpers/test.mjs';

// v0.2.24 behaviour checks: theme- and layout-agnostic.
const key=(page,d)=>page.locator(`.keypad [data-key="${d}"]`).click();

test('keypad taps made immediately after a dialog closes are never dropped', async ({page})=>{
  await startLiveMatch(page);
  // No waiting: the scorer types straight after Start game.
  for(const d of '140') await key(page,d);
  await expect(page.locator('#draft')).toHaveText('140');
  await page.locator('#enter-score').click();
  await expect(page.locator('#last0')).toHaveText('140');
});

test('a bust shows as BST in the last-five strip, distinct from a zero visit', async ({page})=>{
  await startLiveMatch(page);
  for(const s of ['180','45']){for(const d of s)await key(page,d);await page.locator('#enter-score').click();}
  // Home has 121 left and throws again; 140 is an overscore, so it busts.
  for(const d of '140') await key(page,d);
  await page.locator('#enter-score').click();
  const bust=page.locator('#history0 span.is-bust');
  await expect(bust).toHaveCount(1);
  await expect(bust).toHaveText('BST');
  await expect(bust).toHaveAttribute('aria-label','Bust');
  // NO SCORE records a genuine zero, which must not be marked as a bust.
  await page.locator('#no-score').click();
  const zero=page.locator('#history1 span').last();
  await expect(zero).toHaveText('0');
  await expect(zero).not.toHaveClass(/is-bust/);
});

test('a toast never covers an open dialog, and dialogs cover the header controls', async ({page})=>{
  await startLiveMatch(page);
  for(const d of '181') await key(page,d);
  await page.locator('#enter-score').click();
  await page.locator('#open-history0').click();
  await expect(page.locator('#shade')).toBeVisible();
  const z=await page.evaluate(()=>{const n=s=>parseInt(getComputedStyle(document.querySelector(s)).zIndex)||0;return {shade:n('#shade'),toast:n('.toast'),menu:n('#menu-toggle')};});
  expect(z.shade).toBeGreaterThan(z.toast);
  expect(z.shade).toBeGreaterThan(z.menu);
});


// Ghost taps: a fast double-tap on a dialog button must not let the second tap fall through to the
// control that sits under the same spot once the dialog closes (NO SCORE, VIEW ALL, a key...).
async function doubleTapDialogPrimary(page){
  const go=page.locator('#dialog-actions .primary');
  await expect(go).toBeEnabled();
  const box=await go.boundingBox();
  const x=box.x+box.width/2,y=box.y+box.height/2;
  // Same point, back to back, as a real finger double-tap.
  await page.mouse.click(x,y);
  await page.mouse.click(x,y);
  return {x,y};
}
const scoreboardSnapshot=page=>page.evaluate(()=>({
  last:[0,1].map(i=>document.querySelector('#last'+i)?.textContent),
  history:[0,1].map(i=>document.querySelector('#history'+i)?.textContent),
  remaining:[0,1].map(i=>document.querySelector('#remaining'+i)?.textContent),
  draft:document.querySelector('#draft')?.textContent,
}));

for(const vp of [{width:360,height:640},{width:1333,height:800}]){
  test(`double-tapping Start game 1 and Next leg never records a visit or opens history (${vp.width}x${vp.height})`, async ({page})=>{
    await page.setViewportSize(vp);
    await page.goto('/');
    const start=page.getByRole('button',{name:'Start a match'});
    if(await start.isVisible().catch(()=>false)) await start.click();
    await page.locator('#team0').fill('HOME TEAM');
    await page.locator('#team1').fill('AWAY TEAM');
    await page.getByRole('button',{name:'Start match'}).click();
    await expect(async()=>{await page.locator('.starter-pick button').first().click({timeout:1000});await expect(page.locator('#dialog-actions .primary')).toBeEnabled({timeout:300});}).toPass({timeout:10000});
    // Wait out the opening guard so the double-tap is what is tested.
    await page.waitForTimeout(500);
    const before=await scoreboardSnapshot(page);
    const pt=await doubleTapDialogPrimary(page);
    await expect(page.locator('#shade')).toBeHidden();
    // The spot must really sit over a scoreboard control, or this test proves nothing.
    expect(await page.evaluate(({x,y})=>!!document.elementFromPoint(x,y)?.closest('#game'),pt)).toBe(true);
    await page.waitForTimeout(150);
    expect(await scoreboardSnapshot(page)).toEqual(before);
    await expect(page.locator('#shade')).toBeHidden();

    // Taps away from the closing tap are never held (covered by the existing quick-keypad test); here the
    // deliberate scoring starts once the 450ms ghost window has passed, because on a phone the keypad sits
    // right under the dialog button that was double-tapped.
    await page.waitForTimeout(500);
    await page.locator('.keypad [data-key="1"]').click();
    await page.locator('.keypad [data-key="8"]').click();
    await page.locator('.keypad [data-key="0"]').click();
    await page.locator('#enter-score').click();
    await page.locator('.keypad [data-key="0"]').click();
    await page.locator('#enter-score').click();
    for(const d of '121') await page.locator(`.keypad [data-key="${d}"]`).click();
    await page.locator('#enter-score').click();
    await expect(page.locator('#shade')).toBeVisible();
    await expect(page.locator('#dialog-kicker')).toHaveText(/LEG COMPLETE/i);
    await page.waitForTimeout(500);
    const legBefore=await scoreboardSnapshot(page);
    await doubleTapDialogPrimary(page);
    await page.waitForTimeout(150);
    // Next leg resets the board; whatever follows, the ghost half of the tap must not add a visit.
    const after=await scoreboardSnapshot(page);
    if(await page.locator('#shade').isHidden()){
      expect(after.history.join('')).not.toMatch(/\d/);
      expect(after.draft).not.toMatch(/\d/);
    }else{
      await expect(page.locator('#dialog-kicker')).not.toHaveText(/HISTORY|VISIT/i);
    }
    expect(legBefore.remaining).not.toEqual(after.remaining);
  });
}

test('only the total that just changed bounces; the other total stays still', async ({page})=>{
  await startLiveMatch(page);
  const running=()=>page.evaluate(()=>[0,1].map(i=>document.getElementById('remaining'+i).getAnimations().filter(a=>a.animationName==='score-land'&&a.playState!=='finished').length));
  for(const [side,score] of [[0,'100'],[1,'60'],[0,'45'],[1,'81']]){
    for(const d of score) await key(page,d);
    await page.locator('#enter-score').click();
    await expect(page.locator(`#last${side}`)).toHaveText(score);
    const r=await running();
    expect(r[side],`visit ${score}: the scorer's total bounces`).toBe(1);
    expect(r[1-side],`visit ${score}: the other total does not`).toBe(0);
    await expect(async()=>{expect(await running()).toEqual([0,0]);}).toPass({timeout:3000});
    await expect(page.locator('#game .cards .remaining.flash')).toHaveCount(0);
  }
});

test('401 is a starting score: it plays, survives a reload and is remembered as the default', async ({page})=>{
  await startLiveMatch(page,'/',false,['HOME','AWAY'],'401');
  await expect(page.locator('#remaining0')).toHaveText('401');
  for(const d of '100')await page.locator(`.keypad [data-key="${d}"]`).click();
  await page.locator('#enter-score').click();
  await expect(page.locator('#remaining0,#remaining1').filter({hasText:'301'})).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#game')).toBeVisible();
  await expect(page.locator('#restore-warning')).toBeHidden();
  await expect(page.locator('#remaining0,#remaining1').filter({hasText:'301'})).toHaveCount(1);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('retro-darts-settings-v1')).defaults.settings.startScore)).toBe(401);
});

test('scoring: Submit is bottom-right and Undo is away from 0; a 180 is called; a leg win names the checkout', async ({page})=>{
  await page.setViewportSize({width:412,height:915});
  await startLiveMatch(page,'/',false,['HOME','AWAY'],'301');
  const pos=await page.evaluate(()=>{const R=s=>document.querySelector(s).getBoundingClientRect();const z=R('.keypad [data-key="0"]'),s=R('#enter-score'),u=R('#undo');return {submitRightOf0:s.left>=z.right-1&&Math.abs(s.top-z.top)<2,undoRowAbove0:u.bottom<=z.top};});
  expect(pos).toEqual({submitRightOf0:true,undoRowAbove0:true});
  // Keys are ignored while the previous visit saves, so pause between visits as a person would.
  const visit=async n=>{for(const d of String(n))await page.locator(`.keypad [data-key="${d}"]`).click();await page.locator('#enter-score').click();await page.waitForTimeout(150);};
  await visit(180);
  await expect(page.locator('#toast')).toContainText('One hundred and eighty!');
  await expect(page.locator('#toast .toast-digits')).toHaveText('180');
  // The call clears itself; it must never linger over the next team's entry.
  await expect(page.locator('#toast')).toBeHidden({timeout:4000});
  await visit(60);
  await visit(121);
  await expect(page.locator('#dialog-kicker')).toHaveText('LEG COMPLETE');
  await expect(page.locator('#dialog-copy')).toHaveText('121 checkout!');
});

test('a phone on its side is asked to turn upright; portrait and desktop are not', async ({browser,baseURL}) => {
  const ctx=await browser.newContext({baseURL,viewport:{width:844,height:390},hasTouch:true,isMobile:true});
  const page=await ctx.newPage();await blockGoogle(page);await page.goto('/');
  await expect(page.locator('#rotate-note')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('#rotate-note')).toBeHidden();
  await page.setViewportSize({width:360,height:340}); // portrait phone with the keyboard open
  await expect(page.locator('#rotate-note')).toBeHidden();
  await ctx.close();
});

test('visits typed straight after Submit, with no pause, are all recorded', async ({page}) => {
  await startLiveMatch(page, '/', false, ['HOME', 'AWAY'], '501');
  await page.evaluate(() => { // the robot types the next visit before the last one has finished saving
    const tap = sel => document.querySelector(sel).click();
    for (const n of ['100', '60', '100', '60']) { for (const d of n) tap(`.keypad [data-key="${d}"]`); tap('#enter-score'); }
  });
  await expect(page.locator('#remaining0')).toHaveText('301');
  await expect(page.locator('#remaining1')).toHaveText('381');
});

test('reopening the app long after a match finished shows the front page, not the old result', async ({page}) => {
  await startLiveMatch(page, '/', true);
  for (const n of [180, 0, 121]) { for (const d of String(n)) await key(page, d); await page.locator('#enter-score').click(); await page.waitForTimeout(150); }
  await expect(page.locator('#dialog-kicker')).toHaveText('MATCH COMPLETE');
  await expect(page.locator('#archive-status')).toHaveText('Saved to Match history on this device.');
  await page.reload(); // straight away: the result is still there
  await expect(page.locator('#dialog-kicker')).toHaveText('MATCH COMPLETE');
  await page.clock.setFixedTime(new Date(Date.now() + 2 * 3600e3));
  await page.reload();
  await expect(page.locator('#landing')).toBeVisible();
  await expect(page.locator('#shade')).toBeHidden();
});
