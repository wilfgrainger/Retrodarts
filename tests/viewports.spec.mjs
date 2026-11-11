// Layout and behaviour checks across phone, tablet and desktop viewports.
//
// These tests assert invariants only (see AGENTS.md): no horizontal overflow, text inside its box,
// no overlapping controls, keypad fully on screen, touch targets >= 44px, text >= 12px, contrast
// >= 4.5, the throwing team distinguishable from the waiting team, DSEG7 score digits, and app
// behaviour. They must not lock in colours, pixel positions, size ratios, element order, a default
// theme or which themes exist: themes are read from the app's theme picker.
//
// Screenshots are opt-in: CAPTURE_SCREENSHOTS=1 writes them to artifacts/review-screenshots/.
import {test, expect, blockGoogle, tapDialogButton, startLiveMatch} from './helpers/test.mjs';
import {readFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const releaseSource=await readFile(new URL('../index.html',import.meta.url),'utf8');
const appVersion=releaseSource.match(/const APP_VERSION='([^']+)'/)?.[1];
const appCache=releaseSource.match(/const APP_CACHE='([^']+)'/)?.[1];
if(!appVersion||!appCache)throw new Error('Could not read the current app release metadata');

const CAPTURE=!!process.env.CAPTURE_SCREENSHOTS;
async function capture(page, name, options = {}) {
  if (!CAPTURE) return;
  const file=fileURLToPath(new URL(`../artifacts/review-screenshots/${name}.png`,import.meta.url));
  await mkdir(dirname(file),{recursive:true});
  await page.screenshot({path:file,animations:'disabled',...options});
}

// The theme list comes from the app's own picker, so adding, renaming or dropping themes needs no test edits.
let cachedThemes=null;
async function themeIds(page) {
  if (cachedThemes) return cachedThemes;
  const context=await page.context().browser().newContext({baseURL:test.info().project.use.baseURL});
  await blockGoogle(context);
  try {
    const probe=await context.newPage();
    await probe.goto('/');
    await probe.locator('#menu-toggle').click();
    await probe.getByRole('button',{name:/theme/i}).click();
    const choices=probe.locator('.theme-choice[data-theme]');
    await expect(choices.first()).toBeVisible();
    cachedThemes=await choices.evaluateAll(els=>els.map(el=>el.dataset.theme));
  } finally {
    await context.close();
  }
  expect(cachedThemes.length).toBeGreaterThan(0);
  return cachedThemes;
}
const setTheme=(page,theme)=>page.evaluate(t=>{document.documentElement.dataset.theme=t;},theme);

async function waitForViewport(page, height) {
  await expect.poll(()=>page.locator('.app').evaluate(el=>parseFloat(el.style.height)||el.getBoundingClientRect().height)).toBe(height);
  await page.evaluate(()=>document.fonts.ready);
}

async function enterScore(page, score) {
  for (const digit of String(score)) await page.locator(`.keypad [data-key="${digit}"]`).click();
  await page.locator('#enter-score').click();
}

async function openGameMatchHistory(page) {
  await page.locator('#menu-toggle').click();
  await page.locator('#open-archive').click();
}

async function reachGameCompleteHighlights(page, teams = ['DOD', 'TUT']) {
  await page.goto('/');
  // First to 2 games: a one-game match skips the game result and goes straight to full time.
  await startLiveMatch(page, '/', true, teams, '501', {gameCount:'2'});
  for (const score of [180, 180, 180, 180, 20, 20, 121]) await enterScore(page, score);
  await expect(page.locator('#dialog-kicker')).toHaveText('GAME 1 COMPLETE');
  await expect(page.locator('.game-highlights .highlight-value').first()).toHaveText('180');
}

async function assertHighlightStatColumns(page) {
  const gaps = await page.evaluate(() => [...document.querySelectorAll('.game-highlights .highlight-stat')].map(row => {
    const label = row.querySelector('.highlight-label');
    const value = row.querySelector('.highlight-value');
    const l = label.getBoundingClientRect();
    const v = value.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
    return {
      overlap: l.left < v.right && l.right > v.left && l.top < v.bottom && l.bottom > v.top,
      labelWrap: label.scrollHeight > lineHeight * 1.25,
      valueWrap: value.scrollHeight > parseFloat(getComputedStyle(value).lineHeight) * 1.25,
    };
  }));
  expect(gaps.length).toBeGreaterThan(0);
  for (const {overlap, labelWrap, valueWrap} of gaps) {
    expect(overlap).toBe(false);
    expect(labelWrap).toBe(false);
    expect(valueWrap).toBe(false);
  }
}

async function archivedFixtureCount(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('retro-darts-archive-v1');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('fixtures', 'readonly');
      const countReq = tx.objectStore('fixtures').count();
      countReq.onsuccess = () => { db.close(); resolve(countReq.result); };
      countReq.onerror = () => reject(countReq.error);
    };
  }));
}

async function downloadedPdfText(page, button) {
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  return readFile(await download.path(), 'latin1');
}

// Wait for finite CSS animations (for example a score flash) so geometry is measured at rest.
const settleAnimations = page => page.evaluate(() => Promise.all(document.getAnimations()
  .filter(a => a.effect?.getComputedTiming?.().iterations !== Infinity)
  .map(a => a.finished.catch(() => {}))));

// Score digits: each side's remaining total and Last Score fit their boxes, and Last Score is the smaller of the two.
async function scoreDigits(page) {
  await settleAnimations(page);
  return page.evaluate(() => {
    const textBox = el => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect(); };
    const inside = (t, b) => t.left >= b.left - 1 && t.right <= b.right + 1 && t.top >= b.top - 1 && t.bottom <= b.bottom + 1;
    return [0, 1].map(i => {
      const main = document.querySelector(`#remaining${i}`), last = document.querySelector(`#last${i}`);
      const display = document.querySelector(`#card${i} .score-display`)?.getBoundingClientRect();
      const mainBox = display && display.width && display.height ? display : main.getBoundingClientRect();
      const mainText = textBox(main), lastText = textBox(last);
      return {
        side: i,
        ratio: lastText.height / mainText.height,
        mainFits: inside(mainText, mainBox),
        lastFits: inside(lastText, last.getBoundingClientRect()),
        lastText: [lastText.left, lastText.right].map(Math.round), lastBox: [last.getBoundingClientRect().left, last.getBoundingClientRect().right].map(Math.round), viewport: [innerWidth, document.documentElement.clientWidth],
        mainFont: getComputedStyle(main).fontFamily,
      };
    });
  });
}
function expectScoreDigits(digits, label = '') {
  for (const d of digits) {
    expect(d.ratio, `${label} Last Score digits should be smaller than the total: ${JSON.stringify(d)}`).toBeGreaterThan(0);
    expect(d.ratio, `${label} Last Score digits should be smaller than the total: ${JSON.stringify(d)}`).toBeLessThan(1);
    expect(d.mainFits, `${label} remaining score escapes its box: ${JSON.stringify(d)}`).toBe(true);
    expect(d.lastFits, `${label} Last Score escapes its box: ${JSON.stringify(d)}`).toBe(true);
    expect(d.mainFont, `${label} score digits use DSEG7`).toContain('DSEG7Classic');
  }
}

