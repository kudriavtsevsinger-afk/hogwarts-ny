import {score} from './quiz.mjs';
import {recipe,newCauldron,INGREDIENTS,SHEETS,sheetsFor,buttonsFor,assignAbility,spendAbility,expireAbility,consentedWishes,mirrorReward,finaleFlags} from './act2-rules.mjs';
const rnd=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
const fail=m=>{throw Object.assign(Error(m),{status:409});};
const line=(id,speaker,text)=>({id,kind:'line',speaker,text,duration:Math.max(4500,text.length*65)});
export const STEPS=[
 line('arrival','Дамблдор','Три удара. Это больше, чем я смел надеяться. Но кому-то очень не хотелось, чтобы вы дошли до четвёртого. Холодает. Профессор Спраут просила передать, что в теплице творится нечто странное. Идите туда. Только оденьтесь теплее.'),
 {id:'title',kind:'line',speaker:'',text:'АКТ II · Зимняя теплица',duration:5000},
 line('sprout','Профессор Спраут','Ох, как вовремя! Здесь всегда было самое тёплое место в замке. Сегодня лёд пошёл изнутри, прямо из корней. Он сомкнулся вокруг моего полуночного колокольчика. Это цветок. Он расцветает ровно в полночь и звенит.'),
 line('plan','Профессор Спраут','Сначала взгляните на Зеркало в глубине. Потом разберёмся с замком на моём шкафчике. А дальше сварим эликсир, который растопит лёд. Только не смотрите в Зеркало слишком долго. Оно любит тех, кто задерживается.'),
 {id:'ready',kind:'ready',text:'Вторая остановка: Зимняя теплица'},
 line('vendor','Продавщица','Ну конечно. Лёд, зима, ночь перед полуночью. Самое время торговать. Подходите, пока я не превратилась в сосульку.'),
 {id:'shop',kind:'shop',text:'Тележка продавщицы'},
 line('mirror-intro','Профессор Спраут','На раме вырезано имя. Прочтите его справа налево.'),
 {id:'consent',kind:'consent',text:'ЕИНАЛЕЖ',duration:15000},
 {id:'mirror',kind:'mirror',text:'Чьё это желание?'},
 {id:'choice',kind:'choice',text:'Что ты сделаешь со своим желанием?',duration:20000},
 {id:'vision',kind:'vision',text:'',duration:5000},
 line('reflection','Зеркало','Не все отражения принадлежат вам. Кто-то загадал желание раньше. И так и не отпустил его.'),
 line('station','Профессор Спраут','Вокзал? Странно. В Зеркало смотрят ради того, чего нет, а не ради того, что было вчера.'),
 line('herb-intro','Профессор Спраут','Шкафчик открывается шестизначным кодом: это номера растений в порядке на полке слева направо. Пивз переставил горшки. Записки остались. Одну он, кажется, подменил.'),
 {id:'herb',kind:'herb',text:'Гербарий Спраут · Порядок на полке'},
 line('herb-open','Профессор Спраут','Именно так! Полынь с краю, потому что она любит одиночество. А Бубонтюбер… ну, у него характер.'),
 line('pot-intro','Профессор Спраут','Эликсир растопит лёд в корнях. Каждый получит листы моей Книги и ингредиенты. Читайте вслух, но чужие листы не подсматривайте. И не торопитесь. Хотя нет, торопитесь. Котёл остывает.'),
 {id:'pot-ready',kind:'ready',text:'Прочитайте свои листы. Договоритесь и нажмите «Готов».'},
 {id:'pot',kind:'pot',text:'Эликсир Спраут'},
 line('listen','Профессор Спраут','Слушайте.'),
 {id:'flower',kind:'flower',text:'Удары полуночи: 6 из 12',duration:11000},
 {id:'silence',kind:'vision',text:'',duration:1000},
 {id:'train-whistle',kind:'line',text:'',duration:4000},
 line('train','Дамблдор','Поезда в это время не ходят.'),
 line('express','Профессор Спраут','Это Хогвартс-экспресс. Я узнала бы этот гудок из тысячи.'),
 {id:'end',kind:'end',text:'АКТ III · Библиотека'}];
