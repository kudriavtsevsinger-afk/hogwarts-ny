import test from 'node:test';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
import {beginAct1,tickAct1,act1Action,act1View,stepOf,actKey} from './act1.mjs';
import {ACT1_SCRIPT,PAINTINGS,ITEMS} from './act1-script.mjs';
import {HUNT,huntDuration,currentPainting,createHunt,createChimes,showChimes,chimeShowMs} from './party-games.mjs';
import {createBank} from './economy.mjs';import {OpeningRoom} from './worker.mjs';import {sceneSequence} from './scene01.mjs';
globalThis.crypto ||=webcrypto;const cast={oleg:'Олег',sima:'Сима',masha:'Маша',vanya:'Ваня',liza:'Лиза',amina:'Амина'};let nonce=0;
function roomFor(n=3){const ids=Object.keys(cast).slice(0,n),room={run:'test',host:'display',phase:'story',lineup:ids,players:new Map(ids.map(id=>[id,{id,token:id,answers:Array(8).fill(0)}])),bank:createBank()};beginAct1(room,1000);return room;}
function stage(r,id,time=1000){const a=r.act1;a.index=ACT1_SCRIPT.findIndex(s=>s.id===id);a.stepId=id;a.startedAt=time;a.clock=time;a.serial++;a.ready=[];a.vote=null;a.event=null;if(id==='hunt')a.hunt=createHunt(r.lineup,n=>n-1);if(id==='chimes'){a.chimes=createChimes(n=>n-1);showChimes(a.chimes,time);}}
function call(r,type,payload={},id='oleg',time=r.act1.clock){act1Action(r,r.players.get(id),type,{key:actKey(r),nonce:'request-'+(++nonce),...payload},time);}
function view(r,id='oleg',host=false,time=r.act1.clock){return act1View(r,cast,id,host,time).act;}
function buy(r,target){call(r,'propose',{kind:'item',target});const v=r.act1.vote;for(const id of r.lineup.slice(1,Math.ceil(r.lineup.length*.6)))call(r,'vote',{voteId:v.id,yes:true},id);}
for(const n of [3,4,5,6])test(`${n} players complete all scenes, personal portraits and six Simon rounds`,()=>{
 const r=roomFor(n);let now=1000,guard=0;const seen=new Set();
 while(++guard<150){tickAct1(r,now);const s=stepOf(r);seen.add(s.id);if(s.kind==='end')break;
  if(s.durationMs){now=r.act1.startedAt+s.durationMs;continue;}
  if(['ready','shop','note'].includes(s.kind)){if(s.kind==='shop')buy(r,'watch');for(const id of r.lineup)call(r,'ready',{},id,now);continue;}
  if(s.kind==='hunt'){
   const h=r.act1.hunt;for(let spawn=0;spawn<12;spawn++)for(let i=0;i<n;i++)call(r,'tap',{spawn,cell:h.schedule[spawn][i]},r.lineup[i],r.act1.startedAt+HUNT.lead+spawn*HUNT.interval+500);
   now=r.act1.startedAt+huntDuration;tickAct1(r,now);assert.equal(r.bank.balance,30);assert(r.act1.inventory.note);continue;
  }
  if(s.kind==='portraits'){assert(!JSON.stringify(view(r)).includes('ЗЕРКАЛО'));for(const id of r.lineup){let i;while((i=currentPainting(r,id))!==null)call(r,'answer',{painting:i,answer:PAINTINGS[i][1]},id,now);}continue;}
  if(s.kind==='chimes'){
   while(stepOf(r).kind==='chimes'){
    const g=r.act1.chimes;if(g.mode==='show'){now=g.modeAt+chimeShowMs(g);tickAct1(r,now);}
    while(g.mode==='input'){const pad=g.sequence[g.position];call(r,'chime',{pad,version:g.version},r.lineup[pad%n],now+=100);}
    assert.equal(g.mode,'success');now=g.modeAt+2200;tickAct1(r,now);
   }assert.equal(r.bank.balance,33);continue;
  }assert.fail(s.id);
 }
 assert(guard<150);assert.equal(stepOf(r).kind,'end');assert.equal(r.act1.solved.length,6);assert.equal(r.bank.ledger.filter(x=>x.key==='act1:chimes').length,1);assert(!seen.has('gear-rules'));assert(seen.has('gallery-journey'));
});
test('phone receives one assigned portrait; second assignment follows and other answers are forbidden',()=>{
 for(const n of [3,4,5,6]){const r=roomFor(n);stage(r,'portraits');for(let i=0;i<n;i++){const id=r.lineup[i],v=view(r,id);assert.equal(v.paintings.length,1);assert.equal(v.paintings[0].index,i);assert(v.paintings[0].clue);if(!r.act1.solved.includes((i+1)%6))assert.throws(()=>call(r,'answer',{painting:(i+1)%6,answer:PAINTINGS[(i+1)%6][1]},id));call(r,'answer',{painting:i,answer:PAINTINGS[i][1]},id);if(stepOf(r).kind==='portraits')assert.equal(view(r,id).assignment,i+n<6?i+n:null);}assert.equal(act1View(r,cast,'oleg',true).act.total,n);}
});
test('purchases are spoiler-free, shared, persistent, consumed once and contextual',()=>{
 const r=roomFor();stage(r,'shop');for(const item of ITEMS){assert(!/Пивз|шестер|портрет|Сундук/.test(item.description));buy(r,item.id);}assert.equal(r.bank.balance,24);assert.equal(view(r).pouch.length,3);assert.deepEqual(view(r).pouch,view(r,'oleg',true).pouch);
 stage(r,'portraits');assert.throws(()=>call(r,'use',{item:'magnifier',painting:1}));call(r,'use',{item:'magnifier',painting:0});assert.equal(view(r).paintings[0].reveal,'ЗЕРКАЛО');assert.equal(view(r).pouch.length,2);assert.throws(()=>call(r,'use',{item:'magnifier',painting:0}));call(r,'use',{item:'note'});assert(view(r).note);assert.equal(view(r).pouch.length,1);
 stage(r,'chimes');assert.throws(()=>call(r,'use',{item:'watch'}));tickAct1(r,1000+chimeShowMs(r.act1.chimes));const old=r.act1.chimes.deadline;call(r,'use',{item:'watch'});assert.equal(r.act1.chimes.deadline,old+30000);assert.equal(view(r).pouch.length,0);assert.equal(view(structuredClone(r)).pouch.length,0);
});
test('Whac-A-Mole accepts delayed taps, rejects future/foreign targets and deduplicates hits',()=>{
 const r=roomFor();stage(r,'hunt');const h=r.act1.hunt,cell=h.schedule[0][0],at=1000+HUNT.lead;
 call(r,'tap',{cell,spawn:0},'oleg',at-1);assert.equal(h.hits.length,0);call(r,'tap',{cell,spawn:0},'oleg',at+HUNT.visible+250);assert.equal(h.hits.length,1);call(r,'tap',{cell,spawn:0},'oleg',at+HUNT.visible+350);assert.equal(h.hits.length,1);
 assert.throws(()=>call(r,'tap',{cell,spawn:1},'sima',at+HUNT.interval+500));call(r,'tap',{cell:h.schedule[1][0],spawn:1},'oleg',at+HUNT.interval+HUNT.visible+HUNT.grace+1);assert.equal(h.hits.length,1);
 const v=view(r);assert.equal(v.hunt.slots.length,3);assert(v.hunt.schedule.every(row=>row.length===1));assert.equal(view(r,'oleg',true).hunt.slots.length,9);assert.equal(v.hunt.goal,8);
});
test('Simon hides input sequence, ignores stale beats, replays mistakes and restricts each pad',()=>{
 const r=roomFor();stage(r,'chimes');let g=r.act1.chimes;tickAct1(r,1000+chimeShowMs(g));assert.equal(view(r).chimes.sequence,null);const pad=g.sequence[0],id=r.lineup[pad%3],version=g.version;
 assert.throws(()=>call(r,'chime',{pad,version},r.lineup[(pad+1)%3]));call(r,'chime',{pad,version},id);assert.equal(g.position,1);call(r,'chime',{pad,version},id);assert.equal(g.position,1);
 const wrong=(g.sequence[1]+1)%6;call(r,'chime',{pad:wrong,version:g.version},r.lineup[wrong%3]);assert.equal(g.mode,'retry');assert.equal(g.mistakes,1);const sequence=[...g.sequence];tickAct1(r,g.modeAt+1800);assert.deepEqual(g.sequence,sequence);assert.equal(g.mode,'show');assert.equal(r.bank.balance,30);
 tickAct1(r,g.modeAt+chimeShowMs(g));const oldVersion=g.version;call(r,'replay',{version:oldVersion});assert.equal(g.replays,1);assert.equal(g.mistakes,1);assert.equal(g.mode,'show');
});
test('hint votes are state-sensitive and stale votes do not spend money',()=>{
 const r=roomFor();stage(r,'chimes');const g=r.act1.chimes;tickAct1(r,g.modeAt+chimeShowMs(g));call(r,'propose',{kind:'chime-hint'});const vote=r.act1.vote;const pad=g.sequence[0];call(r,'chime',{pad,version:g.version},r.lineup[pad%3]);call(r,'vote',{voteId:vote.id,yes:true},'sima');assert.equal(r.bank.balance,30);assert.equal(g.hint,null);
 call(r,'propose',{kind:'chime-hint'});call(r,'vote',{voteId:r.act1.vote.id,yes:true},'sima');assert.equal(r.bank.balance,29);assert.equal(view(r).chimes.hint,g.sequence[g.position]);
});
test('votes need 60%, expire, do not overdraw; expenses above six coins remain possible',()=>{
 const r=roomFor(6);stage(r,'shop');call(r,'propose',{kind:'item',target:'watch',cost:0});const v=r.act1.vote;for(const id of ['sima','masha'])call(r,'vote',{voteId:v.id,yes:true},id);assert.equal(r.bank.balance,30);call(r,'vote',{voteId:v.id,yes:true},'vanya');assert.equal(r.bank.balance,28);buy(r,'magnifier');buy(r,'note');assert.equal(r.bank.spent,6);stage(r,'portraits');call(r,'propose',{kind:'portrait-hint',target:0});for(const id of ['sima','masha','vanya'])call(r,'vote',{voteId:r.act1.vote.id,yes:true},id);assert.equal(r.bank.spent,7);
 stage(r,'shop');r.act1.inventory={};call(r,'propose',{kind:'item',target:'watch'});tickAct1(r,r.act1.vote.until);assert.equal(r.act1.vote,null);r.bank.balance=0;assert.throws(()=>call(r,'propose',{kind:'item',target:'watch'}));
});
test('legacy gear rooms migrate to new game introduction and keep money, answers and inventory',()=>{
 const r=roomFor();r.act1.version=2;r.act1.stepId='gear-play-2';r.act1.inventory.watch=true;r.act1.solved=[0,1];r.bank.balance=24;tickAct1(r,1000);assert.equal(stepOf(r).id,'chime-explanation');assert.equal(r.act1.version,4);assert.equal(r.bank.balance,24);assert.deepEqual(r.act1.solved,[0,1]);assert(view(r).pouch.some(i=>i.id==='watch'));
});
test('Worker pause/resume preserves chime phase and timer; spectators cannot play',async()=>{
 let r=roomFor(),time=1000;stage(r,'chimes');const oldNow=Date.now;Date.now=()=>time;const storage={get:async()=>structuredClone(r),put:async(k,v)=>r=structuredClone(v),transaction:async fn=>fn(storage)},server=new OpeningRoom({storage});
 const req=async(path,id='oleg',data)=>{const x=await server.fetch(new Request('https://game/'+path,{method:data?'POST':'GET',headers:{Authorization:'Bearer '+id},...(data?{body:JSON.stringify(data)}:{})}));return {status:x.status,data:await x.json()};};
 try{assert.equal((await req('act','display',{type:'chime'})).status,403);time=2000;await req('pause','oleg',{});const before=(await req('state')).data.act.chimes;time=62000;assert.deepEqual((await req('state')).data.act.chimes,before);await req('resume','oleg',{});const after=(await req('state')).data.act.chimes;assert.equal(after.modeElapsed,before.modeElapsed);assert.equal(after.remainingMs,before.remainingMs);assert.equal((await req('state','stranger')).data.act,undefined);}finally{Date.now=oldNow;}
});
test('prologue hands off once without losing bank or cast',async()=>{
 let r=roomFor(4);delete r.act1;r.phase='story';r.storyIndex=sceneSequence(r.lineup,cast).length-1;r.storyStartedAt=1000;r.bank.balance=25;let time=6000;const old=Date.now;Date.now=()=>time;const storage={get:async()=>r,put:async(k,v)=>r=v,transaction:async fn=>fn(storage)},server=new OpeningRoom({storage});
 try{const res=await server.fetch(new Request('https://game/state',{headers:{Authorization:'Bearer display'}})),v=await res.json();assert.equal(v.act.id,'act-title');assert.equal(v.bank.balance,25);assert.equal(v.act.total,4);}finally{Date.now=old;}
});
