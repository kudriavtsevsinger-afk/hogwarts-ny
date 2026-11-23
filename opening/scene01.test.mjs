import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {OpeningRoom} from './worker.mjs';
import {sceneSequence} from './scene01.mjs';
import {voices} from './voices.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const cast={oleg:'Олег',sima:'Сима',masha:'Маша',vanya:'Ваня',liza:'Лиза',amina:'Амина'};
for(let count=1;count<=6;count++)test(`${count} players: complete automatic prologue, all active voices and private wishes`,async()=>{
 const ids=Object.keys(cast).slice(0,count),clock=Date.now;let now=100000;Date.now=()=>now;
 try{
 let room={host:'screen',phase:'lobby',players:new Map(ids.map(id=>[id,{id,token:id,answers:Array(8).fill(0)}]))};
 const storage={get:async()=>structuredClone(room),put:async(k,v)=>{room=structuredClone(v)},transaction:async fn=>fn(storage)};const server=new OpeningRoom({storage});
 async function call(action,auth='screen',body){const r=await server.fetch(new Request('https://room/'+action,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+auth},...(body===undefined?{}:{body:JSON.stringify(body)})}));return{status:r.status,data:await r.json()};}
 const state=async(auth='screen')=>(await call('state',auth)).data;
 for(const a of ['start','pause','resume','restart','next','sound'])assert.equal((await call(a,'screen',{})).status,403);
 await call('start','oleg',{});now=room.revealAt+count*2600+3600;assert.equal((await state()).phase,'title');assert.equal((await state('oleg')).advance,undefined);
 now+=5000;assert.equal((await state()).scene.id,'blackout');
 const seen=[],spoken=[];
 for(let guard=0;guard<180;guard++){
  const sc=(await state()).scene;seen.push(sc.id);if(sc.end)break;
  assert.equal((await call('next','oleg',{key:sc.key})).status,409,'no manual advancement');
  if(sc.durationMs){now+=sc.durationMs-sc.elapsedMs;continue;}
  if(sc.voice){
   spoken.push(sc.voiceNumber);assert.equal((await call('complete','oleg',{key:sc.key})).status,403);
   assert.equal((await call('complete','screen',{key:sc.key})).status,409,'cannot complete too early');
   now+=sc.voice.durationMs+600;assert.equal((await state()).scene.id,sc.id,'wait for actual playback acknowledgement, even after nominal duration');
   await call('pause','oleg',{});const paused=(await state()).scene;now+=25000;assert.deepEqual((await state()).scene,paused);assert.equal((await call('complete','screen',{key:sc.key})).status,409);await call('resume','oleg',{});
   assert.equal((await call('complete','screen',{key:sc.key})).status,200);assert.equal((await call('complete','screen',{key:sc.key})).status,409,'stale acknowledgement cannot skip');continue;
  }
  assert(sc.interactive,sc.id);
  const action={tickets:'ticket',introductions:'introduce',sweets:'sweet',wish:'wish'}[sc.interaction];
  assert.equal((await call(action,'screen',{key:sc.key})).status,403);
  for(const [i,id]of ids.entries()){
   const data=action==='ticket'?{captured:true,width:1280,height:720}:action==='wish'?{text:'Моё личное желание '+id}:action==='sweet'?{choice:['frog','beans','pumpkin','licorice'][i%4]}:{choice:i%4};
   assert.equal((await call(action,id,{key:'stale',...data})).status,409);
   if(action==='wish'){assert.equal((await call(action,id,{key:sc.key,text:' '})).status,400);assert.equal((await call(action,id,{key:sc.key,text:'x'.repeat(501)})).status,400);}
   await call('pause','oleg',{});assert.equal((await call(action,id,{key:sc.key,...data})).status,409);await call('resume','oleg',{});
   assert.equal((await call(action,id,{key:sc.key,...data})).status,200);
   if(i<count-1){assert.equal((await state()).scene.id,sc.id);assert.equal((await call(action,id,{key:sc.key,...data})).status,200);}
   else assert.notEqual((await state()).scene.id,sc.id,'last answer automatically continues');
   if(action==='wish')assert(!JSON.stringify(await state()).includes('Моё личное желание'));
  }
 }
 assert.deepEqual(seen,sceneSequence(ids,cast).map(s=>s.id));assert.deepEqual(spoken,Array.from({length:43},(_,i)=>i+1));assert.equal((await state()).scene.id,'prologue-end');
 for(const id of ids){const p=await state(id);assert.equal(p.profile.wish,'Моё личное желание '+id);assert(p.sceneEnded);}
 const oldRun=room.run;await call('restart','oleg',{});assert.notEqual(room.run,oldRun);assert.equal(room.wishes,undefined);assert.equal((await state('oleg')).player.next,0);
 }finally{Date.now=clock;}
});
test('only direct speech in captions, full audio mapping and all sweets outcomes',()=>{
 const ids=Object.keys(cast),seq=sceneSequence(ids,cast,{},Object.fromEntries(ids.map((id,i)=>[id,{choice:i<3?'beans':'frog',outcome:['caramel','wool','caramel','frog','pumpkin','licorice'][i]}])));
 assert.equal(Object.keys(voices).length,43);
 for(const s of seq){if(s.text)assert(s.speaker,s.id);if(s.voice)assert.equal(s.durationMs,undefined,'voice cannot be advanced by a timer');}
 for(const id of ['cat-reaction','crowd-reaction','last-whistle','sweets-reactions'])assert.equal(seq.find(s=>s.id===id).text,undefined);
 assert.equal(seq.find(s=>s.id==='sweets-reactions').sweetResults.length,6);
 assert(seq.some(s=>s.visual==='final-title'));assert(seq.some(s=>s.visual==='clock-stopped'));assert(seq.some(s=>s.interaction==='wish'));
 const feast=seq.slice(seq.findIndex(s=>s.id==='voice-39')+1,seq.findIndex(s=>s.id==='feast-return'));
 assert.deepEqual(feast.map(s=>s.background),['feast-table','feast-desserts','feast-guests','feast-goblets','feast-ornaments','feast-flames','feast-candles','feast-exterior']);assert(feast.every(s=>!s.actor&&!s.text&&!s.castGroup&&s.music==='christmas'&&s.musicBoost===1.6));
 assert.equal(feast.reduce((sum,s)=>sum+s.durationMs,0),26000);assert.equal(feast.at(-1).outdoor,true);assert.equal(seq.find(s=>s.id==='voice-40').musicBoost,undefined);
 assert(!seq.some(s=>s.id==='portrait-montage'));
 assert.equal(feast[0].musicRestart,true);assert(feast.slice(1).every(s=>!s.musicRestart));
 assert(!seq.some(s=>s.id==='hall-guests'),'no player introduction at the start of the hall scene');
 assert.equal(seq.find(s=>s.id==='hall-laugh').castExpression,'smile');
});


test('finale follows voices 40, clock, 41, 42, 43, then darkness and title',()=>{
 const end=sceneSequence(Object.keys(cast),cast).filter(s=>s.chapter===6);
 assert.deepEqual(end.map(s=>s.id),['feast-return','voice-40','clock-ticking','clock-stopped','voice-41','voice-42','voice-43','final-dark','prologue-end']);
 assert.equal(end[2].durationMs,4400);assert.equal(end[3].cue,'bell');assert.equal(end[3].soundCut,true);
 assert.equal(end[4].voice.url,'/audio/voice/41.ogg');assert.equal(end[5].actor,'mcgonagall');assert.equal(end[6].voice.url,'/audio/voice/43.ogg');
 for(const s of end.slice(3))assert.equal(s.music,null);assert.equal(end.at(-1).end,true);
});
