import test from 'node:test';import assert from 'node:assert/strict';import {beginAct2,tickAct2,act2Action,act2View,step} from './act2.mjs';import {recipe} from './act2-rules.mjs';import {createBank} from './economy.mjs';
const cast={oleg:'Олег',sima:'Сима',masha:'Маша',vanya:'Ваня',liza:'Лиза',amina:'Амина'};
for(let n=3;n<=6;n++)test(`Act II complete for ${n} players with private wishes and owned ingredients`,()=>{const ids=Object.keys(cast).slice(0,n),r={run:'test',lineup:ids,players:new Map(ids.map(id=>[id,{id,answers:Array(8).fill(0)}])),bank:createBank(),wishes:Object.fromEntries(ids.map(id=>[id,'wish-'+id]))};let t=1000;beginAct2(r,t);const v=(id=ids[0],host=false)=>act2View(r,cast,id,host,t).act2;const call=(id,type,input={})=>act2Action(r,r.players.get(id),type,{...input,key:v(id).key,nonce:crypto.randomUUID()},t);let guard=0;
 while(step(r).kind!=='end'&&guard++<300){const s=step(r),a=r.act2;
 if(['line','vision','flower'].includes(s.kind)){t=a.at+s.duration;tickAct2(r,t);}
 else if(['ready','shop'].includes(s.kind)){for(const id of ids)call(id,'ready');}
 else if(s.kind==='consent'){for(const id of ids)call(id,'consent',{yes:id!==ids[0]});assert(!r.act2.cards.some(c=>c.text==='wish-'+ids[0]));}
 else if(s.kind==='mirror'){assert(!JSON.stringify(v(ids[0],true)).includes('author'));if(a.mode==='guess'){const author=a.cards[a.card].author;for(const id of ids.filter(i=>i!==author))call(id,'guess',{answer:author});}t=a.deadline;tickAct2(r,t);}
 else if(s.kind==='choice'){for(const id of ids)call(id,'choice',{choice:'release'});assert.equal(r.act2.cards,undefined);assert.equal(r.flags.mirrorMajority,'release');}
 else if(s.kind==='herb')call(ids[0],'code',{code:'715294'});
 else if(s.kind==='pot'){if(a.mode==='input'){const ingredient=recipe(a.pot)[a.pot.added.length],owner=ids[(ingredient+1)%n];assert.equal(v(ids[0],true).sheets,undefined);assert.throws(()=>call(ids[(ids.indexOf(owner)+1)%n],'ingredient',{ingredient,version:a.roundVersion}));call(owner,'ingredient',{ingredient,version:a.roundVersion});}else{t=a.deadline;tickAct2(r,t);}}
 else throw Error(s.kind);
 }assert(guard<300);assert.equal(r.bank.balance,36);assert.equal(r.flags.strikes,6);assert(ids.every(id=>r.players.get(id).ability.spent));});
test('failed cauldron attempts unlock rescue and keep recipe server-side',()=>{const ids=['oleg','sima','masha'],r={run:'retry',lineup:ids,players:new Map(ids.map(id=>[id,{id,answers:Array(8).fill(0)}])),bank:createBank()};beginAct2(r,0);r.act2.index=19;r.act2.pot={round:1,color:0,steam:0,bubbles:0,cracks:0,added:[]};r.act2.mode='input';r.act2.deadline=1;for(let i=0;i<6;i++){tickAct2(r,r.act2.deadline);assert.equal(r.act2.mode,'retry');tickAct2(r,r.act2.deadline);assert.equal(r.act2.mode,'input');}assert.equal(r.act2.failures,6);const v=act2View(r,cast,'oleg',true,r.act2.at).act2;assert(v.rescue.length>=2);assert.equal(v.sheets,undefined);});
test('spectators, stale actions and unaffordable proposals cannot mutate act',()=>{const ids=['oleg','sima','masha'],r={run:'secure',lineup:ids,players:new Map(ids.map(id=>[id,{id,answers:Array(8).fill(0)}])),bank:createBank()};beginAct2(r,0);r.act2.index=6;r.bank.balance=0;const key=act2View(r,cast,'oleg',false,0).act2.key;assert.throws(()=>act2Action(r,null,'ready',{key},0));assert.throws(()=>act2Action(r,r.players.get('oleg'),'propose',{key,target:'shield'},0));assert.equal(r.act2.vote,null);assert.equal(r.bank.balance,0);});
test('mirror resolves as soon as every eligible player voted, excluding the author',()=>{
 const ids=['oleg','sima','masha'],r={run:'early',lineup:ids,players:new Map(ids.map(id=>[id,{id,answers:Array(8).fill(0)}])),bank:createBank()};
 beginAct2(r,0);Object.assign(r.act2,{index:9,cards:[{author:'oleg',text:'Море'}],card:0,mode:'guess',votes:{},removed:{},deadline:25000,correct:0});
 const call=id=>act2Action(r,r.players.get(id),'guess',{key:act2View(r,cast,id,false,1000).act2.key,answer:'oleg'},1000);
 call('sima');assert.equal(r.act2.mode,'guess');call('masha');assert.equal(r.act2.mode,'reveal');assert.equal(r.act2.deadline,7000);assert.equal(r.act2.correct,1);
});
test('all-voted tie enters leader decision immediately without waiting for guess timer',()=>{
 const ids=['oleg','sima','masha'],r={run:'tie',lineup:ids,players:new Map(ids.map(id=>[id,{id,answers:Array(8).fill(0)}])),bank:createBank()};beginAct2(r,0);
 r.players.get('sima').ability={id:'leader_word',act:'act2',spent:false};Object.assign(r.act2,{index:9,cards:[{author:'oleg',text:'Снег'}],card:0,mode:'guess',votes:{},removed:{},deadline:25000,correct:0});
 for(const [id,answer] of [['sima','oleg'],['masha','decoy']])act2Action(r,r.players.get(id),'guess',{key:act2View(r,cast,id,false,1000).act2.key,answer},1000);
 assert.equal(r.act2.mode,'tie');assert.equal(r.act2.deadline,16000);assert.equal(r.act2.leader,'sima');
});
