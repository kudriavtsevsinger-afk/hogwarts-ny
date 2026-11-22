import {sceneSequence} from './scene01.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
import {beginAct1,tickAct1,act1Action,act1View,stepOf,actKey} from './act1.mjs';import {ACT1_SCRIPT,PAINTINGS,ITEMS,LEGACY_ACT1_IDS} from './act1-script.mjs';import {owners,rotate,shuffle,shortestMove,solutionTable,decode,encode} from './gears.mjs';import {createBank} from './economy.mjs';import {OpeningRoom} from './worker.mjs';
globalThis.crypto ||= webcrypto;const cast={oleg:'Олег',sima:'Сима',masha:'Маша',vanya:'Ваня',liza:'Лиза',amina:'Амина'};let nonce=0;
function roomFor(count=3){const ids=Object.keys(cast).slice(0,count),room={run:'test',host:'display',phase:'story',lineup:ids,players:new Map(ids.map(id=>[id,{id,token:id,answers:Array(8).fill(0)}])),bank:createBank()};beginAct1(room,1000);return room;}
function call(room,type,payload={},id='oleg',time=room.act1.startedAt){act1Action(room,room.players.get(id),type,{key:actKey(room),nonce:'request-'+(++nonce),...payload},time);}
function stage(room,id,time=1000){room.act1.index=ACT1_SCRIPT.findIndex(s=>s.id===id);room.act1.startedAt=time;room.act1.serial++;room.act1.clock=time;room.act1.ready=[];}
for(const count of [3,4,5,6])test(`${count} players complete Act I: voting, all portraits, 3 solvable gear rounds and single rewards`,()=>{
 const room=roomFor(count);let now=1000,guard=0,seen=[];
 while(++guard<200){tickAct1(room,now);const s=stepOf(room);seen.push(s.id);if(s.kind==='end')break;
  if(s.durationMs){now=room.act1.startedAt+s.durationMs;continue;}
  if(['ready','shop','note','practice'].includes(s.kind)){
   if(s.kind==='shop'){
    call(room,'propose',{kind:'item',target:'watch'},'oleg',now);const vote=room.act1.vote;
    for(const id of room.lineup.slice(1,Math.ceil(count*.6)))call(room,'vote',{voteId:vote.id,yes:true},id,now);
    assert.equal(room.bank.balance,28);assert(room.act1.inventory.watch);
   }
   for(const id of room.lineup)call(room,'ready',{},id,now);continue;
  }
  if(s.kind==='hunt'){
   for(let spawn=0;spawn<10;spawn++){now=room.act1.startedAt+spawn*2500+400;const cell=room.act1.hunt.schedule[spawn],id=owners(room.lineup,12)[cell].owner;call(room,'tap',{cell,spawn},id,now);}
   assert.equal(room.act1.hunt.hits.length,10);now=room.act1.startedAt+60000;tickAct1(room,now);assert.equal(room.bank.balance,30);assert(room.act1.inventory.note);continue;
  }
  if(s.kind==='portraits'){
   const hidden=act1View(room,cast,'oleg',false,now);assert(!JSON.stringify(hidden).includes('ЗЕРКАЛО'),'answers stay on server');
   for(const i of [4,1,5,0,3,2])call(room,'answer',{painting:i,answer:' '+PAINTINGS[i][1].toLowerCase()+' '},room.lineup[i%count],now);
   assert.equal(stepOf(room).kind,'chest');continue;
  }
  if(s.kind==='memory'){now=room.act1.startedAt+10000;continue;}
  if(s.kind==='gears'){
   const snapshot=act1View(room,cast,'oleg',false,now);assert.deepEqual(snapshot.act.gears.target,room.act1.gear.target);const g=room.act1.gear;
   let moves=0;while(stepOf(room).kind==='gears'){const next=shortestMove(g.current,g.target,g.jam);assert(next.distance>0);const id=owners(room.lineup,6)[next.move].owner;call(room,'turn',{gear:next.move},id,now);assert(++moves<100);}
   continue;
  }
  assert.fail(s.id);
 }
 assert(guard<200);assert.equal(stepOf(room).kind,'end');assert.equal(room.act1.cleanRounds,3);assert.equal(room.bank.balance,33);assert.equal(room.bank.ledger.filter(x=>x.key==='act1:hunt').length,1);assert.equal(room.bank.ledger.filter(x=>x.key==='act1:gears').length,1);assert.equal(room.act1.solved.length,6);
 const expected=ACT1_SCRIPT.map(s=>s.id);for(const id of expected)assert(seen.includes(id)||id==='peeves-result',id);
});
test('all generated gear puzzles are solvable; jam is immutable and hints strictly shorten a shortest solution',()=>{
 for(let jam=-1;jam<6;jam++){
  const table=solutionTable(jam);assert(table.reachable>0);
  for(let n=0;n<50;n++){
   const target=Array.from({length:6},()=>Math.floor(Math.random()*6));let state=shuffle(target,16,jam),prev=shortestMove(state,target,jam).distance;assert(prev>0);
   for(let k=0;prev>0;k++){assert(k<40);const hint=shortestMove(state,target,jam);assert.notEqual(hint.move,jam);state=rotate(state,hint.move,jam);if(jam>=0)assert.equal(state[jam],target[jam]);const d=shortestMove(state,target,jam).distance;assert.equal(d,prev-1);prev=d;}
   assert.deepEqual(state,target);
  }
 }
 for(let n=3;n<=6;n++){const ids=Object.keys(cast).slice(0,n);for(const total of [6,12]){const assigned=owners(ids,total);assert.equal(assigned.length,total);assert.deepEqual(assigned.map(x=>x.index),Array.from({length:total},(_,i)=>i));const counts=ids.map(id=>assigned.filter(x=>x.owner===id).length);assert(Math.max(...counts)-Math.min(...counts)<=1);}}
});
test('votes expire, reject forged costs and duplicates, preserve funds, and require 60 percent',()=>{
 const room=roomFor(6);stage(room,'shop');call(room,'propose',{kind:'item',target:'magnifier',cost:0});const v=room.act1.vote;
 for(const id of ['sima','masha'])call(room,'vote',{voteId:v.id,yes:true},id);assert.equal(room.bank.balance,30);
 call(room,'vote',{voteId:v.id,yes:true},'masha');assert.equal(room.act1.vote.yes.length,3);
 call(room,'vote',{voteId:v.id,yes:true},'vanya');assert.equal(room.bank.balance,27);assert.equal(room.act1.vote,null);assert.throws(()=>call(room,'propose',{kind:'item',target:'magnifier'}));
 call(room,'propose',{kind:'item',target:'watch'});const expired=room.act1.vote.id;tickAct1(room,31000);assert.equal(room.act1.vote,null);assert.equal(room.bank.balance,27);assert.throws(()=>call(room,'vote',{voteId:expired,yes:true},'sima',31000));
 room.bank.balance=0;assert.throws(()=>call(room,'propose',{kind:'item',target:'watch'}));assert.equal(room.bank.balance,0);
});
test('portrait hints and magnifier reveal only purchased data; wrong answers have no penalty',()=>{
 const room=roomFor();stage(room,'portraits');call(room,'answer',{painting:0,answer:'неверно'});assert.equal(room.act1.solved.length,0);assert.equal(room.bank.balance,30);
 call(room,'propose',{kind:'portrait-hint',target:0});call(room,'vote',{voteId:room.act1.vote.id,yes:true},'sima');assert.equal(room.bank.balance,29);assert.equal(act1View(room,cast,'oleg',false).act.paintings[0].hint,'З');assert.throws(()=>call(room,'propose',{kind:'portrait-hint',target:0}));
 room.act1.inventory.magnifier=true;call(room,'use',{item:'magnifier',painting:1});assert.equal(act1View(room,cast,'oleg',false).act.paintings[1].reveal,'ВРЕМЯ');assert.throws(()=>call(room,'use',{item:'magnifier',painting:2}));
});
test('hunt ownership, late taps, stale requests and retry idempotency',()=>{
 const room=roomFor();stage(room,'peeves-start');tickAct1(room,1000+stepOf(room).durationMs);const start=room.act1.startedAt,cell=room.act1.hunt.schedule[0],id=owners(room.lineup,12)[cell].owner;
 assert.throws(()=>call(room,'tap',{cell,spawn:0},room.lineup.find(p=>p!==id),start+200));
 const request={cell,spawn:0,key:actKey(room),nonce:'duplicate-tap'};act1Action(room,room.players.get(id),'tap',request,start+300);act1Action(room,room.players.get(id),'tap',request,start+400);assert.equal(room.act1.hunt.hits.length,1);assert.equal(room.act1.hunt.misses,0);
 call(room,'tap',{cell,spawn:0},id,start+1700);assert.equal(room.act1.hunt.misses,1);assert.throws(()=>call(room,'tap',{cell,spawn:0,key:'old'},id,start+2000));
});
test('gear timeout retry, discount, watch use and ownership',()=>{
 const room=roomFor();stage(room,'gear-intro-1');tickAct1(room,1000+stepOf(room).durationMs);assert.equal(stepOf(room).kind,'memory');let now=room.act1.startedAt+10000;tickAct1(room,now);assert.equal(stepOf(room).kind,'gears');
 room.act1.inventory.watch=true;call(room,'use',{item:'watch'},'oleg',now);assert.equal(room.act1.gear.extension,30000);assert.throws(()=>call(room,'use',{item:'watch'},'oleg',now));
 now+=210000;tickAct1(room,now);assert.equal(room.act1.gear.failures,1);assert.equal(stepOf(room).kind,'memory');now+=10000;tickAct1(room,now);assert.equal(room.act1.gear.extension,0);now+=180000;tickAct1(room,now);assert.equal(room.act1.gear.failures,2);now+=10000;tickAct1(room,now);assert.equal(act1View(room,cast,'oleg',false,now).act.gears.hintCost,1);
 call(room,'propose',{kind:'gear-hint'},'oleg',now);call(room,'vote',{voteId:room.act1.vote.id,yes:true},'sima',now);assert.equal(room.bank.balance,29);const move=room.act1.gear.hint.move,owner=owners(room.lineup,6)[move].owner;assert.throws(()=>call(room,'turn',{gear:move},room.lineup.find(p=>p!==owner),now));call(room,'turn',{gear:move},owner,now);assert.equal(room.act1.gear.hint,null);
});
test('Worker Act I persists and pauses both vote and game clocks; display cannot act or restart',async()=>{
 let room=roomFor();stage(room,'shop');let time=1000;const original=Date.now;Date.now=()=>time;
 const storage={get:async()=>structuredClone(room),put:async(k,v)=>room=structuredClone(v),transaction:async fn=>fn(storage)};const server=new OpeningRoom({storage});
 async function req(action,auth,payload){const r=await server.fetch(new Request('https://room/'+action,{method:payload?'POST':'GET',headers:{Authorization:'Bearer '+auth},...(payload?{body:JSON.stringify(payload)}:{})}));return{status:r.status,data:await r.json()};}
 try{
  const payload={type:'propose',kind:'item',target:'watch',key:actKey(room),nonce:'worker-test'};assert.equal((await req('act','display',payload)).status,403);assert.equal((await req('act','oleg',payload)).status,200);
  time=11000;await req('pause','oleg',{});const before=(await req('state','oleg')).data.act.vote.remainingMs;time+=60000;assert.equal((await req('state','oleg')).data.act.vote.remainingMs,before);assert.equal((await req('act','sima',{type:'vote',key:actKey(room),nonce:'paused-test',voteId:room.act1.vote.id,yes:true})).status,409);
  await req('resume','oleg',{});assert.equal((await req('state','oleg')).data.act.vote.remainingMs,before);const loaded=(await req('state','display')).data;assert.equal(loaded.bank.balance,30);assert(loaded.scene);assert.equal((await req('state','stranger')).data.act,undefined);assert.equal((await req('restart','display',{})).status,403);await req('restart','oleg',{});assert.equal(room.act1,undefined);assert.equal(room.bank.balance,30);
 }finally{Date.now=original;}
});

