/* Shared Act I interface. The server owns all answers, purchases and timers. */
window.ActOne=(()=>{
 let current,root,signature,hostMode,send,player,receivedAt=0,pending=false,selected=0,lastFeedback,pouch,pouchKey,pouchSelected=null;
 const drafts=new Map();
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const image=(url,alt,cls)=>{const n=el('img',cls);n.src=url;n.alt=alt||'';return n;};
 const name=id=>current.act.cast.find(p=>p.id===id)?.name||id;
 const seconds=ms=>Math.max(0,Math.ceil(ms/1000));
 const clock=ms=>{const n=seconds(ms);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
 function localRemaining(ms){return Math.max(0,ms-(current.paused?0:performance.now()-receivedAt));}
 async function action(type,payload={}){
  if(pending||current.paused)return;pending=true;updateInventory();
  const request={type,key:current.act.key,nonce:crypto.randomUUID(),...payload};
  try{await send(request);}catch(e){const error=document.querySelector('#error');error.hidden=false;error.textContent=e.message;}finally{pending=false;update();updateInventory();}
 }
 function button(parent,text,type,payload={},cls='act-button'){const b=el('button',cls,text);b.type='button';b.onclick=()=>action(type,typeof payload==='function'?payload():payload);parent.append(b);return b;}
 function stat(parent,label,value,cls){const n=el('div','act-stat '+(cls||''));n.append(el('span','',label),el('strong','',value));parent.append(n);return n;}
 function makeCopy(){const copy=el('div','act-copy');copy.append(el('h1','act-heading'),el('p','act-instruction'),el('p','act-event'));root.append(copy);}
 function makeVote(){const area=el('aside','act-vote');area.hidden=true;area.append(el('h2','vote-title'),el('p','vote-progress'));if(!hostMode){const controls=el('div','vote-buttons');button(controls,'За','vote',()=>({voteId:current.act.vote?.id,yes:true}));button(controls,'Против','vote',()=>({voteId:current.act.vote?.id,yes:false}),'act-button quiet');area.append(controls);}root.append(area);}
 function makeReady(parent,label='Продолжить'){if(!hostMode)button(parent,label,'ready',{},'act-button act-continue');parent.append(el('p','act-ready'));}
 function makeShop(parent){
  const items=el('div','act-items');
  for(const item of current.act.items){
   const tile=el('section','act-item');tile.dataset.item=item.id;
   tile.append(image(item.image,item.name,'item-art'),el('h2','',item.name),el('p','',item.description),el('strong','item-price',item.cost+' мон.'));
   if(!hostMode)button(tile,'Предложить покупку','propose',{kind:'item',target:item.id});items.append(tile);
  }
  parent.append(items);makeReady(parent,'Продолжить путь');
 }
 function updateInventory(){
  if(!current?.act)return;
  if(!pouch){pouch=el('aside','team-inventory');pouch.id='team-inventory';pouch.setAttribute('aria-label','Артефакты команды');document.body.append(pouch);}
  const items=current.act.pouch||[];pouch.hidden=!items.length||['title','end','black'].includes(current.act.kind);pouch.className='team-inventory '+(hostMode?'display-inventory':'phone-inventory');
  document.body.classList.toggle('has-inventory',Boolean(items.length));
  if(!items.some(i=>i.id===pouchSelected))pouchSelected=null;
  const key=JSON.stringify([hostMode,items,pouchSelected,selected,current.paused,pending]);
  if(pouchKey===key)return;pouchKey=key;pouch.replaceChildren();
  pouch.append(el('span','inventory-label','Артефакты команды'));
  const row=el('div','inventory-row');pouch.append(row);
  for(const item of items){
   const slot=el(hostMode?'div':'button','inventory-slot'+(item.usable?' available':''));
   slot.append(image(item.image,'','inventory-image'),el('span','inventory-name',item.name),el('small','inventory-status',item.usable?'Можно использовать':'Пригодится позже'));
   if(!hostMode){slot.type='button';slot.setAttribute('aria-label',item.name+' · '+(item.usable?'можно использовать':'пригодится позже'));slot.onclick=()=>{pouchSelected=pouchSelected===item.id?null:item.id;updateInventory();};}
   row.append(slot);
  }
  const item=items.find(i=>i.id===pouchSelected);
  if(item&&!hostMode){
   const detail=el('section','inventory-detail');detail.append(el('h2','',item.name),el('p','',item.help));
   if(item.id==='magnifier'&&item.usable)detail.append(el('p','', 'Выбрана картина '+(selected+1)+'. Чтобы выбрать другую, закрой это окно и коснись картины.'));
   if(item.usable){const use=button(detail,'Использовать','use',()=>({item:item.id,...(item.id==='magnifier'?{painting:selected}:{})}));use.disabled=pending||current.paused||(item.id==='magnifier'&&current.act.paintings?.[selected]?.solved);}
   const close=el('button','act-button quiet','Закрыть');close.type='button';close.onclick=()=>{pouchSelected=null;updateInventory();};detail.append(close);pouch.append(detail);
  }
 }
 function makeHunt(parent){const stats=el('div','act-stats');stat(stats,'Осталось','1:00','hunt-time');stat(stats,'Поимки','0 / 8','hunt-hits');stat(stats,'Промахи','0','hunt-misses');parent.append(stats);const cells=el('div','hunt-niches');for(const slot of current.act.hunt.slots){const n=el(hostMode?'div':'button','hunt-niche');n.dataset.cell=slot.index;if(!hostMode){n.type='button';n.onclick=()=>action('tap',{cell:slot.index,spawn:current.act.hunt.spawn});}n.setAttribute('aria-label','Ниша '+(slot.index+1));n.append(image('/art/act1/props/niche.webp','','niche-art'),el('span','niche-number',slot.index+1),image('/art/castle/peeves.webp','Пивз','niche-peeves'),el('span','niche-owner',hostMode?name(slot.owner):'Твоя ниша'));cells.append(n);}parent.append(cells);}
 function makePortraits(parent){const wall=el('div','portrait-wall');for(const p of current.act.paintings){const card=el(hostMode?'figure':'button','puzzle-portrait');card.dataset.painting=p.index;if(!hostMode){card.type='button';card.onclick=()=>{selected=p.index;lastFeedback=null;update();updateInventory();};}card.append(image(p.image,'Картина '+(p.index+1)),el('span','painting-number','Картина '+(p.index+1)),el('span','painting-letter'));wall.append(card);}parent.append(wall);
 const word=el('div','portrait-word');for(let i=0;i<6;i++)word.append(el('span'));parent.append(word);
 if(!hostMode){const editor=el('section','portrait-editor');editor.append(el('h2','selected-title'));const link=el('a','act-button ar-link','Открыть загадку через камеру');link.target='_blank';link.rel='noopener noreferrer';editor.append(link,el('p','portrait-help','Вернись сюда после просмотра загадки и введи ответ.'));
  const form=el('form','portrait-form'),input=el('input');input.maxLength=100;input.placeholder='Ответ на загадку';input.autocomplete='off';input.setAttribute('aria-label','Ответ на выбранную картину');input.oninput=()=>drafts.set(current.run+':'+selected,input.value);form.append(input,el('button','act-button','Ответить'));form.onsubmit=e=>{e.preventDefault();void action('answer',{painting:selected,answer:input.value});};editor.append(form,el('p','answer-feedback'),el('p','portrait-hint'));const help=el('div','portrait-actions');button(help,'Первая буква · 1 мон.','propose',()=>({kind:'portrait-hint',target:selected}),'act-button quiet hint-buy');button(help,'Поговорить с портретом','talk',{},'act-button quiet portrait-talk');editor.append(help);parent.append(editor);
 }}
 function makeGears(parent){
  const a=current.act,g=a.gears,practice=a.kind==='practice';
  const stats=el('div','act-stats');stat(stats,practice?'Пробный механизм':'Раунд',practice?'Без таймера':g.round+' / 3','gear-round');
  if(!practice)stat(stats,a.kind==='memory'?'Начнём через':'Осталось','3:00','gear-time');
  if(!practice)stat(stats,'Совпало','0 из 6','gear-progress');parent.append(stats);
  if(!hostMode){const strip=el('div','gear-overview');strip.setAttribute('aria-label','Общий механизм');for(let i=0;i<6;i++){const n=el('span','overview-wheel');n.dataset.wheel=i;strip.append(n);}parent.append(strip);}
  const ring=el('div','gear-ring');
  if(hostMode){
   const links=document.createElementNS('http://www.w3.org/2000/svg','svg');links.setAttribute('viewBox','0 0 100 100');links.setAttribute('preserveAspectRatio','none');links.setAttribute('class','gear-links');links.setAttribute('aria-hidden','true');
   for(let i=0;i<6;i++){const line=document.createElementNS('http://www.w3.org/2000/svg','line'),a=(-90+i*60)*Math.PI/180,b=(-90+(i+1)*60)*Math.PI/180;for(const [k,v]of Object.entries({x1:50+36*Math.cos(a),y1:50+35*Math.sin(a),x2:50+36*Math.cos(b),y2:50+35*Math.sin(b)}))line.setAttribute(k,String(v));links.append(line);}ring.append(links);
   const badge=el('div','gear-heart');badge.append(el('span','',practice?'ТРЕНИРОВКА':'МЕХАНИЗМ'),el('strong','',practice?'✦':'I'));ring.append(badge);
  }
  for(let i=0;i<6;i++){
   if(!hostMode&&g.owners[i].owner!==player)continue;
   const gear=el(hostMode?'div':'button','gear-unit');gear.dataset.gear=i;
   if(!hostMode){gear.type='button';gear.onclick=()=>action(current.act.kind==='practice'?'practice-turn':'turn',{gear:i});}
   const a=(-90+i*60)*Math.PI/180;gear.style.setProperty('--gx',(50+36*Math.cos(a))+'%');gear.style.setProperty('--gy',(50+35*Math.sin(a))+'%');
   const dial=el('div','gear-dial');dial.append(el('div','gear-teeth'));
   for(let j=0;j<6;j++){const mark=el('span','gear-mark',j+1),angle=j*Math.PI/3;mark.style.left=(50+36*Math.sin(angle))+'%';mark.style.top=(50-36*Math.cos(angle))+'%';dial.append(mark);}
   if(!practice)dial.append(el('i','gear-target'));
   dial.append(el('i','gear-needle'),el('i','gear-pin'));
   gear.append(el('span','gear-id','№ '+(i+1)),dial,el('span','gear-owner'),el('span','gear-position'));
   if(!hostMode)gear.append(el('span','gear-touch','Нажми: +1'),el('small','gear-neighbors','Соседи № '+((i+5)%6+1)+' и № '+((i+1)%6+1)+' повернутся −1'));
   ring.append(gear);
  }
  parent.append(ring,el('p','gear-last-turn'),el('p','gear-hint'),el('p','gear-retry'));
  if(practice)makeReady(parent,'Понятно, начинаем');
  else if(!hostMode){const controls=el('div','gear-actions');button(controls,'Подсказка · 2 мон.','propose',{kind:'gear-hint'},'act-button quiet gear-buy');parent.append(controls);}
 }
 function build(parent){const a=current.act;root=el('section','act-screen '+(hostMode?'act-tv':'act-phone'));root.dataset.kind=a.kind;root.style.backgroundImage=current.scene?.backgroundUrl?'url('+current.scene.backgroundUrl+')':'none';if(!hostMode)root.style.backgroundImage='linear-gradient(#0b1323e8,#0b1323f5),url(/art/act1/tower.webp)';root.setAttribute('aria-label','Акт I. Часовая башня');
 if(hostMode&&!['title','end'].includes(a.kind)){const top=el('div','act-kicker','АКТ I · ЧАСОВАЯ БАШНЯ');root.append(top);}
 const main=el('div','act-main');root.append(main);makeCopy();makeVote();const reading=el('aside','note-reading');reading.hidden=true;reading.setAttribute('aria-live','polite');root.append(reading);parent.replaceChildren(root);
 if(['title','end'].includes(a.kind)){main.append(el('p','act-title',a.title),el('h1','act-subtitle',a.subtitle));if(a.kind==='end')main.append(el('p','act-complete','Первый акт завершён'));}
 else if(a.kind==='shop')makeShop(main);
 else if(a.kind==='hunt')makeHunt(main);
 else if(a.kind==='portraits')makePortraits(main);
 else if(['practice','memory','gears'].includes(a.kind))makeGears(main);
 else if(a.kind==='note'){main.append(el('div','peeves-note'));makeShop(main);}
 else if(a.kind==='ready'){if(a.id==='act-result')main.append(el('div','act-seal','I / V'));if(a.id==='act-result')main.append(el('p','act-summary'));makeReady(main,a.id==='act-result'?'Завершить акт':'Готов');}
 else if(a.kind==='chest'){main.append(image('/art/act1/props/chest.webp','Открытый сундук с ключом','chest-art'));}
 else if(a.kind==='bell'){main.append(image('/art/castle/clock.webp','Часы','act-clock'));}
 }
 function update(){updateInventory();if(!root||!current||!root.isConnected)return;const a=current.act;
 root.querySelector('.act-heading').textContent=['title','end'].includes(a.kind)?'':a.title||'';
 root.querySelector('.act-instruction').textContent=a.instruction||'';
 const event=root.querySelector('.act-event');event.textContent=current.event?.text?(current.event.speaker?current.event.speaker+': ':'')+current.event.text:'';
 for(const b of root.querySelectorAll('button'))b.disabled=Boolean(current.paused||pending);
 const ready=root.querySelector('.act-ready');if(ready)ready.textContent='Готовы '+a.ready.length+' из '+a.total;
 const cont=root.querySelector('.act-continue');if(cont){cont.disabled ||=a.ready.includes(player)||Boolean(a.vote);cont.textContent=a.ready.includes(player)?'Ждём остальных':a.id==='act-result'?'Завершить акт':a.kind==='shop'?'Продолжить путь':a.kind==='practice'?'Понятно, начинаем':'Готов';}
 const vote=root.querySelector('.act-vote');vote.hidden=!a.vote;if(a.vote){vote.querySelector('.vote-title').textContent=a.vote.label+' · '+a.vote.cost+' мон.';vote.querySelector('.vote-progress').textContent='За: '+a.vote.yes.length+' из '+a.vote.needed+' · '+seconds(localRemaining(a.vote.remainingMs))+' сек.';for(const b of vote.querySelectorAll('button'))b.disabled ||=a.vote.yes.includes(player)||a.vote.no.includes(player);}
 for(const tile of root.querySelectorAll('.act-item')){const bought=a.inventory[tile.dataset.item];tile.classList.toggle('bought',Boolean(bought));const b=tile.querySelector('button');if(b){b.textContent=bought?'У команды':'Предложить покупку';b.disabled ||=Boolean(bought||a.vote);}}
 const note=root.querySelector('.peeves-note');if(note){note.textContent=a.note||(a.inventory.note?'Свиток у команды. Разверните его в инвентаре.':'Пивз оставил свиток. Его можно выкупить или продолжить путь.');root.querySelector('.act-items').hidden=Boolean(a.inventory.note);}
 const reading=root.querySelector('.note-reading');reading.hidden=!(a.kind==='portraits'&&a.note&&localRemaining(a.noteReadingMs||0)>0);reading.textContent=a.note||'';
 const summary=root.querySelector('.act-summary');if(summary)summary.textContent='Заработано: '+a.earned+' · Потрачено: '+a.spent+' · В банке: '+current.bank.balance;
 if(a.hunt){root.querySelector('.hunt-time strong').textContent=clock(localRemaining(a.hunt.remainingMs));root.querySelector('.hunt-hits strong').textContent=a.hunt.hits+' / 8';root.querySelector('.hunt-misses strong').textContent=a.hunt.misses;root.classList.toggle('urgent',a.hunt.remainingMs<10000);for(const cell of root.querySelectorAll('.hunt-niche')){const on=Number(cell.dataset.cell)===a.hunt.cell&&localRemaining(a.hunt.visibleMs)>0;cell.classList.toggle('visible',on);cell.setAttribute('aria-label','Ниша '+(Number(cell.dataset.cell)+1)+(on?' — Пивз здесь':''));}}
 if(a.paintings){for(const tile of root.querySelectorAll('.puzzle-portrait')){const p=a.paintings[Number(tile.dataset.painting)];tile.classList.toggle('solved',p.solved);tile.classList.toggle('selected',p.index===selected);tile.querySelector('.painting-letter').textContent=p.letter;}
  [...root.querySelector('.portrait-word').children].forEach((n,i)=>n.textContent=a.paintings[i].letter||'·');
  if(!hostMode){const p=a.paintings[selected],editor=root.querySelector('.portrait-editor');editor.querySelector('.selected-title').textContent='Картина '+(selected+1)+(p.solved?' · решена':'');editor.querySelector('.ar-link').href=p.url;
   const input=editor.querySelector('input');if(input.dataset.painting!==String(selected)){input.dataset.painting=String(selected);editor.querySelector('.answer-feedback').textContent='';input.value=drafts.get(current.run+':'+selected)||'';}
   input.disabled=p.solved||current.paused;editor.querySelector('.portrait-form button').disabled ||=p.solved;editor.querySelector('.portrait-hint').textContent=p.reveal?'Ответ: '+p.reveal:p.hint?'Первая буква ответа: '+p.hint:'';
   editor.querySelector('.hint-buy').disabled ||=Boolean(p.solved||p.hint||p.reveal||a.vote);editor.querySelector('.portrait-talk').hidden=selected!==0;editor.querySelector('.portrait-talk').disabled ||=a.talked;
   const f=a.feedback,key=f&&f.at+':'+f.by+':'+f.painting;if(key&&key!==lastFeedback&&f.painting===selected){lastFeedback=key;editor.querySelector('.answer-feedback').textContent=f.correct?'Верно. Буква открыта.':'Пока не подходит. Попробуй ещё раз.';if(!f.correct&&f.by===player){input.value='';drafts.delete(current.run+':'+selected);editor.animate?.([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:200});}}
  }
 }
 if(a.gears){
  const g=a.gears,practice=a.kind==='practice';
  root.querySelector('.gear-round strong').textContent=practice?'Без таймера':g.round+' / 3';
  const timer=root.querySelector('.gear-time strong');if(timer)timer.textContent=clock(localRemaining(g.remainingMs));
  const progress=root.querySelector('.gear-progress strong');if(progress)progress.textContent=(a.kind==='memory'?6:g.matched)+' из 6';
  const heart=root.querySelector('.gear-heart strong');if(heart)heart.textContent=practice?'✦':['I','II','III'][g.round-1];
  for(const n of root.querySelectorAll('.overview-wheel')){const i=Number(n.dataset.wheel);n.textContent='№'+(i+1)+' · '+(g.positions[i]+1);n.classList.toggle('matched',!practice&&g.positions[i]===g.target[i]);n.classList.toggle('owned',g.owners[i].owner===player);}
  for(const unit of root.querySelectorAll('.gear-unit')){
   const i=Number(unit.dataset.gear),owner=g.owners[i].owner,pos=g.positions[i],target=g.target[i];
   unit.querySelector('.gear-owner').textContent=name(owner)+(i===g.jam?' · заклинена':'');
   let angle=Number(unit.dataset.angle||0);if(unit.dataset.position===undefined)angle=pos*60;else{let delta=pos-Number(unit.dataset.position);if(delta>3)delta-=6;if(delta< -3)delta+=6;angle+=delta*60;}unit.dataset.angle=angle;unit.dataset.position=pos;
   unit.querySelector('.gear-needle').style.transform='rotate('+angle+'deg)';
   const mark=unit.querySelector('.gear-target');if(mark)mark.style.transform='rotate('+(target*60)+'deg)';
   unit.querySelector('.gear-position').textContent=practice?'Положение '+(pos+1):'Сейчас '+(pos+1)+' · цель '+(target+1);
   unit.classList.toggle('owned',owner===player);unit.classList.toggle('matched',!practice&&pos===target);unit.classList.toggle('jammed',i===g.jam);unit.classList.toggle('hinted',g.hint===i);
   const last=g.lastTurn,changed=last&&[last.gear,(last.gear+1)%6,(last.gear+5)%6].includes(i)&&i!==g.jam;
   unit.classList.toggle('changed',Boolean(changed&&(last.ageMs||0)+(performance.now()-receivedAt)<1800));
   unit.setAttribute('aria-label','Шестерёнка '+(i+1)+', '+name(owner)+', положение '+(pos+1)+(practice?'':', цель '+(target+1)));
   if(!hostMode){unit.disabled ||=owner!==player||i===g.jam||a.kind==='memory';unit.querySelector('.gear-touch').textContent=i===g.jam?'Заклинена':a.kind==='memory'?'Скоро начнём':'Нажми: +1';}
  }
  root.querySelector('.gear-last-turn').textContent=g.lastTurn?name(g.lastTurn.by)+' нажал № '+(g.lastTurn.gear+1)+': своя +1, две соседние −1.':'';
  root.querySelector('.gear-hint').textContent=g.hint!==null?'Следующий ход: № '+(g.hint+1)+' · '+name(g.owners[g.hint].owner):practice?'Следи за тремя стрелками после одного нажатия.':a.kind==='memory'?'Золотые отметки останутся на месте во время игры.':'Светлая стрелка — текущее положение. Золотая метка — цель.';
  root.querySelector('.gear-retry').textContent=g.failures?'Повтор раунда: '+g.failures+(g.failures>=2?' · подсказка теперь 1 монета':''):'';
  const buy=root.querySelector('.gear-buy');if(buy){buy.textContent='Подсказка · '+g.hintCost+' мон.';buy.disabled ||=Boolean(a.kind==='memory'||a.vote||g.hint!==null);}
  root.classList.toggle('urgent',a.kind==='gears'&&g.remainingMs<30000);
 }

 }
 return{render(state,parent,display,submit,id){current=state;send=submit;player=id;hostMode=display;receivedAt=performance.now();const a=state.act;
  updateInventory();
  if(['line','black','travel'].includes(a.kind)){
   signature=null;root=null;
   if(display)window.PrologueScene.render(state.scene,parent);
   else {let waiting=parent.querySelector('.act-waiting');if(!waiting){waiting=el('section','panel act-waiting');waiting.append(el('h1','','Часовая башня'),el('p','','Смотри на общий экран.'));parent.replaceChildren(waiting);}}
   return;
  }
  const key=a.key+':'+display;if(signature!==key||!root?.isConnected){signature=key;window.PrologueScene?.release?.();build(parent);}update();
 },hide(){current=null;root=null;signature=null;pouchSelected=null;pouchKey=null;if(pouch)pouch.hidden=true;document.body.classList.toggle('has-inventory',false);},tick(){if(current?.phase==='act1')update();}};
})();
setInterval(()=>window.ActOne.tick(),100);
