import {ACT1_SCRIPT as SCRIPT,ITEMS,PAINTINGS,NOTE,LEGACY_ACT1_IDS,PAINTING_CLUES} from './act1-script.mjs';
import {HUNT,huntDuration,CHIMES,chimeShowMs,currentPainting,createHunt,createChimes,showChimes} from './party-games.mjs';
const random=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
const fail=(message,status=409)=>{throw Object.assign(new Error(message),{status});};
const nowOf=(room,now)=>room.pausedAt??now;
export const stepOf=room=>SCRIPT[room.act1.index];
export const actKey=room=>room.run+':act1:'+room.act1.serial;
function event(room,cue,text='',speaker=''){const a=room.act1;a.event={id:room.run+':event:'+(++a.eventSerial),cue,text,speaker,at:a.clock};}
function money(room,amount,key){const bank=room.bank;if(bank.ledger.some(x=>x.key===key))return false;if(bank.balance+amount<0)fail('В общем банке недостаточно монет.');bank.balance+=amount;if(amount<0)bank.spent-=amount;else bank.earned+=amount;bank.ledger.push({key,amount,balance:bank.balance});return true;}
function enter(room,index,now){const a=room.act1;a.index=index;a.stepId=SCRIPT[index].id;a.serial++;a.startedAt=now;a.clock=now;a.ready=[];a.vote=null;a.feedback=null;a.event=null;const step=stepOf(room);
 if(step.kind==='hunt')a.hunt=createHunt(room.lineup,random);
 if(step.kind==='chimes'){a.chimes=createChimes(random);showChimes(a.chimes,now);}
}
export function beginAct1(room,now=Date.now()){if(room.act1)return;room.phase='act1';room.act1={version:4,index:0,serial:0,startedAt:now,clock:now,ready:[],inventory:{},used:{},solved:[],firstHints:[],reveals:{},receipts:[],eventSerial:0,cleanRounds:0,spentAtStart:room.bank.spent,earnedAtStart:room.bank.earned};enter(room,0,now);}
const go=(room,now)=>enter(room,room.act1.index+1,now);
function finishHunt(room){const a=room.act1,n=a.hunt.hits.length;if(n>=8)a.inventory.note=true;if(n>=10)money(room,2,'act1:hunt');}
function settleVote(room){const a=room.act1,v=a.vote;if(!v)return;const cost=v.cost;
 if(room.bank.balance<cost){a.vote=null;event(room,'pickup','В общем банке недостаточно монет.');return;}
 // Revalidate a state-sensitive hint when the team approves it.
 if(v.kind==='chime-hint'&&(stepOf(room).kind!=='chimes'||a.chimes.mode!=='input'||v.target!==a.chimes.version)){a.vote=null;return;}
 if(v.kind==='portrait-hint'&&a.solved.includes(v.target)){a.vote=null;return;}
 if(!money(room,-cost,'act1:purchase:'+v.id)){a.vote=null;return;}
 if(v.kind==='item')a.inventory[v.target]=true;
 if(v.kind==='portrait-hint')a.firstHints.push(v.target);
 if(v.kind==='chime-hint')a.chimes.hint=a.chimes.position;
 a.vote=null;a.ready=[];event(room,'coins',v.kind==='item'?'Вот, другое дело. Всё, что куплено, уже ваше, сдачи не будет.': 'Подсказка открыта.',v.kind==='item'?'Продавщица':'');
}
export function tickAct1(room,now=Date.now()){
 if(room.phase!=='act1')return false;const a=room.act1,time=nowOf(room,now);a.clock=time;let dirty=false;
 if(a.version!==4){
  const old=a.stepId||LEGACY_ACT1_IDS[a.index];const id=/^(gear-|mechanism-explanation)/.test(old||'')?'chime-explanation':old==='act-silence'?'vestibule-return':old;
  const index=Math.max(0,SCRIPT.findIndex(s=>s.id===id));a.version=4;
  // Reaction schedule and removed gear stages restart safely; other progress stays intact.
  if(id!==old||id==='hunt')enter(room,index,time);else{a.index=index;a.stepId=SCRIPT[index].id;a.serial++;a.vote=null;a.event=null;}
  dirty=true;
 }
 if(a.vote&&time>=a.vote.until){a.vote=null;event(room,'pickup','Голосование завершено. Покупка не состоялась.');dirty=true;}
 for(let guard=0;guard<60;guard++){
  const step=stepOf(room),elapsed=time-a.startedAt;
  if((step.id==='peeves-six'&&a.hunt.hits.length<6)||(step.id==='peeves-ten'&&a.hunt.hits.length<10)){go(room,time);dirty=true;continue;}
  if(step.durationMs&&elapsed>=step.durationMs){go(room,a.startedAt+step.durationMs);dirty=true;continue;}
  if(step.kind==='hunt'&&elapsed>=huntDuration){finishHunt(room);go(room,a.startedAt+huntDuration);dirty=true;continue;}
  if(step.kind==='chimes'){
   const g=a.chimes;
   if(g.mode==='show'&&time>=g.modeAt+chimeShowMs(g)){g.mode='input';g.modeAt+=chimeShowMs(g);dirty=true;}
   if(g.mode==='success'&&time>=g.modeAt+2200){
    if(g.round===6){money(room,g.mistakes<=2?3:g.mistakes<=5?1:0,'act1:chimes');go(room,g.modeAt+2200);dirty=true;continue;}
    g.round++;g.sequence.push(g.round<=4?g.pool[g.round+1]:random(6));showChimes(g,g.modeAt+2200);dirty=true;continue;
   }
   if(g.mode==='retry'&&time>=g.modeAt+1800){showChimes(g,g.modeAt+1800);dirty=true;continue;}
   if(g.mode==='input'&&time>=g.deadline){g.mistakes++;g.mode='retry';g.modeAt=g.deadline;a.vote=null;g.last=null;dirty=true;continue;}
  }
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
 }else if(kind==='chime-hint'){
  const g=a.chimes;if(step.kind!=='chimes'||g.mode!=='input'||g.hint===g.position)fail('Подсказка сейчас недоступна.');cost=1;label='Следующий знак';target=g.version;
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
  if(a.vote)fail('Сначала завершите текущее голосование.');if(input.kind==='portrait-hint'&&input.target!==currentPainting(room,id))fail('Это задание другого участника.',403);const p=proposal(room,input.kind,input.target);
  a.vote={...p,id:crypto.randomUUID(),until:time+30000,yes:[id],no:[]};a.ready=[];
  if(a.vote.yes.length>=Math.ceil(room.lineup.length*.6))settleVote(room);
 }else if(action==='vote'){
  const v=a.vote;if(!v||v.id!==input.voteId)fail('Голосование уже завершилось.');if(typeof input.yes!=='boolean')fail('Выбери вариант.',400);
  if(v.yes.includes(id)||v.no.includes(id))return;(input.yes?v.yes:v.no).push(id);
  if(v.yes.length>=Math.ceil(room.lineup.length*.6))settleVote(room);
  else if(v.no.length>room.lineup.length-Math.ceil(room.lineup.length*.6)){a.vote=null;event(room,'pickup','Команда отклонила покупку.');}
 }else if(action==='tap'){
  if(step.kind!=='hunt')return;const h=a.hunt,elapsed=time-a.startedAt-HUNT.lead,spawn=input.spawn,owner=room.lineup.indexOf(id);
  if(!Number.isInteger(input.cell)||input.cell<owner*3||input.cell>=owner*3+3)fail('Это не твоя арка.',403);
  if(!Number.isInteger(spawn)||spawn<0||spawn>=HUNT.turns)return;
  h.attempted ||= [];const token=id+':'+spawn;if(h.attempted.includes(token)||h.hits.includes(token)||time-(h.lastTap[id]??-Infinity)<140)return;h.lastTap[id]=time;
  const age=elapsed-spawn*HUNT.interval;
  if(age>=0&&age<=HUNT.visible+HUNT.grace&&h.schedule[spawn][owner]===input.cell){h.hits.push(token);event(room,'pickup');}
  else if(age>=0&&age<HUNT.interval){h.misses++;h.attempted.push(token);}
 }else if(action==='answer'){
  if(step.kind!=='portraits'||!Number.isInteger(input.painting)||input.painting<0||input.painting>5||typeof input.answer!=='string'||input.answer.length>100)fail('Выбери картину и введи ответ.',400);
  const i=input.painting;if(i!==currentPainting(room,id)){if(a.solved.includes(i))return;fail('Это задание другого участника.',403);}if(!a.solved.includes(i)){
   if(normalized(input.answer)===PAINTINGS[i][1]){a.solved.push(i);a.feedback={painting:i,correct:true,by:id,at:time};event(room,'success');if(a.solved.length===6){go(room,time);}}
   else{a.feedback={painting:i,correct:false,by:id,at:time};event(room,'pickup');}
  }
 }else if(action==='talk'){
  if(step.kind!=='portraits')fail('Портрет недоступен.');if(!a.talked){a.talked=true;event(room,'magic','Ищете слово? Оно не спрятано. Оно просто длинное, а вы торопитесь.','Портрет');}
 }else if(action==='use'){
  if(input.item==='magnifier'){
   const i=input.painting;if(step.kind!=='portraits'||!a.inventory.magnifier||a.used.magnifier||!Number.isInteger(i)||i<0||i>5||a.solved.includes(i)||i!==currentPainting(room,id))fail('Лупа сейчас недоступна.');a.used.magnifier=true;a.reveals[i]=PAINTINGS[i][1];event(room,'magic');
  }else if(input.item==='watch'){
   if(step.kind!=='chimes'||a.chimes.mode!=='input'||!a.inventory.watch||a.used.watch)fail('Часы сейчас недоступны.');a.used.watch=true;a.chimes.deadline+=30000;event(room,'magic');
  }else if(input.item==='note'){
   if(!['note','portraits'].includes(step.kind)||!a.inventory.note||a.used.note)fail('Свиток сейчас недоступен.');a.used.note=true;a.noteReadAt=time;event(room,'magic');
  }else fail('Предмет недоступен.',400);
 }else if(action==='chime'){
  const g=a.chimes;if(step.kind!=='chimes'||g.mode!=='input')return;
  const i=input.pad;if(!Number.isInteger(i)||i<0||i>5||room.lineup[i%room.lineup.length]!==id)fail('Этот знак у другого игрока.',403);
  // Simultaneous or repeated requests from an older beat cannot spoil the next beat.
  if(input.version!==g.version)return;
  g.version++;g.hint=null;g.last={pad:i,at:time,correct:i===g.sequence[g.position]};
  if(g.last.correct){g.position++;event(room,'pickup');if(g.position===g.sequence.length){g.mode='success';g.modeAt=time;a.vote=null;event(room,'success');}}
  else{g.mistakes++;g.mode='retry';g.modeAt=time;a.vote=null;event(room,'pickup');}
 }else if(action==='replay'){
  const g=a.chimes;if(step.kind!=='chimes'||g.mode!=='input')return;
  if(input.version!==g.version)return;g.replays++;a.vote=null;showChimes(g,time);
 }else fail('Неизвестное действие.',400);
 a.receipts.push(input.nonce);if(a.receipts.length>256)a.receipts.shift();
}
export function act1View(room,cast,playerId,host,now=Date.now()){
 const a=room.act1,step=stepOf(room),time=nowOf(room,now),elapsed=Math.max(0,time-a.startedAt),key=actKey(room);
 const activeEvent=a.event&&time-a.event.at<4000?a.event:null;
 const v={key,kind:step.kind,id:step.id,title:step.title,instruction:step.instruction,subtitle:step.subtitle,elapsedMs:elapsed,ready:a.ready,total:room.lineup.length,cast:room.lineup.map(id=>({id,name:cast[id]})),inventory:a.inventory,used:a.used,earned:room.bank.earned-a.earnedAtStart,spent:room.bank.spent-a.spentAtStart};
 v.pouch=ITEMS.filter(item=>a.inventory[item.id]&&!a.used[item.id]).map(item=>{
  const usable=item.id==='watch'?step.kind==='chimes'&&a.chimes.mode==='input':item.id==='magnifier'?step.kind==='portraits'&&(host?a.solved.length<6:currentPainting(room,playerId)!==null):['note','portraits'].includes(step.kind);
  const help=usable?({watch:'Добавить 30 секунд к текущему раунду',magnifier:'Раскрыть ответ твоей текущей картины',note:'Развернуть свиток'})[item.id]:'Пригодится позже';
  return {id:item.id,name:item.name,image:item.image,usable,help};
 });
 if(a.vote)v.vote={...a.vote,remainingMs:Math.max(0,a.vote.until-time),needed:Math.ceil(room.lineup.length*.6)};
 if(['shop','note'].includes(step.kind))v.items=ITEMS.filter(x=>step.kind==='shop'||x.id==='note');
 if(['note','portraits'].includes(step.kind)){v.note=a.used.note?NOTE:null;if(a.noteReadAt!=null)v.noteReadingMs=Math.max(0,14000-(time-a.noteReadAt));}
 if(step.kind==='hunt'){
  const h=a.hunt,cols=room.lineup.length;v.hunt={config:HUNT,remainingMs:Math.max(0,huntDuration-elapsed),hits:h.hits.length,misses:h.misses,goal:8,bonus:10,hitTokens:h.hits,schedule:host?h.schedule:null,slots:room.lineup.flatMap((id,i)=>Array.from({length:3},(_,j)=>({index:i*3+j,owner:id}))).filter(x=>host||x.owner===playerId)};
 }
 if(step.kind==='portraits'){
  const own=currentPainting(room,playerId);v.assignment=own;v.letters=PAINTINGS.map((p,i)=>a.solved.includes(i)?p[2]:'');v.solvedCount=a.solved.length;
  v.paintings=PAINTINGS.map(([url,,letter],i)=>({index:i,url,image:'/art/act1/painting-'+(i+1)+'.webp',clue:PAINTING_CLUES[i],solved:a.solved.includes(i),letter:a.solved.includes(i)?letter:'',hint:a.firstHints.includes(i)?PAINTINGS[i][1][0]:null,reveal:a.reveals[i]||null})).filter(p=>host||p.index===own);
  v.feedback=a.feedback&&time-a.feedback.at<3500?{...a.feedback,remainingMs:3500-(time-a.feedback.at)}:null;v.talked=Boolean(a.talked);
 }
 if(step.kind==='chimes'){
  const g=a.chimes;v.chimes={round:g.round,total:6,length:g.sequence.length,mode:g.mode,modeElapsed:time-g.modeAt,position:g.position,version:g.version,mistakes:g.mistakes,replays:g.replays,remainingMs:Math.max(0,g.deadline-time),sequence:host&&g.mode==='show'?g.sequence:null,hint:host&&g.hint===g.position?g.sequence[g.position]:null,last:host&&g.last?{...g.last,ageMs:time-g.last.at}:null,pads:CHIMES.map((c,i)=>({...c,index:i,owner:room.lineup[i%room.lineup.length]})).filter(c=>host||c.owner===playerId)};
 }

 let text=step.text;if(step.id==='peeves-result')text=a.hunt.hits.length>=8?'Ладно. Вот записка. Больше не просите.':'Вы безнадёжны! Записку только за монету, и не просите бесплатно!';
 const scene={...step,text,key,elapsedMs:elapsed,cast:v.cast,visual:step.kind==='line'?'castle-dialogue':step.kind==='black'?'blackout':step.kind==='travel'?'act-travel':'act1',backgroundUrl:step.background?(['tower','corridor'].includes(step.background)?'/art/act1/':'/art/castle/')+step.background+'.webp':undefined,musicUrgent:step.kind==='hunt'&&v.hunt.remainingMs<10000||step.kind==='chimes'&&v.chimes.remainingMs<30000};
 return{act:v,...(host?{scene,soundEvent:activeEvent}:{}),event:activeEvent?{id:activeEvent.id,text:activeEvent.text,speaker:activeEvent.speaker,remainingMs:4000-(time-activeEvent.at)}:null};
}