test('six coins is guidance: approved purchases above it remain available',()=>{
 const room=roomFor();stage(room,'shop');
 for(const target of ['watch','magnifier','note']){call(room,'propose',{kind:'item',target});call(room,'vote',{voteId:room.act1.vote.id,yes:true},'sima');}
 assert.equal(room.bank.spent,6);stage(room,'portraits');call(room,'propose',{kind:'portrait-hint',target:0});call(room,'vote',{voteId:room.act1.vote.id,yes:true},'sima');assert.equal(room.bank.spent,7);assert.equal(room.bank.balance,23);
});
test('prologue finale enters Act I automatically once, retaining cast and bank',async()=>{
 let room=roomFor(4);delete room.act1;room.phase='story';room.storyIndex=sceneSequence(room.lineup,cast).length-1;room.storyStartedAt=1000;room.bank.balance=25;room.bank.spent=5;let time=5999;const original=Date.now;Date.now=()=>time;
 const storage={get:async()=>structuredClone(room),put:async(k,v)=>room=structuredClone(v),transaction:async fn=>fn(storage)};const server=new OpeningRoom({storage});
 const get=async()=>{const response=await server.fetch(new Request('https://room/state',{headers:{Authorization:'Bearer display'}}));assert.equal(response.status,200);return response.json();};
 try{assert.equal((await get()).phase,'story');time=6000;const first=await get();assert.equal(first.phase,'act1');assert.equal(first.act.id,'act-title');assert.equal(first.bank.balance,25);assert.equal(first.act.total,4);assert.deepEqual(first.act.cast.map(p=>p.id),room.lineup);time=6100;const again=await get();assert.equal(again.act.key,first.act.key);assert.equal(again.act.spent,0);assert.equal(room.act1.startedAt,6000);}finally{Date.now=original;}
});