const DECOYS=['Чтобы чай никогда не остывал','Найти второй носок','Всегда выбирать нужную очередь в магазине','Понимать язык сов','Никогда не терять ключи','Увидеть море зимой','Просыпаться всегда выспавшимся','Научиться печь идеальные пирожки'];
export const ITEMS=[{id:'shield',name:'Щит Хранителя',cost:3},{id:'glasses',name:'Очки Спраут',cost:2},{id:'watch',name:'Карманные часы «Тик-так»',cost:2}];
export const step=r=>STEPS[r.act2.index];
const key=r=>r.run+':act2:'+r.act2.serial;
function money(r,n,id){if(r.bank.ledger.some(x=>x.key===id))return;if(r.bank.balance+n<0)fail('Недостаточно монет');r.bank.balance+=n;r.bank[n<0?'spent':'earned']+=Math.abs(n);r.bank.ledger.push({key:id,amount:n,balance:r.bank.balance});}
function enter(r,index,t){const a=r.act2;a.index=index;a.serial++;a.at=t;a.deadline=t+(STEPS[index].duration||0);a.ready=[];a.vote=null;a.message='';const s=step(r);if(s.kind==='mirror'){a.cards=consentedWishes(r.lineup.map(id=>r.players.get(id)),r.wishes||{},a.consent);const pool=[...DECOYS];for(let i=pool.length-1;i>0;i--){const j=rnd(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}const n=a.cards.length<2?4-a.cards.length:2;a.cards.push(...pool.slice(0,n).map(text=>({author:'decoy',text})));a.cards.sort(()=>rnd(3)-1);a.card=0;a.correct=0;mirrorRound(r,t);}if(s.kind==='pot')potRound(r,1,t);if(s.kind==='end'){r.flags.strikes=6;for(const id of r.lineup)expireAbility(r.players.get(id));}}
const next=(r,t)=>enter(r,r.act2.index+1,t);
export function beginAct2(r,t=Date.now()){r.phase='act2';r.flags={...(r.flags||{}),strikes:3};r.act2={index:0,serial:0,at:t,ready:[],consent:{},choices:{},inventory:{},used:{},receipts:[],herbHints:0,herbErrors:0,lockedUntil:0,failures:0,consecutive:0,roundVersion:0};if(r.act1?.inventory.watch){r.act2.inventory.watch=true;r.act2.used.watch=Boolean(r.act1.used.watch);}for(const id of r.lineup){const p=r.players.get(id);assignAbility(p,score(p.answers).role,'act2');p.flags||={};p.flags.wish_text=Array.from(r.wishes?.[id]||'').slice(0,140).join('');}enter(r,0,t);}
function mirrorRound(r,t){const a=r.act2;a.mode='guess';a.votes={};a.removed={};a.deadline=t+25000;a.tied=null;a.serial++;a.vote=null;}
function reveal(r,answer,t){const a=r.act2;a.result={answer,author:a.cards[a.card].author};if(answer===a.result.author)a.correct++;a.mode='reveal';a.deadline=t+6000;a.serial++;a.vote=null;}
function decide(r,t){const a=r.act2,c=a.cards[a.card],counts={};for(const [id,v] of Object.entries(a.votes)){if(id!==c.author)counts[v]=(counts[v]||0)+1;}const max=Math.max(0,...Object.values(counts)),ties=Object.keys(counts).filter(k=>counts[k]===max);if(ties.length>1){const leader=r.lineup.find(id=>id!==c.author&&r.players.get(id).ability.id==='leader_word'&&!r.players.get(id).ability.spent);if(leader){a.mode='tie';a.tied=ties;a.leader=leader;a.deadline=t+15000;a.serial++;return;}}reveal(r,ties.length?ties[rnd(ties.length)]:null,t);}
function potRound(r,round,t){const a=r.act2;a.pot=newCauldron(round,rnd);a.roundVersion++;a.mode='input';a.deadline=t+a.pot.remaining*1000;a.hint=a.consecutive>=2?recipe(a.pot)[0]:null;a.revealSheets=[];a.serial++;a.vote=null;}
function potFail(r,t){const a=r.act2;a.failures++;a.consecutive++;a.mode='retry';a.deadline=t+4000;a.message='Остыл. Бывает. Заново, и на этот раз в нужной очерёдности.';a.serial++;a.vote=null;}
export function tickAct2(r,now=Date.now()){if(r.phase!=='act2'||r.pausedAt!=null)return false;const a=r.act2,t=now;if(a.vote&&t>=a.vote.until)a.vote=null;
 for(let guard=0;guard<30;guard++){const s=step(r);if(s.kind==='consent'&&(t>=a.at+15000||r.lineup.every(id=>id in a.consent))){next(r,t);continue;}if(s.kind==='choice'&&(t>=a.at+20000||r.lineup.every(id=>id in a.choices))){for(const id of r.lineup)r.players.get(id).flags.zerkalo_choice=a.choices[id]??null;r.flags.mirrorMajority=finaleFlags(r.lineup.map(id=>r.players.get(id))).canRelease?'release':null;r.flags.cluesFound=[...new Set([...(r.flags.cluesFound||[]),'scarf'])];delete r.wishes;delete a.cards;delete a.votes;delete a.consent;delete a.choices;delete a.result;delete a.removed;next(r,t);continue;}
 if(s.kind==='mirror'&&t>=a.deadline){if(a.mode==='guess')decide(r,t);else if(a.mode==='tie')reveal(r,a.tied[rnd(a.tied.length)],t);else if(++a.card<a.cards.length)mirrorRound(r,t);else{r.flags.mirrorCorrectRate=a.correct/a.cards.length;money(r,mirrorReward(a.correct,a.cards.length),'act2:mirror');next(r,t);}continue;}
 if(s.kind==='pot'&&t>=a.deadline){if(a.mode==='input')potFail(r,t);else if(a.mode==='retry')potRound(r,a.pot.round,t);else if(a.pot.round<5){a.consecutive=0;potRound(r,a.pot.round+1,t);}else{money(r,a.failures<=1?3:a.failures<=3?1:0,'act2:pot');next(r,t);}continue;}
 if(s.duration&&!['consent','choice'].includes(s.kind)&&t>=a.at+s.duration){next(r,a.at+s.duration);continue;}break;}return true;}
function buy(r){const a=r.act2,v=a.vote;if(!v)return;if(v.target==='potHint'&&(step(r).kind!=='pot'||a.mode!=='input'||v.version!==a.roundVersion||v.position!==a.pot.added.length)){a.vote=null;return;}if(r.bank.balance<v.cost){a.vote=null;return;}money(r,-v.cost,'act2:buy:'+v.id);if(v.target==='herbHint')a.herbHints++;else if(v.target==='potHint')a.hint=recipe(a.pot)[a.pot.added.length];else a.inventory[v.target]=true;a.vote=null;}
export function act2Action(r,p,type,input,now=Date.now()){if(!p||!r.lineup.includes(p.id))fail('Нет доступа');if(r.pausedAt!=null)fail('Игра на паузе');tickAct2(r,now);const a=r.act2,s=step(r),id=p.id;if(input.key!==key(r))fail('Этот момент уже изменился');if(input.nonce&&a.receipts.includes(input.nonce))return;
 if(type==='ready'){if(!['ready','shop'].includes(s.kind)||a.vote)fail('Дождитесь завершения');if(!a.ready.includes(id))a.ready.push(id);if(a.ready.length===r.lineup.length)next(r,now);}
 else if(type==='consent'){if(s.kind!=='consent'||typeof input.yes!=='boolean'||id in a.consent)fail('Ответ недоступен');a.consent[id]=input.yes;p.flags.wish_shown=input.yes&&Boolean(r.wishes?.[id]);}
 else if(type==='guess'){if(s.kind!=='mirror'||a.mode!=='guess'||a.cards[a.card].author===id||id in a.votes||![...r.lineup,'decoy'].includes(input.answer)||a.removed[id]===input.answer)fail('Голос недоступен');a.votes[id]=input.answer;}
 else if(type==='choice'){if(s.kind!=='choice'||id in a.choices||!['release','keep','share'].includes(input.choice))fail('Выбор недоступен');a.choices[id]=input.choice;}
 else if(type==='code'){if(s.kind!=='herb'||now<a.lockedUntil)fail('Замок временно закрыт');if(input.code==='715294'){if(!a.herbHints)money(r,1,'act2:herb');next(r,now);}else{a.herbErrors++;a.message='Код не подошёл';if(a.herbErrors%3===0)a.lockedUntil=now+20000;}}
 else if(type==='propose'){if(a.vote)fail('Уже идёт голосование');let cost;const item=ITEMS.find(i=>i.id===input.target);if(item&&s.kind==='shop'&&!a.inventory[item.id])cost=item.cost;else if(input.target==='herbHint'&&s.kind==='herb'&&a.herbHints<3)cost=1;else if(input.target==='potHint'&&s.kind==='pot'&&a.mode==='input'&&a.hint==null)cost=1;else fail('Недоступно');if(r.bank.balance<cost)fail('Недостаточно монет');a.vote={id:crypto.randomUUID(),target:input.target,version:a.roundVersion,position:a.pot?.added.length,cost,yes:[id],no:[],until:now+30000};if(a.vote.yes.length>=Math.ceil(r.lineup.length*.6))buy(r);}
 else if(type==='vote'){const v=a.vote;if(!v||v.id!==input.voteId||v.yes.includes(id)||v.no.includes(id)||typeof input.yes!=='boolean')fail('Голос недоступен');(input.yes?v.yes:v.no).push(id);if(v.yes.length>=Math.ceil(r.lineup.length*.6))buy(r);else if(v.no.length>r.lineup.length-Math.ceil(r.lineup.length*.6))a.vote=null;}
 else if(type==='ingredient'){if(s.kind!=='pot'||a.mode!=='input'||input.version!==a.roundVersion||!buttonsFor(r.lineup.indexOf(id),r.lineup.length).some(b=>b.id===input.ingredient))fail('Недоступно');const rec=recipe(a.pot);if(input.ingredient===rec[a.pot.added.length]){a.pot.added.push(input.ingredient);a.hint=null;a.vote=null;if(a.pot.added.length===rec.length){a.mode='success';a.deadline=now+3500;a.serial++;a.vote=null;}}else if(++a.pot.cracks>=3)potFail(r,now);}
 else if(type==='use'||type==='ability'){const ability=type==='ability',aid=ability?p.ability?.id:input.item;if(ability&&(!p.ability||p.ability.spent))fail('Способность уже использована');if(!ability&&(!a.inventory[aid]||a.used[aid]))fail('Предмет недоступен');
 if(aid==='cold_calc'){if(s.kind!=='mirror'||a.mode!=='guess'||a.cards[a.card].author===id||id in a.votes)fail('Недоступно');a.removed[id]=[...r.lineup,'decoy'].find(x=>x!==a.cards[a.card].author);}
 else if(aid==='leader_word'){if(s.kind!=='mirror'||a.mode!=='tie'||a.leader!==id||!a.tied.includes(input.answer))fail('Нет ничьей');reveal(r,input.answer,now);}
 else {if(s.kind!=='pot'||a.mode!=='input')fail('Доступно у котла');if(['shield','brave_stand'].includes(aid)){if(!a.pot.cracks)fail('Трещин пока нет');a.pot.cracks--;}else if(aid==='care'||aid==='watch')a.deadline+=aid==='care'?20000:30000;else if(aid==='glasses')a.revealSheets=[a.pot.color<2?1:2,3,4,...(a.pot.frost?[5]:[]),...(a.pot.glow?[6]:[])];else if(aid==='read_between')a.revealSheets=[3,4];else if(aid==='maker_touch'){if(input.confirm!==true)fail('Подтверди смену рецепта');potRound(r,a.pot.round,now);}else fail('Неизвестное действие');}
 if(ability)spendAbility(p,'act2',aid);else a.used[aid]=true;
 }else fail('Неизвестное действие');if(input.nonce)a.receipts.push(input.nonce);a.receipts=a.receipts.slice(-200);tickAct2(r,now);}
export function act2View(r,cast,id,host,now=Date.now()){const a=r.act2,s=step(r),t=r.pausedAt??now,p=r.players.get(id),v={key:key(r),...s,cast:r.lineup.map(id=>({id,name:cast[id]})),remaining:Math.max(0,(a.deadline||a.at+(s.duration||0))-t),ready:a.ready.length,total:r.lineup.length,message:a.message,inventory:ITEMS.filter(i=>a.inventory[i.id]&&!a.used[i.id]),vote:a.vote?{...a.vote,yes:a.vote.yes.length,no:a.vote.no.length,voted:[...a.vote.yes,...a.vote.no].includes(id)}:null};
 if(s.kind==='shop')v.items=ITEMS.filter(i=>!a.inventory[i.id]);if(s.kind==='consent')v.answered=id in a.consent;if(s.kind==='choice')v.answered=id in a.choices;
 if(s.kind==='mirror'){v.mode=a.mode;v.text=a.cards[a.card].text;v.round=a.card+1;v.totalRounds=a.cards.length;v.own=a.cards[a.card].author===id;v.voted=id in a.votes;v.options=[...r.lineup,'decoy'].filter(x=>x!==a.removed[id]).map(id=>({id,name:cast[id]||'Зеркало выдумало'}));if(a.mode==='reveal')v.result={correct:a.result.answer===a.result.author,name:cast[a.result.author]||'Зеркало выдумало'};if(a.mode==='tie'&&a.leader===id)v.tie=a.tied;}
 if(s.kind==='herb'){v.hints=INGREDIENTS.slice(0,a.herbHints);v.locked=Math.max(0,a.lockedUntil-t);v.nudge=t-a.at>=120000?'Начните с записок, где называется край полки.':'';}
 if(s.kind==='pot'||s.id==='pot-ready'){if(!host){v.sheets=sheetsFor(r.lineup.indexOf(id),r.lineup.length);v.buttons=buttonsFor(r.lineup.indexOf(id),r.lineup.length);}if(s.kind==='pot'){v.mode=a.mode;v.pot={...a.pot};v.version=a.roundVersion;v.hint=a.hint!=null?INGREDIENTS[a.hint]:null;v.revealSheets=a.revealSheets;if(a.failures>=6)v.rescue=recipe(a.pot).map(i=>INGREDIENTS[i]);}}
 const ability=p?.ability;if(ability&&!ability.spent&&((s.kind==='pot'&&a.mode==='input'&&!['cold_calc','leader_word'].includes(ability.id))||(s.kind==='mirror'&&((ability.id==='cold_calc'&&a.mode==='guess'&&!v.own&&!v.voted)||(ability.id==='leader_word'&&v.tie)))))v.ability=ability;
 return {act2:v};}
