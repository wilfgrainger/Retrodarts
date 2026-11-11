'use strict';
// Draws the scoreboard from one small message per visit. Team names arrive as text and are set with textContent.
var NS='urn:x-cast:com.retrodarts.score',THEMES=['retro','led','modern','pub-oche'];
function $(id){return document.getElementById(id);}
function text(v){return typeof v==='string'||typeof v==='number'?String(v).slice(0,40):'';}
function drawScore(m){
  if(!m||typeof m!=='object'||!Array.isArray(m.teams)||m.teams.length!==2)return;
  if(THEMES.indexOf(m.theme)>-1)document.documentElement.setAttribute('data-theme',m.theme);
  $('idle').hidden=!!m.playing;$('board').hidden=!m.playing;
  $('banner').hidden=!(m.playing&&m.banner);$('banner').textContent=text(m.banner);
  if(!m.playing)return;
  $('format').textContent=text(m.format);$('pos').textContent=text(m.pos);
  $('games').textContent=text(m.teams[0].games)+'-'+text(m.teams[1].games);
  for(var i=0;i<2;i++){var t=m.teams[i]||{};
    $('c'+i).classList.toggle('on',!!t.on);$('turn'+i).textContent=t.on?'Throwing':'Waiting';
    $('name'+i).textContent=text(t.name);$('left'+i).textContent=text(t.left);
    $('last'+i).textContent=text(t.last);$('legs'+i).textContent=text(t.legs);$('avg'+i).textContent=text(t.avg);}
}
window.drawScore=drawScore;
if(/[?&]demo\b/.test(location.search)){
  // Browser preview with no Chromecast: /tv/?demo
  var left=[301,301],n=0;
  var tick=function(){var s=n%2,hit=[60,45,100,26,81,41][n%6];if(n)left[s]=left[s]-hit>1?left[s]-hit:301;
    drawScore({theme:(location.search.match(/theme=([a-z-]+)/)||[])[1]||'retro',playing:true,format:'First to 1 game',pos:'Game 1 · Leg 1',banner:'',
      teams:[0,1].map(function(i){return {name:i?'George and Dragon':'Wheatsheaf B',games:'0',left:left[i],last:n&&i===s?hit:'—',legs:'0',avg:n?'61.3':'—',on:n?i!==s:i===0};})});n++;};
  tick();if(!/static/.test(location.search))setInterval(tick,2500);
}else{
  var s=document.createElement('script');s.src='https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';
  s.onload=function(){
    var ctx=cast.framework.CastReceiverContext.getInstance(),o=new cast.framework.CastReceiverOptions();
    ctx.addCustomMessageListener(NS,function(e){drawScore(e.data);});
    o.disableIdleTimeout=true;o.skipPlayersLoad=true;o.customNamespaces={};o.customNamespaces[NS]=cast.framework.system.MessageType.JSON;
    ctx.start(o);
  };
  s.onerror=function(){$('idle-note').textContent='Could not reach Google Cast. Check the TV’s internet connection.';};
  document.head.appendChild(s);
}