function landscapeGeometry(page) {
  return page.evaluate(() => {
    const teamHeading = i => innerWidth >= 1000
      ? document.querySelector(`#card-team${i}`)
      : document.querySelector(`#mini${i}`);
    const nameRects = i => {
      const range = document.createRange();
      range.selectNodeContents(teamHeading(i));
      return [...range.getClientRects()].map(r => ({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));
    };
    const fixture = document.querySelector('.fixture-score').getBoundingClientRect();
    const nameClearance = [0,1].map(i => {
      const rects=nameRects(i);
      if(innerWidth>=1000){
        const panel=document.querySelector(`#card${i}`).getBoundingClientRect();
        return rects.every(r=>r.left>=panel.left-1&&r.right<=panel.right+1&&r.top>=panel.top-1&&r.bottom<=panel.bottom+1);
      }
      return rects.every(r=>r.right<=fixture.left||r.left>=fixture.right||r.bottom<=fixture.top||r.top>=fixture.bottom);
    });
    return {
      nameClearance,
      historyFontSizes: [0,1].map(i=>parseFloat(getComputedStyle(document.querySelector(`#history${i} span`)).fontSize)),
      historyCounts: [0,1].map(i=>document.querySelector(`#history${i}`).children.length),
      historyVisible: [0,1].map(i=>[...document.querySelectorAll(`#history${i} span`)].every(cell=>cell.getBoundingClientRect().bottom<=innerHeight+1)),
      playerStatsVisible: ['#player-legs0','#player-average0','#player-legs1','#player-average1'].every(selector=>document.querySelector(selector).getClientRects().length>0),
      nameFits: [0,1].map(i=>teamHeading(i).scrollWidth<=teamHeading(i).clientWidth+1),
      keypadVisible: [...document.querySelectorAll('.keypad button')].every(b => b.getBoundingClientRect().bottom <= innerHeight + 1),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
}

function expectLandscapeInvariants(g, label = '') {
  expect(g.nameClearance, `${label} team names`).toEqual([true,true]);
  expect(g.historyFontSizes.every(size=>size>=12), `${label} history text >= 12px`).toBe(true);
  expect(g.historyCounts).toEqual([5,5]);
  expect(g.historyVisible).toEqual([true,true]);
  expect(g.playerStatsVisible).toBe(true);
  expect(g.keypadVisible, `${label} keypad on screen`).toBe(true);
  expect(g.horizontalOverflow, `${label} horizontal overflow`).toBe(false);
}

// Boxes that touch or share a 1px border do not count as overlapping.
const overlapsFn = 'const overlaps=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;';

test('starting a match requests fullscreen and the header control toggles it by keyboard', async ({page}) => {
  await page.setViewportSize({width:1280,height:800});
  await startLiveMatch(page, '/', false, ['HOME','AWAY'], '501', {keepFullscreen:true});
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  const control=page.locator('#fullscreen-toggle');
  await expect(control).toHaveAttribute('aria-label','Exit full screen');
  await expect(control).toHaveAttribute('aria-pressed','true');
  const box=await control.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  await control.focus();await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await expect(control).toHaveAttribute('aria-label','Enter full screen');
  await expect(control).toHaveAttribute('aria-pressed','false');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
});

test('Enter on a focused Undo button opens Undo instead of scoring the typed digits', async ({page}) => {
  await page.setViewportSize({width:1280,height:800});
  await startLiveMatch(page, '/', false, ['HOME','AWAY'], '501');
  for (const key of ['1','0','0','Enter','6','0']) await page.keyboard.press(key);
  await page.locator('#undo').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#shade')).toBeVisible();
  await expect(page.locator('#remaining0')).toHaveText('401');
  await expect(page.locator('#remaining1')).toHaveText('501');
});

test('a denied fullscreen request does not block starting or scoring a match', async ({page}) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen=function(){window.__fullRequests=(window.__fullRequests||0)+1;return Promise.reject(new Error('denied'));};
  });
  await page.setViewportSize({width:1280,height:800});
  await startLiveMatch(page, '/', false, ['HOME','AWAY'], '501');
  expect(await page.evaluate(() => window.__fullRequests)).toBe(1);
  await enterScore(page, 60);
  await expect(page.locator('#remaining0')).toHaveText('441');
});

test('resized landscape window keeps team names clear and no horizontal overflow', async ({page}) => {
  for (const [width, height] of [[700, 601], [800, 700], [900, 700], [1024, 700], [1200, 800]]) {
    await page.setViewportSize({width, height});
    if (width === 700) await startLiveMatch(page, '/', false, ['WHEATSHEAF B', 'GEORGE & DRAGON'], '501');
    await waitForViewport(page, height);
    const g = await landscapeGeometry(page);
    expect(g.nameClearance, `team name at ${width}px`).toEqual([true, true]);
    expect(g.horizontalOverflow).toBe(false);
  }
});

test('setup Start match and Full screen buttons are tap-sized', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 800});
  await page.goto('/');
  await page.getByRole('button', {name: 'Start a match'}).click();
  for (const id of ['#start-match', '#fullscreen']) {
    const box = await page.locator(id).boundingBox();
    expect(box.height, id).toBeGreaterThanOrEqual(44);
    expect(box.width, id).toBeGreaterThanOrEqual(44);
  }
});

// The landing page must not scroll and must keep its Start button on screen, at any size.
async function landingFit(page) {
  await expect(page.locator('#landing')).toBeVisible();
  await page.evaluate(() => Promise.all([...document.querySelectorAll('#landing img')].map(img => img.decode().catch(() => {}))));
  return page.evaluate(() => {
    const landing=document.querySelector('#landing'),start=document.getElementById('get-started').getBoundingClientRect();
    return {
      scrollRange:landing.scrollHeight-landing.clientHeight,
      documentScroll:document.documentElement.scrollHeight-innerHeight,
      startOnScreen:start.top>=0&&start.bottom<=innerHeight+1&&start.left>=0&&start.right<=innerWidth+1,
      startSize:[start.width,start.height],
      overflow:document.documentElement.scrollWidth>innerWidth+1,
    };
  });
}
// 1280×720 and 1512×780: the short laptop windows where the landing page used to scroll (63c84ee).
for(const [width,height] of [[360,780],[390,844],[1280,720],[1512,780]]) {
  test(`landing fits without scrolling at ${width}×${height} in every theme`,async ({page})=>{
    const themes=await themeIds(page);
    await page.setViewportSize({width,height});
    await page.goto('/');
    for(const theme of themes){
      await setTheme(page,theme);
      const fit=await landingFit(page);
      expect(fit.scrollRange,`${theme}`).toBeLessThanOrEqual(1);
      expect(fit.documentScroll,`${theme}`).toBeLessThanOrEqual(1);
      expect(fit.startOnScreen,`${theme} ${JSON.stringify(fit)}`).toBe(true);
      expect(fit.startSize[1]).toBeGreaterThanOrEqual(44);
      expect(fit.overflow).toBe(false);
    }
    if(width>height){
      await page.mouse.move(width/2,height/2);
      await page.mouse.wheel(0,650);
      await expect.poll(()=>page.locator('#landing').evaluate(el=>el.scrollTop)).toBe(0);
    }
  });
}

test('release: starting score toggle is labelled and keyboard accessible', async ({page}) => {
  await page.setViewportSize({width:412,height:915});
  await page.goto('/');
  await page.getByRole('button',{name:'Start a match'}).click();
  await expect(page.getByRole('radiogroup',{name:'Starting score'})).toBeVisible();
  await expect(page.getByRole('radio',{name:'301'})).toBeChecked();
  await page.getByRole('radio',{name:'501'}).check();
  await expect(page.getByRole('radio',{name:'501'})).toBeChecked();
});

test('release: starter chooser focuses a real option and traps keyboard focus', async ({page}) => {
  await page.setViewportSize({width:412,height:915});
  await page.goto('/');
  await page.getByRole('button',{name:'Start a match'}).click();
  await page.locator('#team0').fill('WHEATSHEAF B');
  await page.locator('#team1').fill('GEORGE AND DRAGON');
  await expect(page.locator('#local-status')).toBeHidden({timeout:15000});
  await page.getByRole('button',{name:'Start match'}).click();
  await expect(page.locator('#dialog-title')).toHaveText('Who won the bull-up?');
  await expect(page.locator('.starter-pick button').first()).toBeFocused();
  await expect(page.getByRole('button',{name:'Start game 1'})).toBeDisabled();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button',{name:'Back to setup'})).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.starter-pick button').first()).toBeFocused();
  const startGame=page.getByRole('button',{name:'Start game 1'});
  await expect(async()=>{
    await page.locator('.starter-pick button').last().click();
    await expect(startGame).toBeEnabled({timeout:300});
  }).toPass({timeout:5000});
});

