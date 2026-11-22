import test from 'node:test';
import assert from 'node:assert/strict';
import {createBank,bankView,awardSolvedPuzzle,purchaseHint,ECONOMY} from './economy.mjs';
import {OpeningRoom} from './worker.mjs';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const catalog={a:{difficulty:'standard',hints:['Направление','Способ','Почти ответ']},b:{difficulty:'easy',hints:['1','2','3']},c:{difficulty:'hard',hints:['1','2','3']}};
test('team rewards and hints are idempotent, sequential and cannot overdraw',()=>{
 const bank=createBank();assert.equal(bank.balance,30);
 assert.throws(()=>purchaseHint(bank,catalog,'a',2));assert.equal(bank.balance,30);
 assert.equal(purchaseHint(bank,catalog,'a',1).charged,3);assert.equal(purchaseHint(bank,catalog,'a',1).charged,0);
 assert.equal(purchaseHint(bank,catalog,'a',2).charged,5);assert.equal(purchaseHint(bank,catalog,'a',3).charged,8);assert.equal(bank.balance,14);
 assert.equal(awardSolvedPuzzle(bank,catalog,'a'),10);assert.equal(awardSolvedPuzzle(bank,catalog,'a'),0);assert.equal(bank.balance,24);
 assert.equal(purchaseHint(bank,catalog,'a',3).charged,0);assert.equal(bank.ledger.length,4);assert.deepEqual(bankView(bank),{balance:24,earned:10,spent:16});
 assert.throws(()=>awardSolvedPuzzle(bank,catalog,'fake'));assert.throws(()=>purchaseHint(bank,catalog,'b',-1));assert.throws(()=>purchaseHint(bank,catalog,'b',1.5));
 const poor=createBank();poor.balance=2;const before=JSON.stringify(poor);assert.throws(()=>purchaseHint(poor,catalog,'a',1));assert.equal(JSON.stringify(poor),before);
 const solved=createBank();awardSolvedPuzzle(solved,catalog,'b');assert.throws(()=>purchaseHint(solved,catalog,'b',1));
});
test('budget projection: twelve puzzles and two hints each retain 54 coins',()=>{
 const bank=createBank();const puzzles=Object.fromEntries(['easy','easy','easy',...Array(6).fill('standard'),...Array(3).fill('hard')].map((difficulty,i)=>['p'+i,{difficulty,hints:['1','2','3']}]));
 for(const id of Object.keys(puzzles)){purchaseHint(bank,puzzles,id,1);purchaseHint(bank,puzzles,id,2);awardSolvedPuzzle(bank,puzzles,id);assert(bank.balance>=0);}
 assert.deepEqual(bankView(bank),{balance:54,earned:120,spent:96});assert.equal(ECONOMY.hintPrices.reduce((a,b)=>a+b),16);
});
test('existing rooms persist one shared bank across reconnects; only restart resets it',async()=>{
 let room={host:'screen',phase:'lobby',players:new Map([['oleg',{id:'oleg',token:'oleg',answers:[]}],['sima',{id:'sima',token:'sima',answers:[]}]])};
 const storage={get:async()=>structuredClone(room),put:async(k,v)=>{room=structuredClone(v)},transaction:async fn=>fn(storage)};
 const request=async(action,auth,body)=>{const server=new OpeningRoom({storage});const r=await server.fetch(new Request('https://room/'+action,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+auth},...(body===undefined?{}:{body:JSON.stringify(body)})}));return {status:r.status,data:await r.json()};};
 for(const auth of ['screen','oleg','sima'])assert.equal((await request('state',auth)).data.bank.balance,30);
 assert.equal(room.bank.balance,30);assert.equal((await request('state','stranger')).data.bank,undefined);
 awardSolvedPuzzle(room.bank,catalog,'a');purchaseHint(room.bank,catalog,'b',1);
 for(const auth of ['screen','oleg','sima'])assert.equal((await request('state',auth)).data.bank.balance,37);
 assert.equal((await request('award','oleg',{amount:999})).status,409);assert.equal(room.bank.balance,37);
 assert.equal((await request('restart','sima',{})).status,403);assert.equal(room.bank.balance,37);
 assert.equal((await request('restart','oleg',{})).status,200);assert.equal(room.bank.balance,30);assert.equal(room.bank.ledger.length,0);
});
