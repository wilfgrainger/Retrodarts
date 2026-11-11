'use strict';
// Stress test of the scoring maths (scripts/check.cjs runs a short fixed-seed pass).
// Plays thousands of random fixtures through the app's own scoring code, with random formats, busts, finishes and
// undos, and after every action recalculates scores, legs, games, averages, reports and saved state from the visit log.
//
//   node tests/fuzz.cjs                 1000 fixtures, random seed
//   node tests/fuzz.cjs 20000           more fixtures
//   node tests/fuzz.cjs 5000 12345      repeat a run exactly with its seed
//
// A failure prints the seed, fixture number and the last actions so the run can be repeated.
(async()=>{
const assert=require('assert');
const fixtures=Number(process.argv[2])||1000,seed=Number(process.argv[3])||Math.floor(Math.random()*2**31);
let rng=seed>>>0;const rand=()=>{rng=(rng+0x6D2B79F5)>>>0;let t=rng;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
const int=(a,b)=>a+Math.floor(rand()*(b-a+1)),pick=a=>a[Math.floor(rand()*a.length)],chance=p=>rand()<p;

const {harness}=await import('./helpers/app-harness.mjs');
const h=harness({pageFixtures:async()=>({summaries:[],more:false,last:null})},{api:`startMatch,record,nextLeg,nextGame,applyUndo,startFirstGame,startDecider,continueAfterResult,load,get:()=>state,fixtureReports,reportableFixture,checkoutHint,resultText,initialize,targetLegs,average`}),{$}=h,a=h.api;await a.initialize();

// Checkout hints: every score from 2 to 170 either has a valid double-out finish in three darts or is a known bogey number.
const dartValue=d=>d==='Bull'?50:d==='25'?25:d[0]==='T'?3*d.slice(1):d[0]==='D'?2*d.slice(1):Number(d);
const bogey=[159,162,163,165,166,168,169];
for(let r=0;r<=200;r++){const h=a.checkoutHint(r);
  if(r<2||r>170||bogey.includes(r)){assert.equal(h,null,'no checkout hint for '+r);continue;}
  const darts=h.split(' '),last=darts[darts.length-1];
  assert(darts.length<=3&&darts.reduce((n,d)=>n+dartValue(d),0)===r&&(last==='Bull'||last[0]==='D'),'checkout hint '+h+' for '+r);}

const strip=s=>{const c=JSON.parse(JSON.stringify(s));delete c.undo;return c;};
let actions=[],totals={fixtures:0,visits:0,busts:0,undos:0,draws:0};
function check(){
  const s=a.get(),st=s.settings,start=st.startScore,target=a.targetLegs();
  assert(a.reportableFixture(s),'the fixture is always valid for reports and saving');
  assert.deepEqual(strip(a.load(h.raw())),strip(s),'what was saved reloads exactly');
  // Fixture: games won match the results, and the fixture ends exactly when its format says.
  for(const i of [0,1])assert.equal(s.teams[i].games,s.results.filter(r=>r.winner===i).length,'games won match results');
  const done=s.results.length,w=s.teams.map(t=>t.games),count=st.gameCount;
  const shouldEnd=st.gameMode==='first'?Math.max(...w)>=count:st.gameMode==='best'?(Math.max(...w)>count/2||done>=count):done>=count;
  if(s.phase==='game-result'||s.phase==='complete')assert.equal(!!s.fixtureFinished,shouldEnd,'fixture finishes exactly when the format says');
  if(['live','between-leg','decider-starter','between-game','choose-starter'].includes(s.phase))assert(!shouldEnd,'no play after the fixture is decided');
  assert(done<=(st.gameMode==='first'?2*count-1:count),'never more games than the format allows');
  for(const r of s.results){
    if(Array.isArray(r.visits)&&Array.isArray(r.averages))for(const i of [0,1]){const v=r.visits.filter(x=>x.side===i);assert.equal(r.averages[i],v.length?(v.reduce((n,x)=>n+x.score,0)/v.length).toFixed(1):'—','saved game average is points per visit');}assert(Math.max(...r.legs)===target&&Math.min(...r.legs)<target,'a game ends when one side reaches the leg target');assert.equal(r.legs[r.winner],target);}
  // Current game, from the visit log alone.
  const log=s.log.slice().reverse(),legs=[0,0],points=[0,0],visits=[0,0],byLeg=new Map();
  for(const v of log){
    assert(v.game===s.gameNumber,'the log holds only the current game');
    if(!byLeg.has(v.leg))byLeg.set(v.leg,{left:[start,start],turn:v.side,done:false});
    const L=byLeg.get(v.leg);assert(!L.done,'no visit after a leg is won');assert.equal(v.side,L.turn,'sides alternate within a leg');L.turn=1-v.side;
    points[v.side]+=v.score;visits[v.side]++;
    if(v.bust){assert.equal(v.score,0,'a bust scores nothing');continue;}
    const after=L.left[v.side]-v.score;assert(after===0||after>=2,'a counted visit never leaves 1 or less than 0');L.left[v.side]=after;
    if(after===0){assert(v.score>0,'a leg is won only by scoring');L.done=true;legs[v.side]++;}
  }
  for(const i of [0,1]){
    const p=s.players[i];
    assert.equal(p.legs,legs[i],'legs won match the log');assert.equal(p.points,points[i],'points match the log');assert.equal(p.darts,visits[i]*3,'visits match the log');
    assert.equal(a.average(p),visits[i]?(points[i]/visits[i]).toFixed(1):'—','average is points per visit');
  }
  const cur=byLeg.get(s.legNumber);
  if(s.phase==='live'){
    for(const i of [0,1])assert.equal(s.players[i].remaining,cur?cur.left[i]:start,'remaining matches the log');
    if(cur)assert.equal(s.current,cur.turn,'the right side is throwing');
    else if(!(Math.max(...legs)===target-1&&Math.min(...legs)===target-1&&s.legNumber>1))assert.equal(s.current,s.gameStarter^((s.legNumber-1)%2),'leg starters alternate');
  }
  if(s.phase==='decider-starter')assert(legs[0]===target-1&&legs[1]===target-1,'a bull-up is asked only for a deciding leg');
  // Reports: highest score and checkout per side match the log.
  const rep=a.fixtureReports(s).find(g=>g.number===s.gameNumber);
  if(rep&&s.phase!=='between-game'){
    const hi=[0,1].map(i=>Math.max(0,...log.filter(v=>v.side===i).map(v=>v.score))),co=[0,1].map(i=>{let m=0;const left=new Map();for(const v of log){const k=v.leg+':'+v.side,l=(left.get(k)??start)-v.score;left.set(k,l);if(v.side===i&&l===0&&v.score>0)m=Math.max(m,v.score);}return m;});
    for(const i of [0,1]){assert.equal(rep.highestScore[i]??0,hi[i],'report top score');assert.equal(rep.highestCheckout[i]??0,co[i],'report top checkout');}
  }
}
async function act(name,fn){actions.push(name);if(actions.length>12)actions.shift();await fn();check();}
async function undoCheck(){
  if(!a.get().undo.length)return;
  const prior=undoStack.pop();await act('undo',()=>a.applyUndo());totals.undos++;
  if(prior)assert.deepEqual(strip(a.get()),prior,'undo returns to exactly the state before the last action');
}
let undoStack=[];
async function step(name,fn){undoStack.push(strip(a.get()));if(undoStack.length>100)undoStack.shift();await act(name,fn);}

for(let f=1;f<=fixtures;f++){
  try{
    actions=[];undoStack=[];
    const gameMode=pick(['all','best','first']),legMode=pick(['best','first']);
    const set={'start-score':String(pick([301,401,501])),'game-mode':gameMode,'game-count':String(int(1,gameMode==='all'?8:5)),'leg-mode':legMode,'leg-count':String(legMode==='best'?pick([1,3,5]):int(1,3))};
    for(const [k,v] of Object.entries(set))$(k).value=v;$('team0').value='HOME '+f;$('team1').value='AWAY '+f;
    await a.startMatch();assert.equal(a.get().phase,'choose-starter');
    let guard=0;
    while(a.get().phase!=='complete'){
      if(++guard>20000)throw new Error('fixture did not finish');
      const s=a.get();
      if(s.phase==='choose-starter'){s.pendingStarter=int(0,1);await act('bull-up '+s.pendingStarter,()=>a.startFirstGame());undoStack=[];}
      else if(s.phase==='decider-starter'){s.pendingStarter=int(0,1);await act('decider '+s.pendingStarter,()=>a.startDecider());}
      else if(s.phase==='between-game'){s.pendingStarter=int(0,1);await step('next game '+s.pendingStarter,()=>a.nextGame());}
      else if(s.phase==='between-leg'){if(chance(.1))await undoCheck();else await step('next leg',()=>a.nextLeg());}
      else if(s.phase==='game-result'){if(chance(.08))await undoCheck();else await act('continue',()=>a.continueAfterResult());}
      else if(s.phase==='live'){
        if(chance(.04)&&s.undo.length){await undoCheck();continue;}
        const left=s.players[s.current].remaining;let n,bust=false;const r=rand();
        if(left<=170&&r<.25)n=left;                       // try to finish (any total equal to what is left)
        else if(r<.30)n=Math.min(180,left-1);              // leaves one: bust
        else if(r<.34)n=Math.min(180,left+int(1,40));      // overscores: bust unless capped at exactly left
        else if(r<.37){n=int(0,180);bust=true;}            // marker calls a bust
        else n=chance(.1)?0:pick([26,41,45,60,81,85,100,140,180,int(1,180)]);
        if(n<0)n=0;
        const willBust=bust||left-n<0||left-n===1;if(willBust)totals.busts++;
        totals.visits++;await step('visit '+n+(bust?' (bust)':'')+' on '+left,()=>a.record(n,bust));
      }
    }
    const s=a.get();if(s.teams[0].games===s.teams[1].games)totals.draws++;
    const text=a.resultText(s);assert(text.startsWith(s.teams[0].name+' '+s.teams[0].games+'–'+s.teams[1].games+' '+s.teams[1].name),'share text leads with the score');
    totals.fixtures++;
  }catch(e){
    console.error('\nFAILED on fixture '+f+' (seed '+seed+'): '+e.message);
    console.error('Settings: '+JSON.stringify(a.get().settings));
    console.error('Last actions: '+actions.join(' → '));
    console.error('Repeat with: node tests/fuzz.cjs '+fixtures+' '+seed);
    process.exit(1);
  }
}
console.log(`FUZZ PASS: ${totals.fixtures} fixtures, ${totals.visits} visits (${totals.busts} busts), ${totals.undos} undos, ${totals.draws} drawn fixtures. Seed ${seed}.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
