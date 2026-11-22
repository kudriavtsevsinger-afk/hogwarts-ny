import {ACT1_SCRIPT as SCRIPT,ITEMS,PAINTINGS,NOTE} from './act1-script.mjs';
import {owners,rotate,shuffle,shortestMove} from './gears.mjs';
const random=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
const nowOf=(room,now)=>room.pausedAt??now;
export const stepOf=room=>SCRIPT[room.act1.index];
export const actKey=room=>room.run+':act1:'+room.act1.serial;
function event(room,cue,text='',speaker=''){const a=room.act1;a.event={id:room.run+':event:'+(++a.eventSerial),cue,text,speaker,at:a.clock};}
function money(room,amount,key){const bank=room.bank;if(bank.ledger.some(x=>x.key===key))return false;if(bank.balance+amount<0)fail('В общем банке недостаточно монет.');bank.balance+=amount;if(amount<0)bank.spent-=amount;else bank.earned+=amount;bank.ledger.push({key,amount,balance:bank.balance});return true;}
function enter(room,index,now){const a=room.act1;a.index=index;a.serial++;a.startedAt=now;a.clock=now;a.ready=[];a.vote=null;a.feedback=null;const step=stepOf(room);
 if(step.kind==='hunt')a.hunt={schedule:Array.from({length:24},()=>random(12)),hits:[],misses:0,lastTap:{}};
 if(step.kind==='memory'){
  if(a.gear?.round!==step.round){const target=Array.from({length:6},()=>random(6));a.gear={round:step.round,target,jam:step.round===3?random(6):-1,failures:0,attempt:0,version:0};}
  const g=a.gear;g.attempt++;g.current=shuffle(g.target,[6,12,16][g.round-1],g.jam);g.version++;g.hint=null;g.extension=0;
 }
}
export function beginAct1(room,now=Date.now()){if(room.act1)return;room.phase='act1';room.act1={index:0,serial:0,startedAt:now,clock:now,ready:[],inventory:{},used:{},solved:[],firstHints:[],reveals:{},receipts:[],eventSerial:0,cleanRounds:0,spentAtStart:room.bank.spent,earnedAtStart:room.bank.earned};enter(room,0,now);}
const go=(room,now)=>enter(room,room.act1.index+1,now);
function finishHunt(room){const a=room.act1,n=a.hunt.hits.length;if(n>=8)a.inventory.note=true;if(n>=10)money(room,2,'act1:hunt');}
function settleVote(room){const a=room.act1,v=a.vote;if(!v)return;const cost=v.cost;
 if(room.bank.balance<cost){a.vote=null;event(room,'pickup','В общем банке недостаточно монет.');return;}
 // Revalidate a state-sensitive hint when the team approves it.
 if(v.kind==='gear-hint'&&stepOf(room).kind!=='gears'){a.vote=null;return;}
 if(v.kind==='portrait-hint'&&a.solved.includes(v.target)){a.vote=null;return;}
 if(!money(room,-cost,'act1:purchase:'+v.id)){a.vote=null;return;}
 if(v.kind==='item')a.inventory[v.target]=true;
 if(v.kind==='portrait-hint')a.firstHints.push(v.target);
 if(v.kind==='gear-hint'){const g=a.gear;g.hint={...shortestMove(g.current,g.target,g.jam),version:g.version};}
 a.vote=null;a.ready=[];event(room,'coins',v.kind==='item'?'Вот, другое дело. Всё, что куплено, уже ваше, сдачи не будет.': 'Подсказка открыта.',v.kind==='item'?'Продавщица':'');
}
export function tickAct1(room,now=Date.now()){
 if(room.phase!=='act1')return false;const a=room.act1,time=nowOf(room,now);a.clock=time;let dirty=false;
 if(a.vote&&time>=a.vote.until){a.vote=null;event(room,'pickup','Голосование завершено. Покупка не состоялась.');dirty=true;}
 for(let guard=0;guard<60;guard++){
  const step=stepOf(room),elapsed=time-a.startedAt;
  if(step.durationMs&&elapsed>=step.durationMs){go(room,a.startedAt+step.durationMs);dirty=true;continue;}
  if(step.kind==='hunt'&&elapsed>=60000){finishHunt(room);go(room,a.startedAt+60000);dirty=true;continue;}
  if(step.kind==='memory'&&elapsed>=10000){go(room,a.startedAt+10000);dirty=true;continue;}
  if(step.kind==='gears'&&elapsed>=180000+a.gear.extension){const oldEnd=a.startedAt+180000+a.gear.extension;a.gear.failures++;enter(room,a.index-1,oldEnd);event(room,'bell','Тик… Не… сейчас…','Часы');dirty=true;continue;}
  break;
 }
 a.clock=time;return dirty;
}
function normalized(s){return typeof s==='string'?s.normalize('NFKC').trim().toUpperCase().replace(/Ё/g,'Е').replace(/[.!?]+$/,'').trim():'';}
function proposal(room,kind,target){const a=room.act1,step=stepOf(room);let cost,label;
 if(kind==='item'){
  const item=ITEMS.find(x=>x.id===target);if(!item||!(step.kind==='shop'||step.kind==='note'&&target==='note'))fail('Сейчас этот товар недоступен.');
  if(a.inventory[target])fail('Этот предмет уже есть у команды.');({cost}=item);label=item.name;
 }else if(kind==='portrait-hint'){
  if(step.kind!=='portraits'||!Number.isInteger(target)||target<0||target>5||a.solved.includes(target)||a.firstHints.includes(target)||a.reveals[target])fail('Подсказка недоступна.');cost=1;label='Первая буква ответа: картина '+(target+1);
 }else if(kind==='gear-hint'){
  if(step.kind!=='gears')fail('Подсказка сейчас недоступна.');if(a.gear.hint?.version===a.gear.version)fail('Подсказка уже открыта.');cost=a.gear.failures>=2?1:2;label='Следующее правильное нажатие';target=a.gear.version;
 }else fail('Неизвестная покупка.',400);
 if(room.bank.balance<cost)fail('В общем банке недостаточно монет.');
 return{kind,target,cost,label};
}
export function act1Action(room,player,action,input,now=Date.now()){
 if(room.phase!=='act1'||!player||!room.lineup.includes(player.id))fail('Это действие недоступно.',403);
 tickAct1(room,now);const a=room.act1,step=stepOf(room),time=nowOf(room,now);
 if(room.pausedAt!=null)fail('Сейчас пауза.');
 if(typeof input.nonce!=='string'||input.nonce.length<8||input.nonce.length>80)fail('Некорректный запрос.',400);
 if(a.receipts.includes(input.nonce))return;
 if(input.key!==actKey(room))fail('Этот этап уже изменился.');
 const id=player.id;
 if(action==='ready'){
  if(!['ready','shop','note'].includes(step.kind))fail('Сейчас продолжение недоступно.');if(a.vote)fail('Дождитесь результата голосования.');
  if(!a.ready.includes(id))a.ready.push(id);if(room.lineup.every(id=>a.ready.includes(id)))go(room,time);
 }else if(action==='propose'){
  if(a.vote)fail('Сначала завершите текущее голосование.');const p=proposal(room,input.kind,input.target);
  a.vote={...p,id:crypto.randomUUID(),until:time+30000,yes:[id],no:[]};a.ready=[];
  if(a.vote.yes.length>=Math.ceil(room.lineup.length*.6))settleVote(room);
 }else if(action==='vote'){
  const v=a.vote;if(!v||v.id!==input.voteId)fail('Голосование уже завершилось.');if(typeof input.yes!=='boolean')fail('Выбери вариант.',400);
  if(v.yes.includes(id)||v.no.includes(id))return;(input.yes?v.yes:v.no).push(id);
  if(v.yes.length>=Math.ceil(room.lineup.length*.6))settleVote(room);
  else if(v.no.length>room.lineup.length-Math.ceil(room.lineup.length*.6)){a.vote=null;event(room,'pickup','Команда отклонила покупку.');}
 }else if(action==='tap'){
  if(step.kind!=='hunt')fail('Охота уже завершилась.');const h=a.hunt,elapsed=time-a.startedAt,spawn=Math.floor(elapsed/2500);
  if(!Number.isInteger(input.cell)||!owners(room.lineup,12).some(x=>x.index===input.cell&&x.owner===id))fail('Это не твоя ниша.',403);
  if(time-(h.lastTap[id]??-Infinity)<180)fail('Слишком быстро.');h.lastTap[id]=time;
  if(input.spawn===spawn&&elapsed%2500<1500&&h.schedule[spawn]===input.cell&&!h.hits.includes(spawn)){
   h.hits.push(spawn);event(room,'pickup',h.hits.length===6?'Ну ладно, ладно. Это было случайно. Я почти поддался.':h.hits.length===10?'Нечестно! Я же предупреждал, что у меня полно ниш!':'', 'Пивз');
  }else{h.misses++;event(room,'unlock',h.misses%3===0?'Мимо, мимо, какие медленные руки!':'','Пивз');}
 }else if(action==='answer'){
  if(step.kind!=='portraits'||!Number.isInteger(input.painting)||input.painting<0||input.painting>5||typeof input.answer!=='string'||input.answer.length>100)fail('Выбери картину и введи ответ.',400);
  const i=input.painting;if(!a.solved.includes(i)){
   if(normalized(input.answer)===PAINTINGS[i][1]){a.solved.push(i);a.feedback={painting:i,correct:true,by:id,at:time};event(room,'success');if(a.solved.length===6){a.inventory.note=true;go(room,time);}}
   else{a.feedback={painting:i,correct:false,by:id,at:time};event(room,'pickup');}
  }
 }else if(action==='talk'){
  if(step.kind!=='portraits')fail('Портрет недоступен.');if(!a.talked){a.talked=true;event(room,'magic','Ищете слово? Оно не спрятано. Оно просто длинное, а вы торопитесь.','Портрет');}
 }else if(action==='use'){
  if(input.item==='magnifier'){
   const i=input.painting;if(step.kind!=='portraits'||!a.inventory.magnifier||a.used.magnifier||!Number.isInteger(i)||i<0||i>5||a.solved.includes(i))fail('Лупа сейчас недоступна.');a.used.magnifier=true;a.reveals[i]=PAINTINGS[i][1];event(room,'magic');
  }else if(input.item==='watch'){
   if(step.kind!=='gears'||!a.inventory.watch||a.used.watch)fail('Часы сейчас недоступны.');a.used.watch=true;a.gear.extension+=30000;event(room,'magic');
  }else fail('Предмет недоступен.',400);
 }else if(action==='turn'){
  if(step.kind!=='gears'||!Number.isInteger(input.gear)||input.gear<0||input.gear>5)fail('Механизм сейчас недоступен.');
  const g=a.gear;if(owners(room.lineup,6)[input.gear].owner!==id)fail('Эта шестерёнка принадлежит другому игроку.',403);if(input.gear===g.jam)fail('Эта шестерёнка заклинена.');
  g.current=rotate(g.current,input.gear,g.jam);g.version++;g.hint=null;event(room,'pickup');
  if(shortestMove(g.current,g.target,g.jam).distance===0){if(!g.failures)a.cleanRounds++;if(g.round===3){money(room,a.cleanRounds===3?3:a.cleanRounds===2?1:0,'act1:gears');}go(room,time);}
 }else fail('Неизвестное действие.',400);
 a.receipts.push(input.nonce);if(a.receipts.length>256)a.receipts.shift();
}
export function act1View(room,cast,playerId,host,now=Date.now()){
 const a=room.act1,step=stepOf(room),time=nowOf(room,now),elapsed=Math.max(0,time-a.startedAt),key=actKey(room);
 const activeEvent=a.event&&time-a.event.at<4000?a.event:null;
 const v={key,kind:step.kind,id:step.id,title:step.title,instruction:step.instruction,subtitle:step.subtitle,elapsedMs:elapsed,ready:a.ready,total:room.lineup.length,cast:room.lineup.map(id=>({id,name:cast[id]})),inventory:a.inventory,used:a.used,earned:room.bank.earned-a.earnedAtStart,spent:room.bank.spent-a.spentAtStart};
 if(a.vote)v.vote={...a.vote,remainingMs:Math.max(0,a.vote.until-time),needed:Math.ceil(room.lineup.length*.6)};
 if(['shop','note'].includes(step.kind))v.items=ITEMS.filter(x=>step.kind==='shop'||x.id==='note');
 if(step.kind==='note')v.note=a.inventory.note?NOTE:null;
 if(step.kind==='hunt'){
  const spawn=Math.floor(elapsed/2500),h=a.hunt;v.hunt={spawn,cell:elapsed%2500<1500&&!h.hits.includes(spawn)?h.schedule[spawn]:null,visibleMs:Math.max(0,1500-elapsed%2500),remainingMs:Math.max(0,60000-elapsed),hits:h.hits.length,misses:h.misses,slots:owners(room.lineup,12).filter(x=>host||x.owner===playerId)};
 }
 if(step.kind==='portraits'){
  v.paintings=PAINTINGS.map(([url,,letter],i)=>({index:i,url,image:'/art/act1/painting-'+(i+1)+'.webp',solved:a.solved.includes(i),letter:a.solved.includes(i)?letter:'',hint:a.firstHints.includes(i)?PAINTINGS[i][1][0]:null,reveal:a.reveals[i]||null}));v.feedback=a.feedback;v.talked=Boolean(a.talked);
 }
 if(['memory','gears'].includes(step.kind)){
  const g=a.gear;v.gears={round:g.round,attempt:g.attempt,jam:g.jam,failures:g.failures,remainingMs:Math.max(0,(step.kind==='memory'?10000:180000+g.extension)-elapsed),positions:step.kind==='memory'?g.target:g.current,owners:owners(room.lineup,6),hint:g.hint?.version===g.version?g.hint.move:null,hintCost:g.failures>=2?1:2};
 }
 let text=step.text;if(step.id==='peeves-result')text=a.hunt.hits.length>=8?'Ладно. Вот записка. Больше не просите.':'Вы безнадёжны! Записку только за монету, и не просите бесплатно!';
 const scene={...step,text,key,elapsedMs:elapsed,cast:v.cast,visual:step.kind==='line'?'castle-dialogue':step.kind==='black'?'blackout':'act1',backgroundUrl:['tower','corridor'].includes(step.background)?'/art/act1/'+step.background+'.webp':undefined,musicUrgent:step.kind==='hunt'&&v.hunt.remainingMs<10000||step.kind==='gears'&&v.gears.remainingMs<30000};
 return{act:v,...(host?{scene,soundEvent:activeEvent}:{}),event:activeEvent?{id:activeEvent.id,text:activeEvent.text,speaker:activeEvent.speaker}:null};
}
