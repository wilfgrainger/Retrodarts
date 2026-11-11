'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const js=require('./helpers/app-script.cjs')('reportGame,fixtureReports,reportableFixture,buildPdf,setState:x=>state=x,getState:()=>state');
const sandbox={localStorage:{getItem:()=>null},console,Date};vm.createContext(sandbox);vm.runInContext(js,sandbox);
const a=sandbox.api,chron=[];
[38,86,89,88].forEach((score,i)=>{chron.push({game:1,leg:1,side:0,score,bust:false});if(i<3)chron.push({game:1,leg:1,side:1,score:[55,77,8][i],bust:false});});
const before=JSON.stringify(chron),r=a.reportGame({number:1,visits:chron.slice().reverse()},301);
assert.equal(r.legs[0].rows.length,4);assert.equal(r.legs[0].rows[0][0].left,263);assert.equal(r.legs[0].rows[0][1].left,246);
assert.equal(r.legs[0].rows[3][1],null,'opponent has not thrown in the checkout round');
assert.equal(r.legs[0].rows[3][0].checkout,true);assert.equal(r.legs[0].winner,0);assert.equal(r.legs[0].checkout,88);
assert.equal(r.legs[0].stats[0].visits,4);assert.equal(r.legs[0].stats[0].average,'75.3');assert.equal(r.legs[0].stats[1].average,'46.7');
assert.equal(r.highestScore[0],89);assert.equal(r.highestCheckout[0],88);assert.equal(r.highestCheckout[1],null);assert.equal(JSON.stringify(chron),before,'reports never mutate stored visits');
const away=a.reportGame({number:2,visits:[{game:2,leg:1,side:1,score:121},{game:2,leg:1,side:0,score:0,bust:true},{game:2,leg:1,side:1,score:180}]},301);
assert.equal(away.legs[0].starter,1);assert.equal(away.legs[0].rows[0][0].bust,true);assert.equal(away.legs[0].rows[0][0].left,301);assert.equal(away.legs[0].winner,1);assert.equal(away.legs[0].rows[1][0],null);
const absent=a.reportGame({number:1},301);assert.equal(absent.available,false,'legacy history is not invented');
const live={phase:'live',settings:{startScore:301,gameMode:'all',gameCount:8,legMode:'best',legCount:3},teams:[{name:'ACTIVE HOME',games:0},{name:'ACTIVE AWAY',games:0}],results:[],gameNumber:1,legNumber:1,players:[{legs:0},{legs:0}],log:[{game:1,leg:1,side:0,score:60,bust:false}]};
a.setState(live);const liveBefore=JSON.stringify(a.getState());
const games=[];
for(let number=1;number<=8;number++){
  const winner=number%2===1?0:1,visits=[];
  for(let leg=1;leg<=2;leg++){
    visits.push({game:number,leg,side:winner,score:180,bust:false});
    visits.push({game:number,leg,side:1-winner,score:0,bust:false});
    visits.push({game:number,leg,side:winner,score:121,bust:false});
  }
  games.push({number,winner,legs:winner===0?[2,0]:[0,2],visits:visits.reverse()});
}
const finalFixture={phase:'complete',fixtureFinished:true,settings:{startScore:301,gameMode:'all',gameCount:8,legMode:'best',legCount:3},teams:[{name:'WHEAT',games:4},{name:'EAGLES',games:4}],results:games,gameNumber:8,legNumber:2,log:games[7].visits,players:[{legs:0},{legs:2}]};
assert.equal(a.reportableFixture(finalFixture),true,'a complete local fixture can be reported');
const reports=a.fixtureReports(finalFixture);assert.equal(reports.length,8,'the final game is not duplicated');
assert.equal(reports.reduce((count,game)=>count+game.legs.reduce((n,leg)=>n+leg.sides[0].length+leg.sides[1].length,0),0),48,'all retained visit entries appear in report rows');
assert.equal(reports.reduce((count,game)=>count+game.legs.filter(leg=>leg.winner!==null).length,0),16,'both legs from every game are represented');
const fullPdf=a.buildPdf(finalFixture);assert(fullPdf.startsWith('%PDF-1.4'));
assert(/FINAL\b.*WHEAT 4 - 4 EAGLES.*Match drawn/.test(fullPdf),'overall match score and drawn result are present');
assert(fullPdf.includes('FORMAT: 301 start | Play all 8 games | Best of 3 legs'),'fixture format is present');
assert(fullPdf.includes('Game 1: 2-0 legs | WHEAT won')&&fullPdf.includes('Game 8: 0-2 legs | EAGLES won'),'game-by-game leg score and winner are present');
assert.equal((fullPdf.match(/CHECKOUT/g)||[]).length,16,'all 16 recorded finishing visits are present exactly once');
assert(fullPdf.includes('started by EAGLES'),'leg starter is reported');
// Branding: every page carries the footer.
assert(fullPdf.includes('RETRODARTS.COM')&&fullPdf.includes('MATCH REPORT'),'branding is present');
assert.equal((fullPdf.match(/RETRODARTS\.COM/g)||[]).length,(fullPdf.match(/\/Type \/Page /g)||[]).length,'every page carries the footer');
assert(fullPdf.includes('Highest score')&&fullPdf.includes('Highest checkout'),'existing high-score summaries remain');
assert.equal(JSON.stringify(a.getState()),liveBefore,'building a saved fixture report does not replace or mutate the live fixture');
if(process.env.REPORT_SAMPLE)fs.writeFileSync(process.env.REPORT_SAMPLE,fullPdf,'ascii');
const fixture={phase:'live',settings:{startScore:301,gameMode:'all',gameCount:8,legMode:'best',legCount:3},teams:[{name:'WHEAT',games:1},{name:'EAGLES',games:0}],results:[{number:1,legs:[1,0],visits:chron.slice().reverse()},{number:2}],gameNumber:3,legNumber:1,players:[{legs:0},{legs:0}],log:[]};
a.setState(fixture);assert.equal(a.fixtureReports().length,3,'current and previous games appear once');assert.equal(a.fixtureReports()[1].available,false,'missing old visits stay explicit');
fixture.gameNumber=1;fixture.log=chron.slice(0,-1).reverse();a.setState(fixture);assert.equal(a.fixtureReports()[0].legs[0].winner,null,'Undo removes checkout even if stored result has an older finish');
// Regression: FIRST TO N legs can need up to 2N-1 legs. A first-to-2 game that reaches leg 3
// must stay reportable (PDF export) and displayable (archived fixtures use the same check).
const ft=[];for(let leg=1;leg<=3;leg++){const w=leg===2?1:0;ft.push({game:1,leg,side:w,score:180,bust:false},{game:1,leg,side:1-w,score:0,bust:false},{game:1,leg,side:w,score:121,bust:false});}
const firstTo={phase:'complete',fixtureFinished:true,settings:{startScore:301,gameMode:'all',gameCount:1,legMode:'first',legCount:2},teams:[{name:'WHEAT',games:1},{name:'EAGLES',games:0}],results:[{number:1,winner:0,legs:[2,1],visits:ft.slice().reverse()}],gameNumber:1,legNumber:3,log:ft.slice().reverse(),players:[{legs:2},{legs:1}]};
assert.equal(a.reportableFixture(firstTo),true,'a first-to-2 game that went to leg 3 is reportable');
const ftPdf=a.buildPdf(firstTo);assert(ftPdf.startsWith('%PDF-1.4'),'first-to-2 leg 3 fixture exports a PDF');assert(ftPdf.includes('First to 2 legs'),'first-to format is printed');
assert.equal(a.fixtureReports(firstTo)[0].legs.length,3,'all three legs of the first-to-2 game are reported');
const tooFar=JSON.parse(JSON.stringify(firstTo));tooFar.log.unshift({game:1,leg:4,side:0,score:60,bust:false});assert.equal(a.reportableFixture(tooFar),false,'a leg beyond the format maximum is still rejected');
const bestOf=JSON.parse(JSON.stringify(firstTo));bestOf.settings.legMode='best';bestOf.settings.legCount=2;assert.equal(a.reportableFixture(bestOf),false,'best-of legs stay capped at legCount');
// FIRST TO N games can need up to 2N-1 games: a first-to-2 fixture decided in game 3 must stay reportable and archivable.
const ftGames=JSON.parse(JSON.stringify(firstTo));ftGames.settings.gameMode='first';ftGames.settings.gameCount=2;ftGames.teams=[{name:'WHEAT',games:2},{name:'EAGLES',games:1}];
ftGames.results=[{number:1,winner:0,legs:[2,0]},{number:2,winner:1,legs:[0,2]},{number:3,winner:0,legs:[2,1],visits:ft.slice().reverse()}];ftGames.gameNumber=3;
assert.equal(a.reportableFixture(ftGames),true,'a first-to-2 fixture decided in game 3 is reportable');
assert(a.buildPdf(ftGames).includes('Game 3:'),'game 3 of a first-to-2 fixture is in the PDF');
const ftTooFar=JSON.parse(JSON.stringify(ftGames));ftTooFar.results.push({number:4,winner:0,legs:[2,0]});assert.equal(a.reportableFixture(ftTooFar),false,'a game beyond 2N-1 is still rejected');
const allCapped=JSON.parse(JSON.stringify(ftGames));allCapped.settings.gameMode='all';assert.equal(a.reportableFixture(allCapped),false,'play-all games stay capped at gameCount');
if(process.env.LONG_REPORT_SAMPLE){fixture.results=[];fixture.log=Array.from({length:900},(_,i)=>({game:1,leg:1,side:i%2,score:0,bust:false})).reverse();a.setState(fixture);fs.writeFileSync(process.env.LONG_REPORT_SAMPLE,a.buildPdf(),'ascii');}
console.log('index.html PAIRED VISITS / CHECKOUT / STATS / COMPLETE FIXTURE / ARCHIVE ISOLATION / PDF PASS');
