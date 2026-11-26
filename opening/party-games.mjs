// Original implementation of classic Whac-A-Mole and Simon rules for a shared screen.
// Rule sources are recorded in docs/act1.md. No third-party code or artwork is bundled.
export const HUNT={lead:3000,interval:2800,visible:850,grace:450,turns:20};
export const huntDuration=HUNT.lead+HUNT.interval*HUNT.turns;
export const CHIMES=[
 {name:'Луна',symbol:'☾',color:'#82b9ec'}, {name:'Звезда',symbol:'✦',color:'#edc56b'},
 {name:'Пламя',symbol:'♨',color:'#e98d7a'}, {name:'Лист',symbol:'❧',color:'#89c8a1'},
 {name:'Кристалл',symbol:'◇',color:'#baa0ea'}, {name:'Солнце',symbol:'☀',color:'#e8ab69'}
];
export const chimeShowMs=g=>1200+g.sequence.length*1000+500;
export const currentPainting=(room,id)=>Array.from({length:6},(_,i)=>i).find(i=>room.lineup[i%room.lineup.length]===id&&!room.act1.solved.includes(i))??null;
export function createHunt(ids,random){return {schedule:Array.from({length:HUNT.turns},()=>ids.map((_,i)=>i*3+random(3))),hits:[],misses:0,lastTap:{}};}
export function createChimes(random){
 const pool=[0,1,2,3,4,5];for(let i=5;i>0;i--){const j=random(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
 return {round:1,sequence:pool.slice(0,3),pool,position:0,mode:'show',modeAt:0,deadline:0,mistakes:0,replays:0,version:0,extension:0,hint:null,last:null};
}
export function showChimes(g,time){g.mode='show';g.modeAt=time;g.position=0;g.version++;g.hint=null;g.last=null;g.deadline=time+chimeShowMs(g)+90000;g.extension=0;}