test('shop avoids task spoilers and all unconsumed purchases stay in the shared inventory',()=>{
 for(const item of ITEMS)assert(!/шестер|портрет|охот|поим|загад|Пивз/i.test(item.description+' '+item.name));
 const room=roomFor();stage(room,'shop');for(const target of ['watch','magnifier','note']){call(room,'propose',{kind:'item',target});call(room,'vote',{voteId:room.act1.vote.id,yes:true},'sima');}
 const view=(host=false)=>act1View(room,cast,'oleg',host,1000).act;
 assert.deepEqual(view().pouch.map(i=>i.id),['watch','magnifier','note']);assert.deepEqual(view(true).pouch,view().pouch);assert(view().pouch.every(i=>!i.usable));
 stage(room,'vendor-farewell');assert.equal(view().pouch.length,3);assert.throws(()=>call(room,'use',{item:'watch'}));assert.equal(view().pouch.length,3);
 stage(room,'note');assert.equal(view().note,null);call(room,'use',{item:'note'});assert(view().note);assert.equal(view().noteReadingMs,14000);assert(!view().pouch.some(i=>i.id==='note'));assert.throws(()=>call(room,'use',{item:'note'}));
 stage(room,'portraits');assert(view().pouch.find(i=>i.id==='magnifier').usable);call(room,'use',{item:'magnifier',painting:3});assert.equal(view().paintings[3].reveal,'ЗИМА');assert.deepEqual(view().pouch.map(i=>i.id),['watch']);
 const reloaded=structuredClone(room);assert.deepEqual(act1View(reloaded,cast,'sima',false).act.pouch.map(i=>i.id),['watch']);
 stage(room,'gear-intro-1');tickAct1(room,1000+stepOf(room).durationMs);tickAct1(room,room.act1.startedAt+10000);call(room,'use',{item:'watch'},'oleg',room.act1.startedAt);assert.equal(view().pouch.length,0);assert.equal(room.act1.gear.extension,30000);
});
test('practice demonstrates coupling without timer, coin changes or production-round progress',()=>{
 const room=roomFor(3);stage(room,'mechanism-explanation');tickAct1(room,1000+stepOf(room).durationMs);assert.equal(stepOf(room).kind,'practice');const id=owners(room.lineup,6)[0].owner;call(room,'practice-turn',{gear:0},id,room.act1.startedAt);assert.deepEqual(room.act1.practice.current,[1,5,0,0,0,5]);assert.equal(room.bank.balance,30);assert.equal(room.act1.gear,undefined);
 tickAct1(room,room.act1.startedAt+600000);assert.equal(stepOf(room).kind,'practice');assert.throws(()=>call(room,'practice-turn',{gear:0},'sima',room.act1.startedAt));for(const id of room.lineup)call(room,'ready',{},id,room.act1.startedAt);assert.equal(stepOf(room).id,'gear-intro-1');
});
test('saved rooms migrate by stable scene id, keeping progress and purchased items',()=>{
 for(const id of ['shop','hunt','portraits','gear-play-2','act2-title']){
  const room=roomFor();delete room.act1.version;delete room.act1.stepId;room.act1.index=LEGACY_ACT1_IDS.indexOf(id);room.act1.inventory.watch=true;room.act1.solved=[2];room.act1.hunt={schedule:Array(24).fill(0),hits:[],misses:0};room.act1.gear={round:2,target:[0,0,0,0,0,0],current:[1,5,0,0,0,5],extension:0};const old=actKey(room);assert(tickAct1(room,1000));assert.equal(stepOf(room).id,id);assert.equal(room.act1.version,2);assert.notEqual(actKey(room),old);assert(room.act1.inventory.watch);assert.deepEqual(room.act1.solved,[2]);assert.equal(tickAct1(room,1000),false);
 }
});
