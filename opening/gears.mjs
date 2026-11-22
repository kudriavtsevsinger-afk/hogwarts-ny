// Six positions per wheel. Reverse BFS gives an exact shortest legal next move.
const POW=[1,6,36,216,1296,7776],SIZE=46656,cache=new Map();
export const encode=v=>v.reduce((n,x,i)=>n+x*POW[i],0);
export const decode=n=>POW.map(p=>Math.floor(n/p)%6);
export function rotate(v,i,jam=-1,direction=1){
 const next=[...v];if(i===jam)return next;
 for(const [j,delta]of [[i,1],[(i+5)%6,-1],[(i+1)%6,-1]])if(j!==jam)next[j]=(next[j]+delta*direction+6)%6;
 return next;
}
export function solutionTable(jam=-1){
 if(cache.has(jam))return cache.get(jam);
 const distance=new Int16Array(SIZE).fill(-1),move=new Int8Array(SIZE).fill(-1),queue=new Int32Array(SIZE);let head=0,tail=1;distance[0]=0;
 while(head<tail){const code=queue[head++],v=decode(code);for(let i=0;i<6;i++){if(i===jam)continue;const prev=encode(rotate(v,i,jam,-1));if(distance[prev]>=0)continue;distance[prev]=distance[code]+1;move[prev]=i;queue[tail++]=prev;}}
 const table={distance,move,reachable:tail};cache.set(jam,table);return table;
}
export function shortestMove(current,target,jam=-1){const code=encode(current.map((x,i)=>(x-target[i]+6)%6)),t=solutionTable(jam);return {move:t.move[code],distance:t.distance[code]};}
export function shuffle(target,presses,jam=-1,random=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n){
 let current=[...target];const allowed=[0,1,2,3,4,5].filter(i=>i!==jam);
 for(let attempt=0;attempt<20;attempt++){current=[...target];for(let n=0;n<presses;n++)current=rotate(current,allowed[random(allowed.length)],jam);if(shortestMove(current,target,jam).distance>0)return current;}
 return rotate(target,allowed[0],jam);
}
export function owners(ids,total){let k=0;return ids.flatMap((id,i)=>Array.from({length:Math.floor(total/ids.length)+(i<total%ids.length?1:0)},()=>({index:k++,owner:id})));}
