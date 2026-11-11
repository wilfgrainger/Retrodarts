(async()=>{
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const header=html.match(/<header\b[\s\S]*?<\/header>/)[0];
const appMenu=html.match(/<nav\b[^>]*id="app-menu"[\s\S]*?<\/nav>/)[0];
assert(header.includes('id="menu-toggle"')&&appMenu.includes('id="open-archive"')&&appMenu.includes('id="privacy-policy-link"'),'burger menu contains Match history and Privacy policy');
assert(appMenu.includes('mailto:support@retrodarts.com')&&/Version \d+\.\d+\.\d+/.test(appMenu),'burger menu shows support email and a semantic app version');

const {harness}=await import('./helpers/app-harness.mjs');
let vibrations=[],storageFail=false,clock=1000;const FakeDate=class extends Date {static now(){return clock}};
const h=harness({archiveCompleted:async record=>{const old=h.records.get(record.id);if(old&&JSON.stringify(old.fixture)!==JSON.stringify(record.fixture))throw Error('conflict');if(!old)h.records.set(record.id,structuredClone(record));return old||record;}},
 {api:`startMatch,record,nextLeg,nextGame,undo,applyUndo,load,get:()=>state,setState:x=>state=x,fixtureReports,reportableFixture,setDigit,handleKey,goToSetup,startFirstGame,startDecider,submit,toggleFullscreen,updateFullscreenButtons,showHistory,buildPdf,touchFeedback,openSetup,render,guardTransition,retrySave,getLoadWarning:()=>loadWarning,initialize,getPersistence:()=>persistenceState`,sandbox:{Date:FakeDate,navigator:{vibrate:n=>vibrations.push(n)}}});
const {$}=h,a=h.api,{document}=h.sandbox,Element=require('./helpers/element.cjs'),{saveActive}=h.store,{setItem}=h.sandbox.localStorage;
h.store.saveActive=async raw=>{if(storageFail)throw new Error('quota');return saveActive(raw);};
h.sandbox.localStorage.setItem=(k,v)=>{if(storageFail)throw new Error('quota');setItem(k,v);};
$('team0').value='Home team';$('team1').value='Away team';$('starter').value='0';
await a.initialize();
a.render();assert.equal($('landing').hidden,false,'new session starts on introduction');assert.equal($('setup').hidden,true,'setup opens on request');a.openSetup();assert.equal($('landing').hidden,true);assert.equal($('setup').hidden,false);
async function start(who){
 await a.startMatch();assert.equal(a.get().phase,'choose-starter','first game asks for a bull-up winner');
 assert.equal($('dialog-title').textContent,'Who won the bull-up?');assert.equal(a.load().phase,'choose-starter','the prompt survives reload');
 const total=a.get().players[0].remaining;await a.record(60,false);assert.equal(a.get().players[0].remaining,total,'no scoring before starter is chosen');
 assert.equal($('dialog-actions').querySelector('.primary').disabled,true);
 await a.startFirstGame();assert.equal(a.get().phase,'choose-starter','cannot start without a selection');
 const choices=$('dialog-content').children[0].children;
 assert.ok(choices[who].textContent.startsWith(who===0?'HOME · ':'AWAY · '));
 choices[who].click();assert.equal($('dialog-actions').querySelector('.primary').disabled,false);
 await $('dialog-actions').querySelector('.primary').click();assert.equal(a.get().phase,'live');assert.equal(a.get().current,who);assert.equal($('turn'+who).textContent,'▶ THROWING NOW');assert.equal($('turn'+(1-who)).textContent,'WAITING');
}

await start(0);assert.equal($('last0').textContent,'-');await a.record(180,false);assert.equal($('turn1').textContent,'▶ THROWING NOW');assert.equal($('turn0').textContent,'WAITING');assert.equal($('last0').textContent,'180');await a.record(0,false);assert.equal($('last1').textContent,'0');await a.record(120,false);assert.equal(a.get().players[0].remaining,121,'leaving one is a bust');assert.equal($('last0').textContent,'0','a burst scores zero');await a.record(0,false);await a.record(119,false);assert.equal(a.get().players[0].remaining,2);await a.record(0,false);await a.record(2,false);assert.equal(a.get().phase,'between-leg','verified exact zero finishes without a prompt');assert.equal($('last0').textContent,'2');await a.applyUndo();assert.equal(a.get().players[0].remaining,2,'undo finish');assert.equal($('last0').textContent,'119','undo restores previous last score');
console.log('BULL-UP PROMPTS / BOTH STARTERS / RELOAD PASS');
console.log('TOTAL ENTRY / ZERO FINISH / UNDO PASS');
$('game-mode').value='all';await start(0);
for(let game=0;game<8;game++){
 const winner=game%2,starter=a.get().gameStarter;
 for(let leg=0;leg<2;leg++){
  assert.equal(a.get().current,starter^(leg%2));if(a.get().current!==winner)await a.record(0,false);await a.record(180,false);await a.record(0,false);await a.record(121,false);
  if(leg===0){assert.equal(a.get().phase,'between-leg');await a.nextLeg();assert.equal($('last0').textContent,'-');assert.equal($('last1').textContent,'-');}
 }
 assert.equal(a.get().phase,'game-result','show result before progressing');assert.equal(a.load().phase,'game-result','result survives reload');assert.equal($('dialog-kicker').textContent,'GAME '+(game+1)+' COMPLETE');assert.ok($('dialog-title').textContent.includes('wins the game'));const board=$('dialog-content').children[0];assert.equal(board.children[1].children[1].textContent,String(a.get().teams[0].games));assert.equal(board.children[1].children[3].textContent,String(a.get().teams[1].games));assert.equal(board.children[2].children[1].children[0].textContent,String(a.get().players[0].legs));assert.equal(board.children[2].children[1].children[2].textContent,String(a.get().players[1].legs));await $('dialog-actions').querySelector('.primary').click();
 assert.ok(a.get().results[game].visits.length>0,'finished game visits retained');
 if(game<7){assert.equal(a.get().phase,'between-game');assert.equal($('dialog-title').textContent,'Who won the bull-up?');assert.equal(a.get().pendingStarter,null);let n=a.get().gameNumber;await a.nextGame();assert.equal(a.get().gameNumber,n);const chosen=game%2;const choices=$('dialog-content').children[0].children;assert.ok(choices[chosen].textContent.startsWith(chosen===0?'HOME · ':'AWAY · '));choices[chosen].click();await a.nextGame();assert.equal(a.get().current,chosen);}
}
assert.equal(a.get().phase,'complete');assert.equal(a.get().teams[0].games,4);assert.equal(a.get().teams[1].games,4);assert.equal(a.get().results.length,8);
assert.equal(a.load().results[0].visits.length,a.get().results[0].visits.length,'past game visits survive reload');
assert.equal(a.fixtureReports().length,8,'final fixture retains each game once');
const completePdf=a.buildPdf();assert.ok(completePdf.startsWith('%PDF-1.4'),'PDF content has valid signature');
if(process.env.PDF_SAMPLE)fs.writeFileSync(process.env.PDF_SAMPLE,completePdf,'ascii');
a.touchFeedback({pointerType:'touch',target:{closest:()=>({disabled:false})}});a.touchFeedback({pointerType:'mouse',target:{closest:()=>({disabled:false})}});a.touchFeedback({pointerType:'touch',target:{closest:()=>({disabled:true})}});assert.deepEqual(vibrations,[10],'only enabled touch button gives a short vibration');
assert($('dialog-actions').children.some(b=>b.textContent==='All visit scores'),'final fixture retains access to every game report');assert.equal($('dialog-actions').children[0].textContent,'Share result','full time leads with Share result, not New match');
const finalBoard=$('dialog-content').children[0];
assert.equal(finalBoard.className,'result-board final-board','final result uses the retro scoreboard');
assert.equal(finalBoard.children[0].textContent,'FINAL SCORE');
assert.equal(finalBoard.children[1].children[1].textContent,'4','final home score is visible in large LED digits');
assert.equal(finalBoard.children[1].children[3].textContent,'4','final away score is visible in large LED digits');
const gameRows=finalBoard.children[2].children[2].children;
assert.equal(gameRows.length,8,'all eight game results shown');
assert.equal(gameRows[0].children[1].textContent,'2-0','shows game leg score');
assert.equal(gameRows[0].children[2].textContent,a.get().teams[0].name,'shows who won each game by team name');
assert.equal(gameRows[1].children[2].textContent,a.get().teams[1].name,'away game winner shown by team name');
await a.applyUndo();assert.equal(a.get().phase,'live');assert.equal(a.get().results.length,7);
console.log('EIGHT-GAME DRAW / STARTERS / FINAL UNDO PASS');
$('start-score').value='501';$('game-mode').value='first';$('game-count').value='1';$('leg-mode').value='first';$('leg-count').value='1';await start(1);await a.record(60,false);assert.equal(a.get().players[1].remaining,441,'501 scoring without double-in enabled');await a.record(0,false);await a.record(180,false);await a.record(0,false);await a.record(180,false);await a.record(0,false);await a.record(81,false);assert.equal(a.get().phase,'complete','a one-game match goes straight to full time');assert.equal(a.get().players[1].darts,12);assert.equal(a.get().players[1].points,501);
console.log('501 / FIRST TO / AVERAGE INPUT PASS');
$('start-score').value='301';$('game-mode').value='best';$('game-count').value='8';$('leg-mode').value='best';$('leg-count').value='3';$('starter').value='0';await start(0);await a.record(180,false);await a.record(0,false);await a.record(180,false);assert.equal(a.get().players[0].remaining,121,'overscore is a bust');assert.equal($('last0').textContent,'0','bust last score is zero');await a.applyUndo();assert.equal($('last0').textContent,'180','undo restores last visit');assert.equal(a.get().current,0);
console.log('LAST SCORE / BUST / UNDO PASS');

$('start-score').value='501';$('game-mode').value='best';$('game-count').value='8';$('leg-mode').value='best';$('leg-count').value='3';await start(0);
for(const score of [10,20,30,40,50,60]){await a.record(score,false);await a.record(0,false);}
const history=i=>$('history'+i).children.map(x=>x.textContent);
assert.deepEqual(history(0),['20','30','40','50','60'],'shows the latest five home visits in order');
assert.deepEqual(history(1),['0','0','0','0','0'],'shows zero scores for away');
assert.equal(a.load().log.filter(v=>v.side===0&&v.leg===1).length,6,'visit history survives reload');
a.showHistory();
assert.equal($('dialog-kicker').textContent,'GAME 1 HISTORY','tapping a last-five panel opens current game');
const fullHistory=$('dialog-content').children[0];
assert.equal(fullHistory.className,'history-scroll','history uses a scrolling container');
assert.equal(fullHistory.children[1].children.length,1,'current leg appears in full history');
const initialRows=fullHistory.children[1].children[0].children[2].children[1].children;
assert.equal(initialRows.length,6,'12 team throws are paired into six visit rounds');
assert.equal(initialRows[0].children[1].textContent,'10','home score appears chronologically');
assert.equal(initialRows[0].children[2].textContent,'491','home remaining total is reconstructed');
assert.equal(initialRows[0].children[3].textContent,'0','away zero is paired with the home visit');
assert.equal(initialRows[0].children[4].textContent,'501','away remaining total is reconstructed');
assert.equal(initialRows[5].children[3].textContent,'0','last away visit is retained');
await $('dialog-actions').children[0].click();
assert.equal($('shade').hidden,true,'back closes history during live scoring');
assert.deepEqual(history(0),['20','30','40','50','60'],'last five remain unchanged after reviewing all');
await a.applyUndo();assert.deepEqual(history(1),['0','0','0','0','0'],'undo removes the latest visit and reveals the previous visit');await a.applyUndo();assert.deepEqual(history(0),['10','20','30','40','50'],'undo restores the previous home history');
await a.record(100,false);await a.record(0,false);await a.record(170,false);await a.record(0,false);await a.record(81,false);assert.equal(a.get().phase,'between-leg');
assert.equal($('dialog-actions').children[4].textContent,'All visit scores','finished-leg modal can open history');
await $('dialog-actions').children[4].click();
assert.equal($('dialog-content').children[0].children[1].children.length,1,'leg one history accessible from leg result');
await $('dialog-actions').children[0].click();
assert.equal($('dialog-kicker').textContent,'LEG COMPLETE','back restores leg result');
await a.nextLeg();assert.deepEqual(history(0),['-','-','-','-','-'],'new leg clears visible history');
await a.applyUndo();assert.deepEqual(history(0),['40','50','100','170','81'],'undoing a leg transition restores its history');
console.log('FIVE VISITS / ZERO / UNDO / LEG HISTORY PASS');

// The shared brand and menu stay visible across setup and live scoring.
await a.goToSetup();assert.equal($('app-header').hidden,false,'setup keeps the header');
await start(0);assert.equal($('app-header').hidden,false,'match keeps the header');assert.equal($('new-match').hidden,false,'new match remains available');
await a.goToSetup();assert.equal($('app-header').hidden,false,'header remains after leaving the match');
console.log('PERSISTENT HEADER / FULL-SCREEN MATCH / NEW MATCH PASS');

// A mistaken finishing score requires an explicit confirmation from the result screen.
$('start-score').value='301';$('game-mode').value='best';$('game-count').value='8';$('leg-mode').value='first';$('leg-count').value='1';await start(0);
await a.record(180,false);await a.record(0,false);await a.record(121,false);
assert.equal(a.get().phase,'game-result');assert.equal(a.get().teams[0].games,1);
await a.undo();assert.equal($('dialog-title').textContent,'Undo the last score?');
assert.equal($('dialog-actions').children[0].textContent,'Keep playing');assert.equal($('dialog-actions').children[1].textContent,'Undo last action');
await $('dialog-actions').children[1].click();assert.equal(a.get().phase,'live');assert.equal(a.get().teams[0].games,0);assert.equal(a.get().players[0].remaining,121);
await a.record(121,false);assert.equal(a.get().phase,'game-result');await $('dialog-actions').querySelector('.primary').click();assert.equal(a.get().phase,'between-game');assert.equal($('dialog-title').textContent,'Who won the bull-up?');
console.log('GAME RESULT / UNDO / NEXT BULL-UP PASS');

// Deciding leg of best-of-three must have a fresh bull-up, not alternating throw.
$('start-score').value='301';$('game-mode').value='best';$('game-count').value='8';$('leg-mode').value='best';$('leg-count').value='3';
await start(0);
await a.record(180,false);await a.record(0,false);await a.record(121,false);await a.nextLeg();
assert.equal(a.get().current,1,'second leg alternates starter');
await a.record(180,false);await a.record(0,false);await a.record(121,false);
assert.equal(a.get().players[0].legs,1);assert.equal(a.get().players[1].legs,1);
a.showHistory();
assert.equal($('dialog-content').children[0].children[1].children.length,2,'history groups all completed legs');
assert.equal($('dialog-content').children[0].children[1].children[1].children[0].textContent,'LEG 2');
await $('dialog-actions').children[0].click();
await a.nextLeg();
assert.equal(a.get().phase,'decider-starter','a tied deciding leg requires a new bull');
assert.equal(a.load().phase,'decider-starter','decider bull-up survives reload');
assert.equal($('dialog-title').textContent,'Who won the re-bull?');
await a.startDecider();assert.equal(a.get().phase,'decider-starter','cannot start without a new bull winner');
$('dialog-content').children[0].children[1].click();await a.startDecider();
assert.equal(a.get().phase,'live');
assert.equal(a.get().current,1,'chosen re-bull winner starts, overriding alternation');
assert.equal(a.get().legNumber,3);
assert.equal(a.get().players[0].remaining,301);
assert.equal($('last0').textContent,'-','previous leg does not leak last score');
await a.record(180,false);await a.record(0,false);await a.record(121,false);
assert.equal(a.get().phase,'game-result','decider finishes into existing game scoreboard');
assert.equal(a.get().players[1].legs,2);
assert.equal($('dialog-actions').children[3].textContent,'All visit scores','game result offers visit review');
await $('dialog-actions').children[3].click();
assert.equal($('dialog-content').children[0].children[1].children.length,3,'game summary includes all three legs');
assert.equal($('dialog-content').children[0].children[1].children[2].children[0].textContent,'LEG 3','deciding leg has its own section');
await $('dialog-actions').children[0].click();
assert.equal($('dialog-kicker').textContent,'GAME 1 COMPLETE','back restores game result');
console.log('BEST-OF-THREE DECIDER RE-BULL / RELOAD / THREE-LEG HISTORY PASS');

// Fullscreen is a deliberately invoked, capability-checked browser feature.
const root=new Element();
document.documentElement=root;
document.fullscreenEnabled=true;
root.requestFullscreen=()=>{document.fullscreenElement=root;return Promise.resolve();};
document.exitFullscreen=()=>{document.fullscreenElement=null;return Promise.resolve();};
a.toggleFullscreen();
assert.equal(document.fullscreenElement,root,'fullscreen includes the whole document, including result dialogs');
a.updateFullscreenButtons();assert.equal($('fullscreen-game').textContent,'EXIT FULL SCREEN');
a.toggleFullscreen();
assert.equal(document.fullscreenElement,null,'fullscreen can be exited on user action');
a.updateFullscreenButtons();assert.equal($('fullscreen').textContent,'Go full screen');
document.fullscreenEnabled=false;
a.toggleFullscreen();assert.equal($('toast').textContent,'Full screen is unavailable here','unsupported browser has a clear fallback');
console.log('FULLSCREEN CONTROLS / UNAVAILABLE FALLBACK PASS');


// An unusually long game cannot silently lose early visit scores.
$('start-score').value='501';$('leg-mode').value='best';$('leg-count').value='3';await start(0);
for(let i=0;i<900;i++)await a.record(0,false);
assert.equal(a.get().log.length,900,'900 visits preserved, including the previously reported 894-visit failure point');
assert.equal(a.load().log.length,900,'900 visits survive a simulated refresh');
assert(h.raw().length<5*1024*1024,'long game remains below a 5 MiB browser storage quota');
assert.deepEqual(history(0),['0','0','0','0','0'],'live last five remain present during long games');
assert.deepEqual(history(1),['0','0','0','0','0'],'away last five remain present during long games');
a.showHistory();
assert.equal($('dialog-content').children[0].children[1].children[0].children[2].children[1].children.length,450,'all 900 long-game throws appear in 450 paired rows');
await $('dialog-actions').children[0].click();
console.log('900 VISIT GAME / PERSISTENCE / FULL HISTORY / LAST-FIVE PASS');

// An old saved fixture may still carry the retired double-in setting.
$('start-score').value='301';await start(0);
const oldFixture=JSON.parse(h.raw());oldFixture.settings.doubleIn=true;oldFixture.players[0].opened=false;h.setRaw(JSON.stringify(oldFixture));
const migrated=a.load();assert.equal(migrated.players[0].remaining,301,'old fixture remains available');
a.get().settings.doubleIn=true;a.get().players[0].opened=false;
await a.record(60,false);assert.equal(a.get().players[0].remaining,241,'old double-in setting does not block scoring');
console.log('OLD SAVED FIXTURE / NO DOUBLE-IN BLOCK PASS');

$('start-score').value='501';$('game-mode').value='first';$('game-count').value='1';$('leg-mode').value='first';$('leg-count').value='1';

// Match-night zero scoring uses the keypad's 0 key and the normal Submit action.
$('start-score').value='301';$('game-mode').value='all';await start(0);
a.setDigit('0');
assert.equal($('draft').textContent,'0','zero appears in the visit entry');
await a.submit();
assert.equal(a.get().current,1,'submitting zero passes the throw');
assert.equal(a.get().players[0].remaining,301,'zero does not deduct any points');
assert.equal(a.get().players[0].lastScore,0,'zero appears as the last visit');
assert.equal(a.get().log[0].score,0,'zero is stored in visit history');
await a.applyUndo();
assert.equal(a.get().current,0,'undo still reverses a zero visit');
console.log('ZERO VIA KEYPAD + SUBMIT / UNDO PASS');

$('start-score').value='301';$('game-mode').value='all';await start(0);
a.handleKey('1');a.handleKey('2');a.handleKey('3');
assert.equal($('draft').textContent,'123','three digits can be entered');
a.handleKey('erase');
assert.equal($('draft').textContent,'12','Backspace erases just the last digit');
a.handleKey('erase');a.handleKey('erase');
assert.equal($('draft').textContent,'','repeated Backspace clears the whole entry');
a.handleKey('0');await a.submit();
assert.equal(a.get().players[0].lastScore,0,'zero scores normally after corrections');
console.log('SINGLE BACKSPACE / STANDARD ZERO / NO CLEAR PASS');


// A second physical tap must not hit a newly opened or closed dialog.
$('start-score').value='301';$('leg-mode').value='best';$('leg-count').value='3';await start(0);clock+=1000;await a.record(180,false);await a.record(0,false);await a.record(121,false);
assert.equal(a.get().phase,'between-leg');
function clickAttempt(detail,inDialog=true){const target={closest:sel=>sel==='#shade'&&inDialog?{}:null};const e={detail,target,prevented:false,stopped:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};a.guardTransition(e);return e;}
assert.equal(clickAttempt(1).prevented,true,'physical tap blocked immediately after result opens');
assert.equal(clickAttempt(0).prevented,false,'keyboard and assistive activation remains usable');
clock+=451;assert.equal(clickAttempt(1).prevented,false,'physical tap accepted after transition');
await a.nextLeg();assert.equal(clickAttempt(1).prevented,true,'physical tap on a dialog is blocked right after a transition');
assert.equal(clickAttempt(1,false).prevented,false,'keypad taps right after a dialog closes are not dropped');
clock+=451;assert.equal(clickAttempt(1).prevented,false);
console.log('DIALOG OPEN / CLOSE TAP GUARD PASS');

// A failed write must stop play and remain visible until persistence succeeds.
storageFail=true;await a.record(20,false);assert.equal($('save-blocker').hidden,false,'failed save displays blocking warning');assert.equal(clickAttempt(0).prevented,true,'background activation is blocked while saving fails');const safeClick={detail:0,target:{closest:()=>({})},preventDefault(){throw Error('recovery control blocked')},stopImmediatePropagation(){throw Error('recovery control blocked')}};a.guardTransition(safeClick);
storageFail=false;await a.retrySave();assert.equal($('save-blocker').hidden,true,'successful retry clears blocking warning');
assert.equal(a.load().log[0].score,20,'retry saves the visit without losing it');
console.log('BLOCKING SAVE FAILURE / RETRY PASS');
// Invalid saved data must not crash or disappear without warning.
const goodSaved=h.raw();
h.setRaw('{broken');assert.equal(a.load().phase,'setup');assert.ok(a.getLoadWarning(),'unreadable saved data triggers a warning');assert.equal(h.raw(),'{broken','invalid stored data is not overwritten');
const malformed=JSON.parse(goodSaved);malformed.current=7;h.setRaw(JSON.stringify(malformed));assert.equal(a.load().phase,'setup');assert.ok(a.getLoadWarning(),'invalid match structure triggers a warning');
const badWinner=JSON.parse(goodSaved);badWinner.phase='game-result';badWinner.gameWinner=null;h.setRaw(JSON.stringify(badWinner));assert.equal(a.load().phase,'setup');assert.ok(a.getLoadWarning(),'missing game winner triggers warning');
h.setRaw(goodSaved);assert.notEqual(a.load().phase,'setup');assert.equal(a.getLoadWarning(),'','valid save clears restore warning');
console.log('CORRUPT SAVE WARNING / PRESERVATION PASS');

// Damaged optional undo history must not make an otherwise readable match unplayable.
h.setRaw(goodSaved);assert.equal(a.load().undo.length,JSON.parse(goodSaved).undo.length,'valid Undo history survives reload');
const brokenUndo=JSON.parse(goodSaved);brokenUndo.undo=[{}];h.setRaw(JSON.stringify(brokenUndo));
const recovered=a.load();
assert.equal(recovered.players[0].remaining,brokenUndo.players[0].remaining,'preserve scores when Undo history is damaged');
assert.equal(recovered.log.length,brokenUndo.log.length,'preserve visits when Undo history is damaged');
assert.equal(recovered.undo.length,0,'discard malformed Undo snapshots before they can crash Undo');
Object.assign(a.get(),recovered);await assert.doesNotReject(async()=>await a.applyUndo(),'damaged Undo history cannot crash the restored game');
h.setRaw(goodSaved);
console.log('MALFORMED UNDO / MATCH RECOVERY PASS');

 assert(!/Download (?:recovery|saved record).*JSON/i.test(html),'the app has no user-facing JSON download');
 assert(!html.includes('id="save-json"'),'the app has no JSON save action');
 const liveBefore=JSON.stringify(a.get()),livePdf=a.buildPdf();
 assert(livePdf.startsWith('%PDF-1.4')&&livePdf.includes('Home team'),'the readable match PDF remains available');
 assert.equal(JSON.stringify(a.get()),liveBefore,'building a PDF never changes the live fixture');
 console.log('PDF-ONLY EXPORT / NO LIVE MUTATION PASS');


})().catch(error=>{console.error(error);process.exitCode=1});