test('release: closing live-game history restores keyboard focus to its opener', async ({page}) => {
  await page.setViewportSize({width:412,height:915});
  await startLiveMatch(page,'/',false,['WHEATSHEAF B','GEORGE AND DRAGON'],'501');
  const opener=page.locator('#open-history0');
  await opener.click();
  await expect(page.getByRole('dialog',{name:'All visit scores'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#shade')).toBeHidden();
  await expect(opener).toBeFocused();
});

test('release polish: keyboard focus on score keys is visible', async ({page}) => {
  await startLiveMatch(page,'/',false,['HOME','AWAY'],'301');
  await page.locator('#no-score').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.keypad [data-key="1"]')).toBeFocused();
  const ring=await page.locator('.keypad [data-key="1"]').evaluate(el=>{
    const cs=getComputedStyle(el);
    return {outline:parseFloat(cs.outlineWidth),style:cs.outlineStyle,shadow:cs.boxShadow};
  });
  expect((ring.style!=='none'&&ring.outline>=2)||ring.shadow!=='none',JSON.stringify(ring)).toBe(true);
});

test('release polish: reduced motion disables keypad transitions', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await startLiveMatch(page);
  const seconds=await page.locator('.keypad [data-key="1"]').evaluate(el=>getComputedStyle(el).transitionDuration);
  expect(seconds.split(',').every(d=>parseFloat(d)===0)).toBe(true);
});

// The waiting team is dimmed, never illegible: both totals, the waiting team's last score, last-five chips and stats, and the
// cabinet labels (visit heading, active history label and View all, side badges) keep 4.5:1 in every theme. The background is read from the element that really paints it (display:contents boxes paint nothing):
// v0.4.3 fixed a bug where, at some window widths, the score window had no box and the yellow card showed behind the total.
for(const sizes of [[[360,640],[480,854],[613,850]],[[697,850],[800,700],[1333,800]]]) {
  test(`score readouts keep 4.5:1 contrast at ${sizes.map(s=>s.join('×')).join(', ')} in every theme`,async ({page})=>{
    const themes=await themeIds(page);
    await page.setViewportSize({width:sizes[0][0],height:sizes[0][1]});
    await startLiveMatch(page,'/',false,['HOME','AWAY'],'501');
    await enterScore(page,100);
    await enterScore(page,60);
    await enterScore(page,26);
    for(const [width,height] of sizes){
      // Resize after the match has started, as a person dragging the window edge does.
      await page.setViewportSize({width,height});
      await waitForViewport(page,height);
      for(const theme of themes){
        await setTheme(page,theme);
        const measured=await page.evaluate(()=>{
          const parse=c=>(c.match(/[\d.]+/g)||[]).map(Number);
          const lum=c=>{const [r,g,b]=c.slice(0,3).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;};
          const bgOf=el=>{for(let a=el;a;a=a.parentElement){const cs=getComputedStyle(a);if(cs.display==='contents')continue;const c=parse(cs.backgroundColor);if(c.length>=3&&(c[3]===undefined||c[3]>0.9))return c;}return [255,255,255];};
          const waiting=document.querySelector('.card:not(.active)');
          const labels=[...document.querySelectorAll('.visit-heading,.card.active .history-label,.card.active .history-action,.home-team span,.away-team span')].filter(el=>el.getClientRects().length);
          const targets=[...document.querySelectorAll('#remaining0,#remaining1'),...waiting.querySelectorAll('.last-score strong,.player-stat-value,.history span:not(.empty-score-mark)'),...labels];
          return targets.map(el=>{const fg=lum(parse(getComputedStyle(el).color)),bg=lum(bgOf(el));return {what:el.id||el.className||el.tagName,text:el.textContent.trim(),ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)};});
        });
        expect(measured.length,`${theme} readouts found`).toBeGreaterThan(3);
        for(const m of measured)expect(m.ratio,`${theme} ${width}×${height} ${m.what} "${m.text}"`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
}

test('the big totals keep one size whatever the score, and only bounce when a score is submitted',async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await startLiveMatch(page,'/',false,['HOME','AWAY'],'501');
  await page.waitForTimeout(500);// the first layout settles just after the match screen appears
  const sizes=new Set();
  const size=()=>page.evaluate(()=>[0,1].map(i=>getComputedStyle(document.getElementById('remaining'+i)).fontSize).join(' '));
  sizes.add(await size());
  for(const score of [60,45,100,140,26]){await enterScore(page,score);sizes.add(await size());}
  expect([...sizes],'one size for every score').toHaveLength(1);
  // Typing straight after Enter must not restart the landing bounce of the total that just changed.
  await page.locator('.keypad [data-key="1"]').click();await page.locator('.keypad [data-key="2"]').click();
  const landing=()=>page.evaluate(()=>{const a=document.querySelector('#game .remaining.flash')?.getAnimations().find(x=>x.animationName==='score-land');return a?a.startTime:null;});
  await page.locator('#enter-score').click();
  const before=await landing();
  expect(before,'the submitted total bounces').not.toBeNull();
  await page.locator('.keypad [data-key="6"]').click();
  const after=await landing();
  if(after!==null)expect(after,'typing does not restart the bounce').toBe(before);
  await page.waitForTimeout(600);
  await page.locator('.keypad [data-key="0"]').click();
  await expect(page.locator('#game .remaining.flash')).toHaveCount(0);
});

test('the keyboard focus outline on Start match stands out from the setup screen in every theme',async ({page})=>{
  const themes=await themeIds(page);
  await page.goto('/');
  await page.getByRole('button',{name:'Start a match'}).click();
  for(const theme of themes){
    await setTheme(page,theme);
    await page.keyboard.press('Shift');
    await page.locator('#start-match').focus();
    const m=await page.evaluate(()=>{
      const el=document.querySelector('#start-match'),cs=getComputedStyle(el);
      const parse=c=>(c.match(/[\d.]+/g)||[]).map(Number);
      const lum=c=>{const [r,g,b]=c.slice(0,3).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;};
      const bgOf=e=>{for(let a=e;a;a=a.parentElement){const s=getComputedStyle(a);if(s.display==='contents')continue;const c=parse(s.backgroundColor);if(c.length>=3&&(c[3]===undefined||c[3]>0.9))return c;}return [255,255,255];};
      const fg=lum(parse(cs.outlineColor)),bg=lum(bgOf(el.parentElement));
      return {visible:el.matches(':focus-visible'),style:cs.outlineStyle,width:parseFloat(cs.outlineWidth),ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)};
    });
    expect(m.visible,`${theme} focus-visible`).toBe(true);
    expect(m.style,`${theme} outline`).not.toBe('none');
    expect(m.width,`${theme} outline width`).toBeGreaterThanOrEqual(2);
    expect(m.ratio,`${theme} outline against the setup background`).toBeGreaterThanOrEqual(3);
  }
});

test('360×640 phone: the toast clears the status band',async ({page})=>{
  await page.setViewportSize({width:360,height:640});
  await startLiveMatch(page,'/',false,['WHEATSHEAF B','GEORGE AND DRAGON'],'301');
  await enterScore(page,100);
  await enterScore(page,85);
  await enterScore(page,140);
  await enterScore(page,121);
  await enterScore(page,100);
  const t=await page.evaluate(()=>{const toast=document.querySelector('#toast');const band=document.querySelector('.match-status').getBoundingClientRect(),r=toast.getBoundingClientRect();
    return {hidden:toast.hidden,text:toast.textContent,overlap:Math.min(band.bottom,r.bottom)-Math.max(band.top,r.top)};});
  expect(t.hidden).toBe(false);
  expect(t.text).toMatch(/bust/i);
  expect(t.overlap,'toast must not overlap the fixture/status band').toBeLessThanOrEqual(0);
});

// Captures a computed-style signature of a team's card and name, to compare throwing and waiting states.
function teamSignatures(page) {
  return page.evaluate(() => {
    const props=['backgroundColor','backgroundImage','color','borderTopColor','borderTopWidth','borderLeftColor','borderLeftWidth','boxShadow','outlineStyle','outlineColor','outlineWidth','textDecorationLine','fontWeight','filter'];
    const sig=el=>{const s=getComputedStyle(el);return props.map(p=>s[p]).join('|');};
    return [0,1].map(i=>sig(document.querySelector(`#card${i}`))+'#'+sig(document.querySelector(`#mini${i}`)));
  });
}

test('release accessibility: the throwing team is distinguishable and the waiting team stays legible in every theme', async ({page}) => {
  const themes=await themeIds(page);
  await page.setViewportSize({width:412,height:915});
  await startLiveMatch(page,'/',false,['HOME','AWAY'],'501');
  for(const [width,height] of [[412,915],[1280,800]]){
    await page.setViewportSize({width,height});
    await waitForViewport(page,height);
    const homeThrowing={};
    for(const theme of themes){await setTheme(page,theme);homeThrowing[theme]=await teamSignatures(page);}
    await expect(page.locator('#visit-heading')).toContainText('HOME');
    await enterScore(page,60);
    await expect(page.locator('#remaining0')).not.toHaveText('501');
    await expect(page.locator('#visit-heading')).toContainText('AWAY');
    for(const theme of themes){
      await setTheme(page,theme);
      const awayThrowing=await teamSignatures(page);
      expect(awayThrowing[0],`${theme} ${width}: home card looks the same throwing and waiting`).not.toBe(homeThrowing[theme][0]);
      expect(awayThrowing[1],`${theme} ${width}: away card looks the same throwing and waiting`).not.toBe(homeThrowing[theme][1]);
      const r=await page.evaluate(()=>{
        const lum=color=>{const n=(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return .2126*n[0]+.7152*n[1]+.0722*n[2];};
        const ratio=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        const bgOf=el=>{for(let a=el;a;a=a.parentElement){const cs=getComputedStyle(a);if(cs.display==='contents')continue;const c=(cs.backgroundColor.match(/[\d.]+/g)||[]).map(Number);if(c.length>=3&&(c[3]===undefined||c[3]>0.9))return cs.backgroundColor;}return 'rgb(255,255,255)';};
        const idle=document.querySelector('#card0');
        const opacityChain=[];for(let el=idle.querySelector('.remaining');el;el=el.parentElement)opacityChain.push(Number(getComputedStyle(el).opacity));
        const name=idle.querySelector('h2');
        return {minOpacity:Math.min(...opacityChain),nameContrast:name?ratio(lum(getComputedStyle(name).color),lum(bgOf(name))):null};
      });
      expect(r.minOpacity,`${theme} ${width} waiting team opacity`).toBe(1);
      if(r.nameContrast!==null)expect(r.nameContrast,`${theme} ${width} waiting team name contrast`).toBeGreaterThanOrEqual(4.5);
    }
    await page.locator('#undo').click();
    await tapDialogButton(page.getByRole('button',{name:/^Undo (last action|bust|\d+)$/}),()=>expect(page.locator('#shade')).toBeHidden({timeout:300}));
    await expect(page.locator('#remaining0')).toHaveText('501');
    await expect(page.locator('#visit-heading')).toContainText('HOME');
    expect(await teamSignatures(page),`${width}: undo restores the home-throwing look exactly`).toEqual(homeThrowing[themes.at(-1)]);
  }
});

// A home team called "Home" needs no HOME side badge repeating its name.
for(const [width,height] of [[1280,800],[390,844]]) {
  test(`a home team named Home shows no repeated side badge at ${width}×${height}`, async ({page}) => {
    await page.setViewportSize({width,height});
    await startLiveMatch(page,'/',false,['Home','AWAY']);
    await expect(page.locator('#card0 .card-side')).not.toBeVisible();
  });
}

for(const [width,height] of [[360,740],[800,1333]]) {
  test(`release accessibility: completed-game dialog fits ${width}×${height}`, async ({page}) => {
    await page.setViewportSize({width,height});
    await reachGameCompleteHighlights(page);
    const geometry=await page.evaluate(()=>{
      const bounds=el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};};
      return {
        dialog:bounds(document.querySelector('#shade .dialog')),
        actions:bounds(document.querySelector('#dialog-actions')),
        horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1
      };
    });
    expect(geometry.dialog.left).toBeGreaterThanOrEqual(0);
    expect(geometry.dialog.top).toBeGreaterThanOrEqual(0);
    expect(geometry.dialog.right).toBeLessThanOrEqual(width+1);
    expect(geometry.dialog.bottom).toBeLessThanOrEqual(height+1);
    expect(geometry.actions.bottom).toBeLessThanOrEqual(height+1);
    expect(geometry.horizontalOverflow).toBe(false);
  });
}

// Round 4 invariants: a player card never clips or overruns its own content, in every theme.
for(const [width,height] of [[320,568],[844,390]]) {
  test(`player cards contain every child with inner padding and show full digit values at ${width}×${height}`, async ({page}) => {
    const themes=await themeIds(page);
    await page.setViewportSize({width,height});
    await startLiveMatch(page,'/',false,['WHEATSHEAF B','GEORGE AND DRAGON'],'301');
    for(const s of [100,85,140,121,60])await enterScore(page,s);
    for(const theme of themes){
      await setTheme(page,theme);
      await page.evaluate(()=>document.fonts.ready);
      const r=await page.evaluate(()=>{
        const out=[];
        for(const card of document.querySelectorAll('#game .card')){
          const cb=card.getBoundingClientRect();let lowest=0;
          for(const el of card.querySelectorAll('*')){
            const q=el.getBoundingClientRect();
            if(!q.width||!q.height||!el.getClientRects().length)continue;
            const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.clip!=='auto'&&cs.position==='absolute')continue;
            if(q.right>cb.right+.5||q.left<cb.left-.5||q.bottom>cb.bottom+.5||q.top<cb.top-.5)out.push(`${card.id} ${el.className||el.id} crosses the card box [${[q.left,q.top,q.right,q.bottom].map(Math.round)}] vs [${[cb.left,cb.top,cb.right,cb.bottom].map(Math.round)}]`);
            lowest=Math.max(lowest,q.bottom);
            if(el.children.length===0&&el.textContent.trim()&&cs.overflow!=='visible'&&el.scrollWidth>el.clientWidth+1)out.push(`${card.id} ${el.className||el.id} '${el.textContent.trim()}' is cut off`);
          }
          if(cb.bottom-lowest<3)out.push(`${card.id} content touches the card's bottom frame (${(cb.bottom-lowest).toFixed(1)}px)`);
        }
        return out;
      });
      expect(r,`${theme} ${width}×${height}`).toEqual([]);
    }
  });
}

test('844×390 landscape phone: the active score box stays clear of the card frame in every theme', async ({page}) => {
  const themes=await themeIds(page);
  await page.setViewportSize({width:844,height:390});
  await startLiveMatch(page,'/',false,['WHEATSHEAF B','GEORGE AND DRAGON'],'301');
  for(const theme of themes){
    await setTheme(page,theme);
    const m=await page.evaluate(()=>{
      const sb=document.querySelector('.card.active .remaining').getBoundingClientRect(),card=document.querySelector('.card.active').getBoundingClientRect();
      return {gap:Math.min(sb.top-card.top,card.bottom-sb.bottom)};
    });
    expect(m.gap,`${theme} score box clear of the card frame`).toBeGreaterThanOrEqual(4);
  }
});

for(const [width,height] of [[1333,800],[844,390]]) {
  test(`game-complete dialog keeps scoreboard, tiles, buttons and a visit row on screen at ${width}×${height}`, async ({page}) => {
    await page.setViewportSize({width,height});
    await reachGameCompleteHighlights(page);
    const r=await page.evaluate(()=>{
      const dlg=document.querySelector('#shade .dialog').getBoundingClientRect();
      const inside=el=>{const q=el.getBoundingClientRect();return q.top>=dlg.top-1&&q.bottom<=dlg.bottom+1&&q.left>=dlg.left-1&&q.right<=dlg.right+1;};
      const tiles=[...document.querySelectorAll('.game-highlights>div')];
      const region=document.querySelector('.leg-grid');const rr=region?.getBoundingClientRect();
      const visibleRows=[...document.querySelectorAll('.leg-grid tbody tr')].filter(tr=>{const q=tr.getBoundingClientRect();return q.top>=rr.top-1&&q.bottom<=rr.bottom+1;}).length;
      return {tilesVisible:tiles.length>=2&&tiles.every(inside),digits:[...document.querySelectorAll('.result-row .result-digit,.result-legs .result-digit')].every(inside),buttons:[...document.querySelectorAll('#dialog-actions button:not([hidden])')].every(inside),visibleRows,scrolls:getComputedStyle(region).overflowY};
    });
    expect(r.tilesVisible,'both stat tiles fully visible').toBe(true);
    expect(r.digits,'fixture and leg score digits fully visible').toBe(true);
    expect(r.buttons,'all buttons inside the dialog').toBe(true);
    expect(r.visibleRows,'at least one full visit row without scrolling').toBeGreaterThanOrEqual(1);
    expect(r.scrolls).toBe('auto');
  });
}

for(const [width,height] of [[1333,800],[844,390]]) {
  test(`game-complete: no visit row is sliced at ${width}×${height}`, async ({page}) => {
    await page.setViewportSize({width,height});
    await reachGameCompleteHighlights(page);
    const r=await page.evaluate(()=>{
      const g=document.querySelector('.leg-grid').getBoundingClientRect();
      const sliced=[...document.querySelectorAll('.leg-grid tbody tr,.leg-grid tfoot tr,.leg-grid .history-leg-title')].filter(el=>{const q=el.getBoundingClientRect();return q.top<g.bottom-1&&q.bottom>g.bottom+1;}).length;
      return {sliced};
    });
    expect(r.sliced,'no visit row cut by the scroll edge at rest').toBe(0);
  });
}

// Simulates the visual viewport after Android Gboard opens on a phone.
// The setup action buttons must never cover the editable team names.
for(const [width,height] of [[412,440],[360,350]]) {
  test(`release: keyboard-sized viewport ${width}×${height} keeps team names clear of setup actions`, async ({page}) => {
    await page.setViewportSize({width,height});
    await page.goto('/');
    await page.getByRole('button',{name:'Start a match'}).click();
    await page.locator('#team0').fill('WHEATSHEAF B');
    await page.locator('#team1').fill('GEORGE AND DRAGON');
    await expect(page.locator('#team1')).toBeFocused();
    const measure=()=>page.evaluate(new Function(`${overlapsFn}
      const rect=id=>document.getElementById(id).getBoundingClientRect();
      const team=rect('team1'),setup=rect('setup');
      const actions=['start-match','fullscreen'].map(rect);
      return {
        teamCovered:actions.some(a=>overlaps(a,team)),
        teamVisible:team.top>=setup.top-1&&team.bottom<=setup.bottom+1,
        actionsOverlap:overlaps(actions[0],actions[1])
      };`));
    await expect.poll(measure).toEqual({teamCovered:false,teamVisible:true,actionsOverlap:false});
  });
}

test('short landscape setup keeps leg selectors clear of the action buttons', async ({page}) => {
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/');
  await page.getByRole('button',{name:'Start a match'}).click();
  const geometry=await page.evaluate(new Function(`${overlapsFn}
    const rect=id=>document.getElementById(id).getBoundingClientRect();
    const selectors=['leg-mode','leg-count'].map(rect),buttons=['start-match','fullscreen'].map(rect);
    return {clear:selectors.every(s=>buttons.every(b=>!overlaps(s,b))),buttonsOnScreen:buttons.every(b=>b.bottom<=innerHeight+1)};`));
  expect(geometry).toEqual({clear:true,buttonsOnScreen:true});
});

// One wide desktop, one tablet landscape, one tablet portrait and one phone: sizes in between fail together.
const DESIGN_VIEWPORTS=[[2000,1200],[1024,768],[800,1333],[390,844]];

test('release: DSEG7 score digits fit a mid-game 501 scoreboard in every theme', async ({page}) => {
  const themes=await themeIds(page);
  const turns=[[0,'55'],[1,'40'],[0,'60'],[1,'45'],[0,'81'],[1,'60'],[0,'41'],[1,'40'],[0,'50'],[1,'51']];
  await startLiveMatch(page,'/',false,['WHEATSHEAF B','GEORGE AND DRAGON'],'501');
  for(const [side,score] of turns) {
    await enterScore(page,score);
    await expect(page.locator(`#last${side}`)).toHaveText(score);
  }
  await expect(page.locator('#remaining0')).toHaveText('214');
  await expect(page.locator('#remaining1')).toHaveText('265');
  for(const digit of '180') await page.locator(`[data-key="${digit}"]`).click();
  await expect(page.locator('#draft')).toHaveText('180');
  await expect(page.locator('#preview')).toContainText('34');
  for(const theme of themes) {
    await setTheme(page,theme);
    for(const [width,height] of [[2000,1200],[1702,1076],[1024,768],[800,700],[800,1333],[390,844]]) {
      await page.setViewportSize({width,height});
      await waitForViewport(page,height);
      await page.evaluate(async()=>{await document.fonts.load('italic 400 16px DSEG7Classic','0123456789');await document.fonts.ready;});
      const layout=await page.evaluate(()=>{
        const rangeBox=element=>{const range=document.createRange();range.selectNodeContents(element);return range.getBoundingClientRect();};
        const inside=(t,b)=>t.left>=b.left-1&&t.right<=b.right+1&&t.top>=b.top-1&&t.bottom<=b.bottom+1;
        const history=[...document.querySelectorAll('.history span')].map(el=>inside(rangeBox(el),el.getBoundingClientRect()));
        const draft=document.querySelector('#draft'),entry=document.querySelector('.visit-entry').getBoundingClientRect();
        return {
          fontLoaded:document.fonts.check('italic 400 16px DSEG7Classic','0123456789'),
          digitFonts:['#last0','#last1','#draft','#games0','#player-legs0'].map(s=>getComputedStyle(document.querySelector(s)).fontFamily),
          history,
          draftInside:inside(rangeBox(draft),entry),
          overflow:document.documentElement.scrollWidth>innerWidth+1};
      });
      const label=`${theme} ${width}×${height} ${JSON.stringify(layout)}`;
      await capture(page,`mid-game-501-${theme}-${width}x${height}`);
      expectScoreDigits(await scoreDigits(page),`${theme} ${width}×${height}`);
      expect(layout.fontLoaded,label).toBe(true);
      expect(layout.digitFonts.every(f=>f.includes('DSEG7Classic')),label).toBe(true);
      expect(layout.history).toHaveLength(10);
      expect(layout.history.every(Boolean),label).toBe(true);
      expect(layout.draftInside,label).toBe(true);
      expect(layout.overflow,label).toBe(false);
    }
  }
});

test('release: maximum-score feedback stays clear of the entered score in every theme', async ({page}) => {
  const themes=await themeIds(page);
  await startLiveMatch(page,'/',false,['WHEATSHEAF B','GEORGE AND DRAGON'],'501');
  for(const [side,score] of [[0,'45'],[1,'60'],[0,'60'],[1,'100'],[0,'45'],[1,'60'],[0,'81'],[1,'41'],[0,'180'],[1,'51']]){
    await enterScore(page,score);
    await expect(page.locator(`#last${side}`)).toHaveText(score);
  }
  await expect(page.locator('#player-average0')).toHaveText('82.2');
  await expect(page.locator('#player-average1')).toHaveText('62.4');
  for(const digit of '215')await page.locator(`[data-key="${digit}"]`).click();
  await expect(page.locator('#draft')).toHaveText('215');
  await expect(page.locator('#preview')).toContainText('180');

  for(const theme of themes) {
    await setTheme(page,theme);
    for(const [width,height] of DESIGN_VIEWPORTS) {
      await page.setViewportSize({width,height});
      await waitForViewport(page,height);
      const layout=await page.evaluate(new Function(`${overlapsFn}
        const bounds=selector=>document.querySelector(selector).getBoundingClientRect();
        const textBounds=selector=>{const range=document.createRange();range.selectNodeContents(document.querySelector(selector));return range.getBoundingClientRect();};
        const inside=(t,b)=>t.left>=b.left-1&&t.right<=b.right+1&&t.top>=b.top-1&&t.bottom<=b.bottom+1;
        const headingShown=document.querySelector('.visit-heading').getClientRects().length>0,entry=bounds('.visit-entry'),heading=textBounds('.visit-heading'),draft=textBounds('#draft'),preview=textBounds('#preview');
        const summary=bounds('.score-summary'),fixture=bounds('#fixture-label'),game=bounds('#game-label');
        const historyFit=[0,1].map(i=>[...document.querySelectorAll('#history'+i+' span')].every(cell=>inside(textBounds('#history'+i+' span:nth-child('+([...cell.parentElement.children].indexOf(cell)+1)+')'),cell.getBoundingClientRect())));
        const cardSectionsClear=[0,1].map(i=>{
          const wrapper=bounds('#card'+i+' .score-display'),score=bounds('#remaining'+i),main=wrapper.width&&wrapper.height?wrapper:score;
          const last=bounds('#last'+i),history=bounds('#open-history'+i),stats=bounds('#card'+i+' .player-stats');
          return [main,last].every(r=>!overlaps(r,history)&&!overlaps(r,stats))&&!overlaps(history,stats)&&!overlaps(main,last);
        });
        const playerStatsFit=[0,1].map(i=>{
          const card=bounds('#card'+i);
          return [...document.querySelectorAll('#card'+i+' .player-stat-label,#card'+i+' .player-stat-value')].every(el=>{const range=document.createRange();range.selectNodeContents(el);return inside(range.getBoundingClientRect(),card);});
        });
        const headerControls=[...document.querySelectorAll('#app-header button')].filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect());
        return {
          labelsClearOfSummary:!overlaps(fixture,summary)&&!overlaps(game,summary),
          // Phones drop the HOME/AWAY SCORE label (the throwing frame shows the turn): only check it where it is shown.
          headingClearOfDraft:!headingShown||!overlaps(heading,draft),
          draftClearOfPreview:!overlaps(draft,preview),
          textInsideEntry:[...(headingShown?[heading]:[]),draft,preview].every(r=>inside(r,entry)),
          previewVisible:getComputedStyle(document.querySelector('#preview')).visibility!=='hidden'&&getComputedStyle(document.querySelector('#preview')).opacity!=='0',
          historyFit,cardSectionsClear,playerStatsFit,
          headerControlsClear:headerControls.every((a,i)=>headerControls.every((b,j)=>i===j||!overlaps(a,b))),
          headerTargets:headerControls.every(r=>r.width>=44&&r.height>=44),
          keypadButtonsVisible:[...document.querySelectorAll('.keypad button')].every(button=>button.getBoundingClientRect().bottom<=(window.visualViewport?.height??innerHeight)+1),
          horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1
        };`));
      const label=`${theme} ${width}×${height} ${JSON.stringify(layout)}`;
      await capture(page,`maximum-score-${theme}-${width}x${height}`);
      expect(layout.labelsClearOfSummary,label).toBe(true);
      expect(layout.headingClearOfDraft,label).toBe(true);
      expect(layout.draftClearOfPreview,label).toBe(true);
      expect(layout.textInsideEntry,label).toBe(true);
      expect(layout.previewVisible,label).toBe(true);
      expect(layout.historyFit,label).toEqual([true,true]);
      expect(layout.cardSectionsClear,label).toEqual([true,true]);
      expect(layout.playerStatsFit,label).toEqual([true,true]);
      expect(layout.headerControlsClear,label).toBe(true);
      expect(layout.headerTargets,label).toBe(true);
      expect(layout.keypadButtonsVisible,label).toBe(true);
      expect(layout.horizontalOverflow,label).toBe(false);
      expectScoreDigits(await scoreDigits(page),`${theme} ${width}×${height}`);
    }
  }
});

test('game statistics icon opens the current game report and restores focus', async ({page}) => {
  await page.setViewportSize({width:800,height:1280});
  await startLiveMatch(page);
  const stats=page.getByRole('button',{name:'Game statistics and visit history'});
  const box=await stats.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await stats.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog',{name:'All visit scores'})).toBeVisible();
  await tapDialogButton(page.getByRole('button',{name:'Back to scoreboard'}),()=>expect(page.locator('#shade')).toBeHidden({timeout:300}));
  await expect(stats).toBeFocused();
});

test('NO SCORE activated with Enter records zero even with a draft', async ({page}) => {
  await page.setViewportSize({width:1024,height:768});
  await startLiveMatch(page, '/', false, ['HOME', 'AWAY'], '501');
  await page.locator('[data-key="6"]').click();
  await page.locator('[data-key="0"]').click();
  await page.locator('#no-score').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#last0')).toHaveText('0');
  await expect(page.locator('#remaining0')).toHaveText('501');
  await expect(page.locator('#turn1')).toContainText('THROWING');
});

test('NO SCORE records one zero visit, persists after refresh and supports Undo',async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await startLiveMatch(page,'/',false,['WHEATSHEAF B','GEORGE AND DRAGON'],'301');
  const noScore=page.getByRole('button',{name:'No score, record a zero visit'});
  await expect(noScore).toBeEnabled();
  await expect(page.locator('.keypad [data-key="0"]')).toBeVisible();
  await page.waitForTimeout(500); // outlast the 450ms ghost-tap guard that follows closing a dialog (NO SCORE can sit where START GAME was)
  await noScore.click();
  await expect(page.locator('#last0')).toHaveText('0');
  await expect(page.locator('#remaining0')).toHaveText('301');
  await expect(page.locator('#history0 span').last()).toHaveText('0');
  await expect(page.locator('#turn1')).toContainText('THROWING NOW');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wheatsheaf-team-scorer-v3')));
  expect(saved.log).toHaveLength(1);
  expect(saved.log[0]).toMatchObject({side:0,score:0,bust:false});
  expect(saved.players[0].darts).toBe(3);
  await page.reload();
  await expect(page.locator('#last0')).toHaveText('0');
  await expect(page.locator('#turn1')).toContainText('THROWING NOW');
  await page.locator('#undo').click();
  await expect(page.getByRole('button',{name:/^Undo (last action|bust|\d+)$/})).toBeVisible();
  await tapDialogButton(page.getByRole('button',{name:/^Undo (last action|bust|\d+)$/}),()=>expect(page.locator('#shade')).toBeHidden({timeout:300}));
  await expect(page.locator('#turn0')).toContainText('THROWING NOW');
  await expect(page.locator('#last0')).toHaveText('-');
  await expect(page.locator('#remaining0')).toHaveText('301');
  const afterUndo=await page.evaluate(()=>JSON.parse(localStorage.getItem('wheatsheaf-team-scorer-v3')));
  expect(afterUndo.log).toHaveLength(0);
});

test('NO SCORE ignores rapid double-taps but retains normal numerical scoring',async ({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await startLiveMatch(page,'/',false,['HOME','AWAY'],'301');
  await page.locator('#no-score').evaluate(button=>{button.click();button.click()});
  await expect(page.locator('#last0')).toHaveText('0');
  await expect(page.locator('#last1')).toHaveText('-');
  await expect(page.locator('#turn1')).toContainText('THROWING NOW');
  // A second NO SCORE inside the app's repeat-tap guard is ignored.
  await page.locator('#no-score').click();
  await expect(page.locator('#last1')).toHaveText('-');
  await enterScore(page,180);
  await expect(page.locator('#remaining1')).toHaveText('121');
  await expect(page.locator('#last1')).toHaveText('180');
  await expect(page.locator('#history1 span').last()).toHaveText('180');
});

test('plan: game complete highlight stats keep label and value columns separate', async ({page}) => {
  await page.setViewportSize({width: 360, height: 740});
  await reachGameCompleteHighlights(page);
  await assertHighlightStatColumns(page);
  await page.setViewportSize({width: 412, height: 915});
  await assertHighlightStatColumns(page);
  await page.setViewportSize({width: 800, height: 1333});
  await assertHighlightStatColumns(page);
});

// Dialog text integrity: names wrap only between words, no label is cut with an ellipsis, nothing spills its box.
async function assertDialogTextIntegrity(page, label) {
  const problems = await page.evaluate(() => {
    const root = document.querySelector('#shade .dialog');
    const out = [];
    for (const el of root.querySelectorAll('*')) {
      if (!el.getClientRects().length) continue;
      const cs = getComputedStyle(el);
      if (cs.textOverflow === 'ellipsis') out.push('ellipsis: ' + (el.className || el.tagName));
      if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && cs.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) out.push('clipped: ' + (el.className || el.tagName) + ' ' + el.textContent.trim().slice(0, 24));
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent;
      for (const m of text.matchAll(/[^\s]{4,}/g)) {
        const r = document.createRange();
        r.setStart(n, m.index);
        r.setEnd(n, m.index + m[0].length);
        const tops = new Set([...r.getClientRects()].map(q => Math.round(q.top / 4)));
        if (tops.size > 1) out.push('mid-word break: ' + m[0]);
      }
    }
    return out;
  });
  expect(problems, label).toEqual([]);
}

for (const [width, height] of [[1333, 800], [360, 640]]) {
  test(`dialogs never break team names mid-word or ellipsise labels in every theme at ${width}x${height}`, async ({page}) => {
    test.setTimeout(90_000);
    await page.setViewportSize({width, height});
    await reachGameCompleteHighlights(page, ['WHEATSHEAF B', 'GEORGE & DRAGON']);
    for (const theme of await themeIds(page)) {
      await setTheme(page, theme);
      await assertDialogTextIntegrity(page, `game complete ${theme}`);
    }
    await page.waitForTimeout(600); // the dialog ignores taps for a moment after opening
    await page.getByRole('button', {name: 'More'}).click();
    await tapDialogButton(page.getByRole('button', {name: /all visit scores/i}), async () => expect(page.locator('#dialog-kicker')).toContainText('HISTORY', {timeout: 1500}));
    for (const theme of await themeIds(page)) {
      await setTheme(page, theme);
      await assertDialogTextIntegrity(page, `view all ${theme}`);
    }
  });
}

test('plan: fixture completion PDF includes full match summary', async ({page}) => {
  await startLiveMatch(page, '/', true);
  for (const key of ['1', '8', '0', 'Enter', '0', 'Enter', '1', '2', '1', 'Enter']) await page.keyboard.press(key);
  await expect(page.locator('#dialog-kicker')).toHaveText('MATCH COMPLETE');
  await page.waitForTimeout(500);
  await page.getByRole('button', {name: 'More'}).click();
  const pdf = await downloadedPdfText(page, page.getByRole('button', {name: 'Download PDF'}));
  expect(pdf).toMatch(/FINAL\b.*HOME 1 - 0 AWAY/);
  expect(pdf).toContain('GAME SUMMARY');
  expect(pdf).toContain('CHECKOUT');
});

async function completeOneGame(page) {
  await startLiveMatch(page, '/', true);
  for (const key of ['1', '8', '0', 'Enter', '0', 'Enter', '1', '2', '1', 'Enter']) await page.keyboard.press(key);
  await expect(page.locator('#dialog-kicker')).toHaveText('MATCH COMPLETE');
  await page.waitForTimeout(500);
}

// The end-of-night actions must all be reachable without scrolling on the board device and on laptops.
for (const [width, height] of [[1333, 800], [844, 390], [390, 844]]) {
  test(`fixture-complete: every action button sits inside the dialog box at ${width}×${height}`, async ({page}) => {
    await page.setViewportSize({width, height});
    await completeOneGame(page);
    for (const theme of await themeIds(page)) {
      await setTheme(page, theme);
      const r = await page.evaluate(() => {
        const dialog = document.querySelector('#shade .dialog').getBoundingClientRect();
        const buttons = [...document.querySelectorAll('#dialog-actions button')].filter(b => b.getClientRects().length);
        return {count: buttons.length, outside: buttons.filter(b => {
          const r = b.getBoundingClientRect();
          return r.top < dialog.top - 0.5 || r.bottom > dialog.bottom + 0.5 || r.left < dialog.left - 0.5 || r.right > dialog.right + 0.5 || r.bottom > innerHeight + 0.5;
        }).map(b => b.textContent.trim())};
      });
      expect(r.count, `${theme} fixture actions shown`).toBeGreaterThanOrEqual(3);
      expect(r.outside, `${theme} fixture actions clipped by the dialog`).toEqual([]);
    }
  });
}

test('plan: saved fixture PDF does not replace live match', async ({page}) => {
  await completeOneGame(page);
  await page.locator('#dialog-actions').getByRole('button', {name: 'New match', exact: true}).click();
  await expect(page.locator('#shade')).toBeHidden({timeout: 20000});
  await expect.poll(() => archivedFixtureCount(page)).toBeGreaterThan(0);
  await page.goto('/');
  await startLiveMatch(page, '/', false, ['LIVE HOME', 'LIVE AWAY']);
  const liveBefore = await page.evaluate(() => localStorage.getItem('wheatsheaf-team-scorer-v3'));
  await openGameMatchHistory(page);
  const detail = page.locator('#dialog-content > .history-scroll > details.earlier-game').filter({hasText: /HOME 1[–-]0 AWAY/});
  await expect(detail).toHaveCount(1);
  await detail.evaluate(el => {
    el.open = true;
    el.dispatchEvent(new Event('toggle'));
  });
  const pdfButton = detail.getByRole('button', {name: 'Download match PDF'});
  await expect(pdfButton).toBeVisible({timeout: 15000});
  await page.waitForTimeout(500);
  const pdf = await downloadedPdfText(page, pdfButton);
  expect(pdf).toContain('HOME v AWAY');
  expect(pdf).not.toContain('LIVE HOME');
  expect(await page.evaluate(() => localStorage.getItem('wheatsheaf-team-scorer-v3'))).toBe(liveBefore);
});

test('plan: malformed saved record has no fabricated PDF', async ({page}) => {
  await completeOneGame(page);
  await page.locator('#dialog-actions').getByRole('button', {name: 'New match', exact: true}).click();
  await page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('retro-darts-archive-v1');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('fixtures', 'readwrite');
      tx.objectStore('fixtures').put({id: 'zz-missing', archivedAt: '2026-10-29T12:00:01.000Z', unexpected: 'original data'});
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => reject(tx.error);
    };
  }));
  await page.reload();
  await page.getByRole('button', {name: 'Open settings'}).click();
  await page.locator('#open-archive').click();
  const detail = page.locator('#dialog-content details').filter({hasText: 'Saved match unavailable'});
  await detail.locator('summary').click();
  await expect(detail.getByRole('button', {name: 'Download match PDF'})).toHaveCount(0);
});

