import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {OpeningRoom} from './worker.mjs';
import {sceneSequence, introductions} from './scene01.mjs';
if (!globalThis.crypto) globalThis.crypto=webcrypto;
const cast={oleg:'Олег',sima:'Сима',masha:'Маша',vanya:'Ваня',liza:'Лиза',amina:'Амина'};
for(const ids of [['oleg'],['oleg','sima','amina'],Object.keys(cast)]) test(`${ids.length} players: complete scene, permissions, choices, pause and restart`,async()=>{
 const originalNow=Date.now;let now=100000;Date.now=()=>now;
 try{
 let room={host:'screen',phase:'lobby',players:new Map(ids.map(id=>[id,{id,token:id,answers:Array(8).fill(0)}]))};
 const storage={get:async()=>structuredClone(room),put:async(k,v)=>{room=structuredClone(v)},transaction:async fn=>fn(storage)};
 const server=new OpeningRoom({storage});
 const call=async(action,auth='oleg',body)=>{
  const res=await server.fetch(new Request('https://room/'+action,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+auth},...(body===undefined?{}:{body:JSON.stringify(body)})}));
  return {status:res.status,data:await res.json()};
 };
 const state=async(auth='screen')=>(await call('state',auth)).data;
 for(const auth of ['screen','sima','invalid'])for(const action of ['start','next','pause','resume','restart','sound','remove'])assert.equal((await call(action,auth,{})).status,403);
 assert.equal((await state()).lineup,undefined);assert.equal((await state()).scene,undefined);
 assert.equal((await call('start','oleg',{})).status,200);
 now=room.revealAt;assert.equal((await state()).card.id,ids[0]);
 now+=ids.length*2600;assert.deepEqual((await state()).lineup.map(p=>p.id),ids);
 now+=3600;assert.equal((await state()).phase,'title');
 now+=3600000;assert.equal((await state()).phase,'title','title never advances automatically');
 const title=(await state('oleg')).advance;
 assert.equal((await call('next','oleg',{key:title.key})).status,200);
 assert.equal((await call('next','oleg',{key:title.key})).status,409);
 assert.equal((await state()).scene.id,'blackout');
 assert.equal((await call('next','oleg',{key:(await state('oleg')).advance.key})).status,409,'cinematic cannot skip');
 now+=1700;
 const before=(await state()).scene;
 await call('pause','oleg',{});now+=55000;
 assert.deepEqual((await state()).scene,before,'pause freezes scene and elapsed time');
 await call('resume','oleg',{});assert.deepEqual((await state()).scene,before);
 const seen=[];let last='';
 for(let guard=0;guard<90;guard++){
  const s=await state(),sc=s.scene;
  if(sc.id!==last){seen.push(sc.id);last=sc.id;}
  if(sc.end)break;
  if(sc.durationMs){now+=sc.durationMs-sc.elapsedMs;continue;}
  const controls=(await state('oleg')).advance;
  if(sc.interactive){
   assert.equal(controls.enabled,false);
   assert.equal((await call('introduce','screen',{choice:0})).status,403);
   assert.equal((await call('introduce','oleg',{choice:4})).status,400);
   await call('pause','oleg',{});assert.equal((await call('introduce','oleg',{choice:0})).status,409);await call('resume','oleg',{});
   for(const [i,id]of ids.entries()){
    const choice=i%4;
    assert.equal((await call('introduce',id,{choice})).status,200);
    assert.equal((await call('introduce',id,{choice})).status,200,'retry is idempotent');
    assert.equal((await call('introduce',id,{choice:(choice+1)%4})).status,409);
    const phone=await state(id);assert.equal(phone.introduction.choice,choice);assert.equal(phone.scene,undefined);
    assert.equal((await state('oleg')).advance.enabled,i===ids.length-1);
    if(i<ids.length-1)assert.equal((await call('next','oleg',{key:controls.key})).status,409);
   }
  }else{
   now+=100000;assert.equal((await state()).scene.id,sc.id,'dialogue holds for reading');
   if(sc.id.startsWith('introduction-')){const id=sc.id.slice(13);assert.equal(sc.text,introductions[ids.indexOf(id)%4]);}
  }
  assert.equal((await call('next','oleg',{key:controls.key})).status,200);
  assert.equal((await call('next','oleg',{key:controls.key})).status,409,'double tap cannot skip');
 }
 const expected=sceneSequence(ids,cast).map(s=>s.id).slice(1); // blackout was checked before pause
 assert.deepEqual(seen,expected);
 assert.equal((await state()).scene.id,'scene-end');
 for(const id of ids){const p=await state(id);assert(p.sceneEnded);assert(p.result);}
 const oldKey=(await state('oleg')).advance.key,oldRun=room.run;
 assert.equal((await call('next','oleg',{key:oldKey})).status,409);
 await call('restart','oleg',{});
 assert.notEqual(room.run,oldRun);assert.equal(room.introductions,undefined);assert.equal(room.storyIndex,undefined);
 assert.equal((await state('oleg')).player.next,0);assert.equal((await state('oleg')).canStart,false);
 assert.equal((await call('next','oleg',{key:oldKey})).status,409);
 }finally{Date.now=originalNow;}
});