test('release: theme choices persist separately from matches and fit a phone portrait dialog', async ({page}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  // A fresh profile shows the app's default theme; read it rather than assuming which one it is.
  const defaultTheme=await page.locator('html').getAttribute('data-theme');
  expect(defaultTheme).toBeTruthy();
  // Unknown saved themes (from retired releases) fall back to the default.
  for(const oldTheme of ['cyberpunk','synthwave']){
    await page.evaluate(theme=>localStorage.setItem('retro-darts-theme-v1',theme),oldTheme);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme',defaultTheme);
    await expect.poll(()=>page.evaluate(()=>localStorage.getItem('retro-darts-theme-v1'))).not.toBe(oldTheme);
  }
  await startLiveMatch(page,'/',false,['HOME','AWAY'],'301');
  await enterScore(page,60);
  await expect(page.locator('#remaining0')).toHaveText('241');
  const matchBefore=await page.evaluate(()=>localStorage.getItem('wheatsheaf-team-scorer-v3'));

  const openPicker=async()=>{
    await page.locator('#menu-toggle').click();
    await page.getByRole('button',{name:/theme/i}).click();
    await expect(page.locator('.theme-choice').first()).toBeVisible();
  };
  const choose=async theme=>{
    const choice=page.locator(`.theme-choice[data-theme="${theme}"]`);
    await tapDialogButton(choice,()=>expect(page.locator('html')).toHaveAttribute('data-theme',theme,{timeout:300}));
    await expect(choice).toHaveAttribute('aria-pressed','true');
  };
  // The app ignores a tap where a just-closed dialog's button was for 450ms; Theme can sit right there, so wait it out.
  await page.waitForTimeout(500);
  await openPicker();
  const dialog=await page.locator('#shade .dialog').boundingBox();
  expect(dialog.x).toBeGreaterThanOrEqual(0);
  expect(dialog.y).toBeGreaterThanOrEqual(0);
  expect(dialog.x+dialog.width).toBeLessThanOrEqual(391);
  expect(dialog.y+dialog.height).toBeLessThanOrEqual(845);
  const themes=await page.locator('.theme-choice[data-theme]').evaluateAll(els=>els.map(el=>el.dataset.theme));
  expect(themes).toContain(defaultTheme);
  await expect(page.locator(`.theme-choice[data-theme="${defaultTheme}"]`)).toHaveAttribute('aria-pressed','true');
  for(const box of await page.locator('.theme-choice').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().toJSON())))expect(box.height).toBeGreaterThanOrEqual(44);

  for(const theme of themes.filter(theme=>theme!==defaultTheme)){
    if(!await page.locator('.theme-choice').first().isVisible())await openPicker();
    await choose(theme);
    await expect(page.locator('#remaining0')).toHaveText('241');
    await page.keyboard.press('Escape');
    await expect(page.locator('#shade')).toBeHidden();
    await expect(page.locator('#menu-toggle')).toBeFocused();
    expect(await page.evaluate(()=>localStorage.getItem('wheatsheaf-team-scorer-v3'))).toBe(matchBefore);
    await page.reload();
    await expect(page.locator('#local-status')).toBeHidden({timeout:15000});
    await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
    await expect(page.locator('#remaining0')).toHaveText('241');
    expect(await page.evaluate(()=>localStorage.getItem('wheatsheaf-team-scorer-v3'))).toBe(matchBefore);
  }
  await openPicker();
  await choose(defaultTheme);
  await page.keyboard.press('Escape');
  await expect(page.locator('#shade')).toBeHidden();
  await page.reload();
  await expect(page.locator('#local-status')).toBeHidden({timeout:15000});
  await expect(page.locator('html')).toHaveAttribute('data-theme',defaultTheme);
  await expect(page.locator('#remaining0')).toHaveText('241');
  expect(await page.evaluate(()=>localStorage.getItem('wheatsheaf-team-scorer-v3'))).toBe(matchBefore);
});

test('new worker waits for an active match and preserves it on the next launch', async ({browser}) => {
  const http = await import('node:http');
  const path = await import('node:path');
  const fs = await import('node:fs/promises');
  const root = fileURLToPath(new URL('..', import.meta.url));
  let revision = 70;
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      if (file.includes('..')) throw Error('invalid path');
      let data = await fs.readFile(path.join(root, file));
      if (file === 'sw.js' || file === 'index.html') {
        data = Buffer.from(data.toString()
          .replaceAll(appCache, `retro-darts-scorer-v${revision}`));
      }
      const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.webmanifest') ? 'application/manifest+json' : file.endsWith('.png') ? 'image/png' : 'image/webp';
      res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-store'});
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const context = await browser.newContext();
  await blockGoogle(context);
  await context.addInitScript(()=>{try{localStorage.setItem('retro-darts-consent-v1','{"analytics":"denied","at":"2026-01-01T00:00:00.000Z"}');}catch(e){}});
  try {
    const page = await context.newPage();
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await startLiveMatch(page, origin);
    await enterScore(page, 60);
    revision = 71;
    await page.evaluate(() => { window.__noReload = 1; });
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await expect.poll(() => page.locator('#pwa-status').textContent(), {timeout: 15000}).toContain('Update ready');
    expect(await page.evaluate(() => window.__noReload), 'the new worker must not reload an active match').toBe(1);
    await page.reload();
    await expect(page.locator('#remaining0')).toHaveText('241');
    await expect(page.locator('.app-menu-version')).toHaveText(`Version ${appVersion}`);
  } finally {
    await context.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('legacy cached release upgrades without losing a match', async ({browser}) => {
  const http = await import('node:http');
  const path = await import('node:path');
  const fs = await import('node:fs/promises');
  const root = fileURLToPath(new URL('..', import.meta.url));
  // Keep a deployed legacy release snapshot so Pages' shallow clone needs no git history.
  const fixture = path.join(root, 'tests/fixtures/legacy-release-780d7d2');
  const oldFiles = Object.fromEntries(await Promise.all(['index.html', 'sw.js'].map(async file => [file, await fs.readFile(path.join(fixture, file))])));
  let upgraded = false;
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      if (file.includes('..')) throw Error('invalid path');
      const data = !upgraded && oldFiles[file] ? oldFiles[file] : await fs.readFile(path.join(root, file));
      const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.webmanifest') ? 'application/manifest+json' : file.endsWith('.png') ? 'image/png' : 'image/webp';
      res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-store'});
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const context = await browser.newContext();
  await blockGoogle(context);
  await context.addInitScript(()=>{try{localStorage.setItem('retro-darts-consent-v1','{"analytics":"denied","at":"2026-01-01T00:00:00.000Z"}');}catch(e){}});
  try {
    const page = await context.newPage();
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await startLiveMatch(page, origin);
    // The legacy release ignores every tap for 450ms after a dialog closes; current releases only guard the dialog.
    await page.waitForTimeout(500);
    await enterScore(page, 60);
    await expect(page.locator('#remaining0')).toHaveText('241');
    upgraded = true;
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await expect.poll(async () => page.evaluate(() => new Promise(resolve => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => resolve(null), 500);
      channel.port1.onmessage = event => { clearTimeout(timeout); resolve(event.data); };
      navigator.serviceWorker.controller.postMessage('version', [channel.port2]);
    })), {timeout: 15000}).toBe(appCache);
    await page.reload();
    await expect(page.locator('#remaining0')).toHaveText('241');
    await expect(page.locator('.app-menu-version')).toHaveText(`Version ${appVersion}`);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#remaining0')).toHaveText('241');
  } finally {
    await context.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('release: recovery alertdialog retains keyboard focus within the failure actions', async ({page}) => {
  await startLiveMatch(page,'/',false,['HOME','AWAY'],'301');
  await page.evaluate(()=>{
    Storage.prototype.setItem=function(){throw new DOMException('Storage full','QuotaExceededError')};
  });
  await enterScore(page,60);
  await expect(page.getByRole('alertdialog',{name:'Match not saved'})).toBeVisible();
  await expect(page.locator('#save-retry')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#save-pdf')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#save-retry')).toBeFocused();
  await expect(page.locator('#save-blocker')).toHaveAttribute('aria-hidden','false');
});

test('release: home and away history openers have distinct spoken names', async ({page}) => {
  await startLiveMatch(page);
  await expect(page.locator('#open-history0')).toHaveAccessibleName(/home team visits/i);
  await expect(page.locator('#open-history1')).toHaveAccessibleName(/away team visits/i);
});

test('release: 200-percent browser zoom allows scoring and report dismissal', async ({page}) => {
  await page.setViewportSize({width:800,height:900});
  await startLiveMatch(page,'/',false,['HOME','AWAY'],'301');
  await page.evaluate(()=>{document.documentElement.style.zoom='2'});
  await page.locator('.keypad [data-key="6"]').scrollIntoViewIfNeeded();
  await page.locator('.keypad [data-key="6"]').click();
  await page.locator('.keypad [data-key="0"]').click();
  await page.locator('#enter-score').scrollIntoViewIfNeeded();
  await page.locator('#enter-score').click();
  await expect(page.locator('#last0')).toHaveText('60');
  await page.locator('#open-history0').scrollIntoViewIfNeeded();
  await page.locator('#open-history0').click();
  await expect(page.getByRole('dialog',{name:'All visit scores'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#shade')).toBeHidden();
});

// Review screenshots for visual sign-off. Opt-in: CAPTURE_SCREENSHOTS=1 writes to artifacts/review-screenshots/.
// Never screenshots of live customer fixtures; native device and screen-reader testing remains manual.
test('release: capture review screenshots for phone, landscape, tablet and dialogs', async ({page}) => {
  test.skip(!CAPTURE,'Set CAPTURE_SCREENSHOTS=1 to capture review screenshots');
  test.setTimeout(180_000);
  const themes=await themeIds(page);
  const resizeAndShot=async(name,width,height)=>{
    await page.setViewportSize({width,height});
    await waitForViewport(page,height);
    await capture(page,name);
  };
  await page.setViewportSize({width:412,height:915});
  await page.goto('/');
  await expect(page.locator('#landing')).toBeVisible();
  await page.evaluate(() => Promise.all([...document.querySelectorAll('#landing img')].map(img => img.decode().catch(() => {}))));
  for(const theme of themes){await setTheme(page,theme);await capture(page,`01-landing-${theme}-phone`);}
  await page.locator('#menu-toggle').click();
  await page.getByRole('button',{name:/theme/i}).click();
  await expect(page.locator('.theme-choice').first()).toBeVisible();
  await capture(page,'01a-theme-picker-phone');
  await page.keyboard.press('Escape');
  await expect(page.locator('#shade')).toBeHidden();
  await page.getByRole('button',{name:'Start a match'}).click();
  await page.locator('#team0').fill('WHEATSHEAF B');
  await page.locator('#team1').fill('GEORGE AND DRAGON');
  for(const theme of themes){await setTheme(page,theme);await capture(page,`02-setup-${theme}-phone`);}
  await startLiveMatch(page,'/',false,['WHEATSHEAF B','GEORGE AND DRAGON'],'501');
  await capture(page,'03-scorer-phone');
  await page.locator('#open-history0').click();
  await expect(page.locator('#dialog-title')).toHaveText('All visit scores');
  await capture(page,'04-visit-history-phone');
  await page.keyboard.press('Escape');
  await expect(page.locator('#shade')).toBeHidden();
  for(const key of ['1','8','0']) await page.locator(`[data-key="${key}"]`).click();
  await expect(page.locator('#draft')).toHaveText('180');
  for(const theme of themes){
    await setTheme(page,theme);
    for(const [width,height] of [[390,844],[844,390],[1024,768],[800,1333],[1280,720],[1512,900],[1728,1117]])await resizeAndShot(`05-scorer-${theme}-${width}x${height}`,width,height);
  }
  await page.setViewportSize({width:1702,height:1076});
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#app-menu')).toBeVisible();
  await page.locator('#fullscreen-game').click();
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBeTruthy();
  await capture(page,'06-scorer-laptop-fullscreen');
  await page.evaluate(()=>document.exitFullscreen());
  await expect.poll(()=>page.evaluate(()=>!document.fullscreenElement)).toBeTruthy();
  await page.setViewportSize({width:360,height:740});
  await page.evaluate(()=>localStorage.removeItem('wheatsheaf-team-scorer-v3'));
  await reachGameCompleteHighlights(page);
  for(const theme of themes){await setTheme(page,theme);await capture(page,`07-game-result-${theme}-phone`);}
  await page.evaluate(()=>localStorage.removeItem('wheatsheaf-team-scorer-v3'));await page.reload();
  await completeOneGame(page);
  await expect(page.locator('#archive-status')).toHaveText('Saved to Match history on this device.');
  await capture(page,'08-fixture-result-phone');
  await tapDialogButton(page.locator('#dialog-actions').getByRole('button',{name:'New match',exact:true}),()=>expect(page.locator('#shade')).toBeHidden({timeout:300}));
  await expect.poll(()=>archivedFixtureCount(page)).toBeGreaterThan(0);
  await openGameMatchHistory(page);
  await expect(page.locator('#dialog-title')).toHaveText('Match history');
  await capture(page,'09-saved-history-phone');
  await page.keyboard.press('Escape');
  await page.goto('/');
  await startLiveMatch(page,'/',false,['HOME','AWAY'],'301');
  await page.evaluate(()=>{
    Storage.prototype.setItem=function(){throw new DOMException('Storage full','QuotaExceededError')};
  });
  await enterScore(page,60);
  await expect(page.getByRole('alertdialog',{name:'Match not saved'})).toBeVisible();
  await capture(page,'10-save-error-phone');
});

// The live scoring screen: one set of layout invariants, checked in every theme at every size below.
// Each group starts its match at its first size, so the first paint is checked there, then resizes like a person
// dragging the window. Sizes kept for past bugs: 412×915 (phone keypad clipped on first paint, #46),
// 768×1024 (portrait tablet keypad off screen, #65), 360×640 and 360×800 (HOME badge spilling out of the card, #78),
// 800×1333 (Fire Max 11), 844×390 (short landscape, also with the offline badge), 1280×560 (wide short landscape).
function scoringScreen(page) {
  return page.evaluate(new Function(`${overlapsFn}
    const vh=window.visualViewport?.height??innerHeight;
    const box=el=>(typeof el==='string'?document.querySelector(el):el).getBoundingClientRect();
    const shown=el=>el&&el.getClientRects().length>0;
    const inside=(r,b)=>r.left>=b.left-1&&r.right<=b.right+1&&r.top>=b.top-1&&r.bottom<=b.bottom+1;
    const textOf=el=>{const range=document.createRange();range.selectNodeContents(el);return range.getBoundingClientRect();};
    const keys=[...document.querySelectorAll('.keypad button')];
    const digitKeys=keys.filter(k=>/^\\d$/.test(k.dataset.key||''));
    const submit=box('#enter-score'),noScore=box('#no-score'),visitEntry=box('.visit-entry');
    const readouts=['.visit-heading','#draft','#preview'].map(s=>document.querySelector(s)).filter(Boolean).map(textOf).filter(r=>r.width&&r.height);
    const big=r=>r.width>=44&&r.height>=44;
    const lum=c=>{const [r,g,b]=(c.match(/[\\d.]+/g)||[]).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;};
    const undo=getComputedStyle(document.querySelector('#undo')),uf=lum(undo.color),ub=lum(undo.backgroundColor);
    const header=box('#app-header'),scorebar=document.querySelector('.scorebar'),progress=document.querySelector('.progress');
    const smallText=[...document.querySelectorAll('#game *')]
      .filter(el=>el.getClientRects().length&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))
      .filter(el=>parseFloat(getComputedStyle(el).fontSize)<12)
      .map(el=>(el.id||el.className||el.tagName)+' '+getComputedStyle(el).fontSize);
    const cards=[0,1].map(i=>document.querySelector('#card'+i));
    return {
      noHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth+1,
      keypadOnScreen:keys.every(k=>{const r=box(k);return r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=vh+1;}),
      keysTapSized:keys.every(k=>big(box(k))),
      tenDigitKeys:new Set(digitKeys.map(k=>k.dataset.key)).size===10,
      controlsTapSized:['#enter-score','#no-score','#menu-toggle','#open-history0','#open-history1'].every(s=>big(box(s))),
      noScoreClear:![submit,visitEntry,...keys.filter(k=>k.id!=='no-score').map(box)].some(r=>overlaps(noScore,r)),
      submitTextFits:inside(textOf(document.querySelector('#enter-score')),submit),
      visitTextFits:readouts.every(r=>inside(r,visitEntry)&&!overlaps(r,submit)&&digitKeys.every(k=>!overlaps(r,box(k)))),
      cardsClearOfKeypad:!overlaps(box('.cards'),box('.keypad')),
      headerAtMost15Percent:header.height/innerHeight<=0.15,
      headerClear:!shown(scorebar)||!overlaps(header,box(scorebar)),
      progressClear:!shown(scorebar)||!shown(progress)||!overlaps(box(scorebar),box(progress)),
      scoresOnScreen:[0,1].every(i=>{const r=box('#remaining'+i);return r.top>=0&&r.bottom<=vh+1;}),
      fiveVisitsEachSide:[0,1].every(i=>document.querySelector('#history'+i).children.length===5),
      visitsOnScreen:[...document.querySelectorAll('.history span')].every(s=>box(s).bottom<=innerHeight+1),
      lastScoreClearOfHistory:[0,1].every(i=>!overlaps(box('#last'+i),box('#open-history'+i))),
      cardChildrenInside:cards.every(card=>{const c=box(card);return ['.turn','.card-side','.player-stat-value'].every(s=>[...card.querySelectorAll(s)].filter(shown).every(el=>inside(box(el),c)));}),
      namesNotClipped:[0,1].every(i=>{const el=document.querySelector(innerWidth>=1000?'#card-team'+i:'#mini'+i);return el.scrollWidth<=el.clientWidth+1;}),
      labelsClearOfScore:!shown(document.querySelector('.score-summary'))||['#fixture-label','#game-label'].every(s=>!shown(document.querySelector(s))||!overlaps(box(s),box('.score-summary')))||Object.fromEntries(['#fixture-label','#game-label','.score-summary','.match-status'].map(s=>{const r=box(s);return [s,[r.left,r.right,r.top,r.bottom].map(Math.round)];})),
      statValuesFit:[...document.querySelectorAll('.player-stat-value')].every(el=>el.scrollWidth-el.clientWidth<=1),
      undoLegible:Number(undo.opacity)===1&&(Math.max(uf,ub)+.05)/(Math.min(uf,ub)+.05)>=4.5,
      textAtLeast12px:smallText.length?smallText:true,
    };`));
}
function expectScoringScreen(m,label){
  for(const [name,ok] of Object.entries(m))expect.soft(ok,`${label}: ${name}`).toBe(true);
}
for (const [group,sizes] of [
  ['phone',[[412,915],[360,640],[360,740],[360,800],[390,844],[412,700]]],
  ['tablet and landscape phone',[[768,1024],[800,1280],[800,1333],[844,390],[1024,768]]],
  ['desktop',[[1280,800],[1280,560],[1512,900],[1702,1076],[1728,1117]]],
]) {
  test(`${group} scoring screen keeps its layout invariants in every theme`, async ({page}) => {
    const themes=await themeIds(page);
    await page.setViewportSize({width:sizes[0][0],height:sizes[0][1]});
    await startLiveMatch(page,'/',false,['WHEATSHEAF B','GEORGE AND DRAGON'],'501');
    expectScoringScreen(await scoringScreen(page),`first paint ${sizes[0].join('×')}`);
    await enterScore(page,140);
    await expect(page.locator('#player-average0')).toHaveText('140.0');
    for(const key of ['1','8','0'])await page.locator(`.keypad [data-key="${key}"]`).click();
    for(const [width,height] of sizes){
      await page.setViewportSize({width,height});
      await waitForViewport(page,height);
      await settleAnimations(page);
      for(const theme of themes){
        await setTheme(page,theme);
        expectScoringScreen(await scoringScreen(page),`${theme} ${width}×${height}`);
        expectScoreDigits(await scoreDigits(page),`${theme} ${width}×${height}`);
        if(width>height)expectLandscapeInvariants(await landscapeGeometry(page),`${theme} ${width}×${height}`);
      }
      if(width===844){
        await page.context().setOffline(true);
        await expect(page.locator('#offline-pill')).toBeVisible();
        expectScoringScreen(await scoringScreen(page),`offline ${width}×${height}`);
        await page.context().setOffline(false);
      }
    }
  });
}
