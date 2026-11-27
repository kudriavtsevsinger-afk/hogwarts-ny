/* Shared Act I interface. The server owns all answers, purchases and timers. */
window.ActOne=(()=>{
 let current,root,signature,hostMode,send,player,receivedAt=0,pending=false,selected=0,lastFeedback,pouch,pouchKey,pouchSelected=null,lastStage=null;
 const drafts=new Map(),localHits=new Set();
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const image=(url,alt,cls)=>{const n=el('img',cls);n.src=url;n.alt=alt||'';return n;};
 const name=id=>current.act.cast.find(p=>p.id===id)?.name||id;
 const seconds=ms=>Math.max(0,Math.ceil(ms/1000));
 const clock=ms=>{const n=seconds(ms);return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
 function localRemaining(ms){return Math.max(0,ms-(current.paused?0:performance.now()-receivedAt));}
 async function action(type,payload={}){
  if(pending||current.paused)return;pending=true;updateInventory();
  const request={type,key:current.act.key,nonce:crypto.randomUUID(),...payload};
  try{await send(request);}catch(e){window.GameNotice?.show(e.message);}finally{pending=false;update();updateInventory();}
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
   if(item.id==='magnifier'&&item.usable)detail.append(el('p','', 'Твоя цель — картина '+(selected+1)+'.'));
   if(item.usable){const use=button(detail,'Использовать','use',()=>({item:item.id,...(item.id==='magnifier'?{painting:selected}:{})}));use.disabled=pending||current.paused||(item.id==='magnifier'&&current.act.paintings?.find(p=>p.index===selected)?.solved);}
   const close=el('button','act-button quiet','Закрыть');close.type='button';close.onclick=()=>{pouchSelected=null;updateInventory();};detail.append(close);pouch.append(detail);
  }
 }
 function makeHunt(parent){const stats=el('div','act-stats');stat(stats,'Осталось','1:00','hunt-time');stat(stats,'Поимки','0','hunt-hits');stat(stats,'Промахи','0','hunt-misses');parent.append(stats);const cells=el('div','hunt-niches');for(const slot of current.act.hunt.slots){const n=el(hostMode?'div':'button','hunt-niche');n.dataset.cell=slot.index;if(!hostMode){n.type='button';n.onclick=()=>{const h=current.act.hunt,c=h.config,t=current.act.elapsedMs+(current.paused?0:performance.now()-receivedAt)-c.lead,spawn=Math.floor(t/c.interval),token=slot.owner+':'+spawn;if(t>=0&&h.schedule[spawn]?.includes(slot.index)&&t%c.interval<c.visible&&!localHits.has(token)){localHits.add(token);n.classList.remove('visible');n.classList.add('caught');navigator.vibrate?.(25);}void action('tap',{cell:slot.index,spawn});};}n.setAttribute('aria-label','Ниша '+(slot.index+1));n.append(image('/art/act1/props/niche.webp','','niche-art'),el('span','niche-number',slot.index+1),image('/art/castle/peeves.webp','Пивз','niche-peeves'),el('span','niche-owner',hostMode?name(slot.owner):'Твоя ниша'));cells.append(n);}parent.append(cells);}
 function makePortraits(parent){
  const a=current.act;
  if(hostMode){const wall=el('div','portrait-wall');for(const p of a.paintings){const card=el('figure','puzzle-portrait');card.dataset.painting=p.index;card.append(image(p.image,'Картина '+(p.index+1)),el('span','painting-number','Картина '+(p.index+1)),el('span','painting-letter'));wall.append(card);}parent.append(wall);}
  const word=el('div','portrait-word');for(let i=0;i<6;i++)word.append(el('span'));parent.append(word);
  if(hostMode)return;
  const p=a.paintings[0];
  if(!p){parent.append(el('p','portrait-finished','Твои картины разгаданы. Помоги друзьям найти оставшиеся портреты.'));return;}
  const editor=el('section','portrait-editor');editor.append(el('span','quest-eyebrow','ТВОЙ ПОРТРЕТ'),el('h2','selected-title','Найди картину '+(p.index+1)),el('p','portrait-clue',p.clue));
  const link=el('a','act-button ar-link','Открыть картину '+(p.index+1));link.href=p.url;link.target='_blank';link.rel='noopener noreferrer';editor.append(link,el('p','portrait-help','Найди этот портрет в комнате, открой ссылку и наведи камеру на картину. Затем вернись сюда с ответом.'));
  const form=el('form','portrait-form'),input=el('input');input.maxLength=100;input.placeholder='Ответ на загадку';input.autocomplete='off';input.setAttribute('aria-label','Ответ на твою картину');input.value=drafts.get(current.run+':'+selected)||'';input.oninput=()=>drafts.set(current.run+':'+selected,input.value);form.append(input,el('button','act-button','Ответить'));form.onsubmit=e=>{e.preventDefault();void action('answer',{painting:selected,answer:input.value});};
  editor.append(form,el('p','answer-feedback'),el('p','portrait-hint'));const help=el('div','portrait-actions');button(help,'Нужна помощь · 1 мон.','propose',()=>({kind:'portrait-hint',target:selected}),'act-button quiet hint-buy');if(selected===0)button(help,'Поговорить с портретом','talk',{},'act-button quiet portrait-talk');editor.append(help);parent.append(editor);
 }
 function chimeIcon(index){
  const paths=['M39 8A22 22 0 1 0 39 56A25 25 0 0 1 39 8Z','M32 5L39 24L59 32L39 40L32 59L25 40L5 32L25 24Z','M34 5C39 23 52 25 52 40A20 20 0 0 1 12 40C12 31 18 22 24 17C22 31 27 33 30 30C35 25 27 18 34 5Z','M52 9C19 7 6 25 18 44C37 56 55 43 52 9ZM13 53L43 23','M32 6L52 22L45 48L32 59L19 48L12 22ZM12 22H52M19 48L32 6L45 48M19 48H45','M32 18A14 14 0 1 0 32 46A14 14 0 1 0 32 18ZM32 3V10M32 54V61M3 32H10M54 32H61M11 11L16 16M48 48L53 53M11 53L16 48M48 16L53 11'];
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 64 64');svg.setAttribute('class','chime-symbol');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[index]);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','2');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);return svg;
 }
 function makeChimes(parent){
  const stats=el('div','act-stats');stat(stats,'Ступень','1 / 6','chime-round');stat(stats,'Осталось','1:30','chime-time');parent.append(stats);
  const stage=el('div','chime-stage');stage.append(el('span','quest-eyebrow','ПРОБУДИТЕ КОЛОКОЛ'),el('h2','chime-status'),el('p','chime-help'));
  const pads=el('div','chime-pads');for(const p of current.act.chimes.pads){const b=el(hostMode?'div':'button','chime-pad');b.dataset.pad=p.index;b.style.setProperty('--chime',p.color);b.append(chimeIcon(p.index),el('span','chime-name',p.name));if(hostMode)b.append(el('small','chime-owner',name(p.owner)));else{b.type='button';b.setAttribute('aria-label',p.name);b.onclick=()=>action('chime',{pad:p.index,version:current.act.chimes.version});}pads.append(b);}stage.append(pads,el('div','chime-beats'));parent.append(stage);
  if(!hostMode){const actions=el('div','chime-actions');button(actions,'Посмотреть ещё раз','replay',()=>({version:current.act.chimes.version}),'act-button quiet chime-replay');button(actions,'Следующий знак · 1 мон.','propose',{kind:'chime-hint'},'act-button quiet chime-hint');parent.append(actions);}
 }
 function build(parent){const a=current.act;root=el('section','act-screen '+(hostMode?'act-tv':'act-phone'));root.dataset.kind=a.kind;root.dataset.scene=a.id;root.style.backgroundImage=current.scene?.backgroundUrl?'url('+current.scene.backgroundUrl+')':'none';if(!hostMode)root.style.backgroundImage='linear-gradient(#0b1323e8,#0b1323f5),url(/art/act1/tower.webp)';root.setAttribute('aria-label','Акт I. Часовая башня');
 if(hostMode&&!['title','end'].includes(a.kind)){const top=el('div','act-kicker','АКТ I · ЧАСОВАЯ БАШНЯ');root.append(top);}
 const main=el('div','act-main');root.append(main);makeCopy();makeVote();const reading=el('aside','note-reading');reading.hidden=true;reading.setAttribute('aria-live','polite');root.append(reading);parent.replaceChildren(root);
 if(['title','end'].includes(a.kind)){main.append(el('p','act-title',a.title),el('h1','act-subtitle',a.subtitle));if(a.kind==='end')main.append(el('p','act-complete','Первый акт завершён'));}
 else if(a.kind==='shop')makeShop(main);
 else if(a.kind==='hunt')makeHunt(main);
 else if(a.kind==='portraits')makePortraits(main);
 else if(a.kind==='chimes')makeChimes(main);
 else if(a.kind==='note'){main.append(el('div','peeves-note'));makeShop(main);}
 else if(a.kind==='ready'){if(a.id==='act-result')main.append(el('div','act-seal','I / V'));if(a.id==='act-result')main.append(el('p','act-summary'));makeReady(main,a.id==='act-result'?'Завершить акт':'Готов');}
 else if(a.kind==='chest'){main.append(el('p','act-instruction','Сундук открыт. Внутри: ключ от механизма башни.'));main.append(image('/art/act1/props/chest.webp','Открытый сундук с ключом','chest-art'));}
 else if(a.kind==='bell'&&hostMode){const clock=el('div','midnight-clock act-midnight');clock.setAttribute('aria-label','Часы остановились на 23:59');clock.append(image('/art/castle/clock.webp','','clock-art'));const dial=el('div','clock-dial');dial.append(el('span','clock-time','23:59'),el('i','hour-hand'),el('i','minute-hand'),el('i','clock-pin'));clock.append(dial);root.append(clock);}
 }
 function update(){updateInventory();if(!root||!current||!root.isConnected)return;const a=current.act;
 root.querySelector('.act-heading').textContent=['title','end'].includes(a.kind)?'':a.title||'';
 root.querySelector('.act-instruction').textContent=a.instruction||'';
 const event=root.querySelector('.act-event');event.textContent=current.event?.text&&localRemaining(current.event.remainingMs||0)>0?(current.event.speaker?current.event.speaker+': ':'')+current.event.text:'';
 for(const b of root.querySelectorAll('button'))b.disabled=Boolean(current.paused||pending);
 const ready=root.querySelector('.act-ready');if(ready)ready.textContent='Готовы '+a.ready.length+' из '+a.total;
 const cont=root.querySelector('.act-continue');if(cont){cont.disabled ||=a.ready.includes(player)||Boolean(a.vote);cont.textContent=a.ready.includes(player)?'Ждём остальных':a.id==='act-result'?'Завершить акт':a.kind==='shop'?'Продолжить путь':a.kind==='practice'?'Понятно, начинаем':'Готов';}
 const vote=root.querySelector('.act-vote');vote.hidden=!a.vote||localRemaining(a.vote?.remainingMs||0)<=0;vote.classList.toggle('vote-answered',Boolean(!hostMode&&a.vote&&(a.vote.yes.includes(player)||a.vote.no.includes(player))));if(a.vote){vote.querySelector('.vote-title').textContent=a.vote.label+' · '+a.vote.cost+' мон.';vote.querySelector('.vote-progress').textContent='За: '+a.vote.yes.length+' из '+a.vote.needed+' · '+seconds(localRemaining(a.vote.remainingMs))+' сек.';for(const b of vote.querySelectorAll('button'))b.disabled ||=a.vote.yes.includes(player)||a.vote.no.includes(player);}
 for(const tile of root.querySelectorAll('.act-item')){const bought=a.inventory[tile.dataset.item];tile.classList.toggle('bought',Boolean(bought));const b=tile.querySelector('button');if(b){b.textContent=bought?'У команды':'Предложить покупку';b.disabled ||=Boolean(bought||a.vote);}}
 const note=root.querySelector('.peeves-note');if(note){note.textContent=a.note||(a.inventory.note?'Свиток у команды. Разверните его в инвентаре.':'Пивз оставил свиток. Его можно выкупить или продолжить путь.');root.querySelector('.act-items').hidden=Boolean(a.inventory.note);}
 const reading=root.querySelector('.note-reading');reading.hidden=!(a.kind==='portraits'&&a.note&&localRemaining(a.noteReadingMs||0)>0);reading.textContent=a.note||'';
 const summary=root.querySelector('.act-summary');if(summary)summary.textContent='Заработано: '+a.earned+' · Потрачено: '+a.spent+' · В банке: '+current.bank.balance;
 if(a.hunt){
  const h=a.hunt,c=h.config,t=a.elapsedMs+(current.paused?0:performance.now()-receivedAt)-c.lead,spawn=Math.floor(t/c.interval);
  root.querySelector('.hunt-time strong').textContent=t<0?'Старт через '+Math.ceil(-t/1000):clock(localRemaining(h.remainingMs));root.querySelector('.hunt-hits strong').textContent=h.hits+' / '+h.goal;root.querySelector('.hunt-misses strong').textContent=h.misses;
  for(const cell of root.querySelectorAll('.hunt-niche')){const slot=h.slots.find(s=>s.index===Number(cell.dataset.cell)),token=slot.owner+':'+spawn,on=t>=0&&spawn<c.turns&&t%c.interval<c.visible&&h.schedule[spawn]?.includes(slot.index)&&!h.hitTokens.includes(token)&&!localHits.has(token);cell.classList.toggle('visible',Boolean(on));cell.classList.toggle('caught',t>=0&&t%c.interval<c.visible&&(h.hitTokens.includes(token)||localHits.has(token)));cell.setAttribute('aria-label','Арка '+(slot.index+1)+(on?' — Пивз здесь':''));}
 }
 if(a.paintings){
  for(const tile of root.querySelectorAll('.puzzle-portrait')){const p=a.paintings.find(p=>p.index===Number(tile.dataset.painting));tile.classList.toggle('solved',p.solved);tile.querySelector('.painting-letter').textContent=p.letter;}
  [...root.querySelector('.portrait-word').children].forEach((n,i)=>n.textContent=a.letters[i]||'·');
  if(!hostMode&&a.paintings.length){const p=a.paintings[0],editor=root.querySelector('.portrait-editor');editor.querySelector('.portrait-hint').textContent=p.reveal?'Ответ: '+p.reveal:p.hint?'Первая буква: '+p.hint:'';editor.querySelector('.hint-buy').disabled ||=Boolean(p.hint||p.reveal||a.vote);const talk=editor.querySelector('.portrait-talk');if(talk)talk.disabled ||=a.talked;
   const f=a.feedback;editor.querySelector('.answer-feedback').textContent=f&&f.painting===selected&&localRemaining(f.remainingMs)>0?(f.correct?'Верно!':'Пока не подходит. Попробуй ещё раз.'):'';
  }
 }
 if(a.chimes){
  const g=a.chimes,t=g.modeElapsed+(current.paused?0:performance.now()-receivedAt),beat=Math.floor((t-1200)/1000),flash=g.mode==='show'&&t>=1200&&(t-1200)%1000<720?g.sequence?.[beat]:null;
  if(hostMode&&!current.paused&&flash!=null)window.GameSound?.chime?.(flash,a.key+':'+g.version+':'+beat);
  root.querySelector('.chime-round strong').textContent=g.round+' / 6';root.querySelector('.chime-time strong').textContent=g.mode==='show'?'Слушаем':clock(localRemaining(g.remainingMs));
  const labels={show:'Смотрите и запоминайте',input:'Теперь ваша очередь',success:g.round===6?'Колокол пробуждён':'Верно. Звон становится длиннее',retry:'Попробуем ещё раз'};
  root.querySelector('.chime-status').textContent=labels[g.mode];root.querySelector('.chime-help').textContent=g.mode==='input'?'Повторите последовательность по порядку. На телефоне каждый нажимает свои.':g.mode==='retry'?'Та же последовательность прозвучит снова. Монеты остаются у команды.':g.mode==='show'?'Запомните порядок. Нажимать пока не нужно.':'Вы звучите вместе.';
  for(const b of root.querySelectorAll('.chime-pad')){const i=Number(b.dataset.pad);b.classList.toggle('lit',Boolean(flash===i||g.mode==='input'&&g.last?.correct&&g.last.pad===i&&g.last.ageMs+performance.now()-receivedAt<650));b.classList.toggle('hinted',g.mode==='input'&&g.hint===i);if(!hostMode)b.disabled ||=g.mode!=='input';}
  const beats=root.querySelector('.chime-beats');if(beats.children.length!==g.length){beats.replaceChildren();for(let i=0;i<g.length;i++)beats.append(el('span'));}for(let i=0;i<g.length;i++)beats.children[i].className=i<g.position?'done':i===g.position?'next':'';
  for(const b of root.querySelectorAll('.chime-actions button'))b.disabled ||=g.mode!=='input'||Boolean(a.vote);const hint=root.querySelector('.chime-hint');if(hint)hint.disabled ||=g.hint!==null;
 }


 }
 return{render(state,parent,display,submit,id){current=state;send=submit;player=id;hostMode=display;receivedAt=performance.now();const a=state.act;if(lastStage!==a.key){pouchSelected=null;localHits.clear();lastStage=a.key;}if(a.kind==='portraits')selected=a.assignment??0;
  updateInventory();
  if(['line','black','travel'].includes(a.kind)){
   signature=null;root=null;
   if(display)window.PrologueScene.render(state.scene,parent);
   else {let waiting=parent.querySelector('.act-waiting');if(!waiting){waiting=el('section','panel act-waiting');waiting.append(el('h1','','Часовая башня'),el('p','','Смотри на общий экран.'));parent.replaceChildren(waiting);}}
   return;
  }
  const key=a.key+':'+display+':'+(a.assignment??'');if(signature!==key||!root?.isConnected){signature=key;window.PrologueScene?.release?.();build(parent);}update();
 },hide(){current=null;root=null;signature=null;pouchSelected=null;pouchKey=null;if(pouch)pouch.hidden=true;document.body.classList.toggle('has-inventory',false);},tick(){if(current?.phase==='act1')update();}};
})();
setInterval(()=>window.ActOne.tick(),100);

window.ActTwo=(()=>{
 let signature='',draft='',busy=false;
 const el=(t,c,text)=>{const e=document.createElement(t);e.className=c||'';if(text!=null)e.textContent=text;return e;};
 return {render(state,parent,host,send){const a=state.act2;const stable={...a,remaining:0,locked:!!a.locked};const sig=JSON.stringify([stable,host,state.paused]);if(signature===sig&&parent.querySelector('.act-two')){parent.querySelectorAll('.a2-timer').forEach(e=>e.textContent=Math.ceil(a.remaining/1000)+' с');return;}signature=sig;window.PrologueScene?.release?.();const root=el('section','act-two '+(host?'a2-display':'a2-phone'));root.dataset.kind=a.kind;root.dataset.scene=a.id;
 const call=async(type,data={})=>{if(busy||state.paused)return;busy=true;try{await send({type,key:a.key,nonce:crypto.randomUUID(),...data});}catch(e){window.GameNotice?.show(e.message);}finally{busy=false;}};
 const btn=(to,label,type,data={})=>{const b=el('button','act-button',label);b.disabled=state.paused;b.onclick=()=>call(type,typeof data==='function'?data():data);to.append(b);return b;};
 const imageSprout=()=>{const img=el('img','a2-sprout');img.src='/art/act2/sprout.webp';img.alt='Профессор Спраут';return img;};
 const stage=el('div','a2-stage');const copy=el('div','a2-copy');copy.append(el('p','a2-eyebrow',a.speaker||'Зимняя теплица'),el('h1','',a.text));root.append(stage,copy);
 if(!host&&['line','vision','flower','end'].includes(a.kind)){copy.replaceChildren(el('h1','','Зимняя теплица'),el('p','','Смотри на общий экран.'));parent.replaceChildren(root);return;}
 if(host&&a.speaker==='Профессор Спраут')stage.append(imageSprout());
 if(host&&a.kind==='line'&&['Дамблдор','Продавщица'].includes(a.speaker)){const actor=el('div','a2-speaker');if(a.speaker==='Дамблдор'){actor.style.backgroundImage='url(/art/castle/dumbledore.webp)';actor.style.backgroundSize='300% 100%';}else{actor.style.backgroundImage='url(/art/scene-02/vendor.webp)';actor.style.backgroundSize='contain';}stage.append(actor);}
 if(a.remaining>0&&!['line','vision','flower'].includes(a.kind))copy.append(el('p','a2-timer',Math.ceil(a.remaining/1000)+' с'));
 if(a.message)copy.append(el('p','',a.message));
 if(['ready','shop'].includes(a.kind)){copy.append(el('p','',`Готовы: ${a.ready}/${a.total}`));if(!host)btn(copy,'Готов','ready');}
 if(a.kind==='shop')for(const item of a.items){const card=el('div','a2-item');card.append(el('strong','',item.name),el('span','',item.cost+' мон.'));if(!host)btn(card,'Купить','propose',{target:item.id});stage.append(card);}
 if(a.kind==='consent'){stage.append(el('div','a2-mirror','ЕИНАЛЕЖ'));copy.append(el('p','','Показать твоё желание из пролога анонимно? Без ответа оно останется в тайне.'));if(!host&&!a.answered){btn(copy,'Показать','consent',{yes:true});btn(copy,'Оставить в тайне','consent',{yes:false});}}
 if(a.kind==='mirror'){if(host)stage.append(el('div','a2-mirror',a.text));copy.querySelector('h1').textContent=`Желание ${a.round} из ${a.totalRounds}`;if(a.result)copy.append(el('p','a2-reveal',(a.result.correct?'Верно! ':'')+a.result.name));else if(!host){if(a.own)copy.append(el('p','','Это твоё. Молчи и наблюдай.'));else if(a.mode==='guess'&&!a.voted)for(const o of a.options)btn(copy,o.name,'guess',{answer:o.id});else copy.append(el('p','','Ждём остальных…'));}}
 if(a.kind==='choice'){copy.append(el('p','','Это личный выбор. Другие его не увидят.'));if(!host&&!a.answered)for(const [choice,label]of [['release','Отпустить'],['keep','Сохранить'],['share','Поделиться']])btn(copy,label,'choice',{choice});}
 if(a.kind==='vision'&&a.id==='vision'){const scarf=el('div','a2-scarf');scarf.append(el('span','','23:59'));stage.append(scarf);}
 if(a.kind==='herb'){copy.append(el('p','','Разложите карточки на столе и введите номера растений слева направо.'),el('p','',a.nudge));if(a.hints.length)copy.append(el('p','','Начало полки: '+a.hints.join(' → ')));if(!host){const input=el('input','a2-code');input.inputMode='numeric';input.maxLength=6;input.placeholder='Код шкафчика';input.value=draft;input.oninput=()=>{draft=input.value.replace(/\D/g,'').slice(0,6);input.value=draft;};input.disabled=!!a.locked;copy.append(input);btn(copy,a.locked?'Замок отдыхает 20 секунд':'Открыть','code',()=>({code:draft})).disabled=!!a.locked||state.paused;if(a.hints.length<3)btn(copy,'Нужна помощь · 1 мон.','propose',{target:'herbHint'});}}
 if(a.sheets){const sheets=el('div','a2-sheets');for(const s of a.sheets){const sheet=el('article','a2-sheet');sheet.append(el('h3','',`${s.id}. ${s.name}`),el('p','',s.text));sheets.append(sheet);}stage.append(sheets);}
 if(a.kind==='pot'){const p=a.pot,colors=['Синий','Зелёный','Красный','Жёлтый'];const pot=el('div','a2-cauldron');pot.style.setProperty('--brew',['#3581bb','#419971','#b4473d','#e4bc45'][p.color]);pot.append(el('div','a2-brew'),el('strong','',colors[p.color]));if(!host)stage.append(pot);copy.append(el('p','',`Раунд ${p.round}/5 · Пар: ${['нет','лёгкий','густой'][p.steam]} · Пузыри: ${['редкие','частые','кипит'][p.bubbles]}`),el('p','',`${p.frost?'❄ Иней ':''}${p.glow?'✧ Свечение ':''}Трещины: ${p.cracks}/3`),el('p','','Добавлено: '+p.added.map(i=>['Полынь','Бубонтюбер','Мандрагора','Асфодель','Жабросли','Валериана'][i]).join(' → ')));
 if(a.hint)copy.append(el('p','a2-reveal','Следующий ингредиент: '+a.hint));if(a.rescue)copy.append(el('p','a2-reveal','Спраут помогает: '+a.rescue.join(' → ')));if(a.revealSheets.length)copy.append(el('p','','Нужные листы: '+a.revealSheets.join(', ')));if(a.mode!=='input')copy.append(el('p','a2-reveal',a.mode==='success'?'Получилось!':'Котёл остыл. Попробуем снова.'));if(!host&&a.mode==='input'){for(const b of a.buttons)btn(copy,b.name,'ingredient',{ingredient:b.id,version:a.version});btn(copy,'Подсказка · 1 мон.','propose',{target:'potHint'});}}
 if(a.kind==='flower')stage.append(el('div','a2-flower','✧'));
 if(a.inventory.length){const bag=el('aside','a2-inventory');bag.append(el('strong','','С собой'));for(const i of a.inventory){bag.append(el('span','',i.name));if(!host&&a.kind==='pot'&&a.mode==='input')btn(bag,'Применить','use',{item:i.id});}root.append(bag);}
 if(!host&&a.ability){const b=el('aside','a2-ability');b.append(el('strong','',a.ability.name),el('p','',a.ability.desc));if(a.tie){for(const id of a.tie)btn(b,a.options.find(o=>o.id===id)?.name||id,'ability',{answer:id});}else if(a.ability.id==='maker_touch'){const confirm=el('details');confirm.append(el('summary','','Применить способность'));confirm.append(el('p','','Это сменит рецепт в текущем раунде. Уже добавленные ингредиенты сбросятся.'));btn(confirm,'Да, сменить рецепт','ability',{confirm:true});b.append(confirm);}else btn(b,'Применить','ability');root.append(b);}
 if(a.vote){const vote=el('aside','a2-vote');vote.append(el('strong','',`Общая покупка · ${a.vote.cost} мон.`),el('p','',`За: ${a.vote.yes}, против: ${a.vote.no}`));if(!host&&!a.vote.voted){btn(vote,'За','vote',{voteId:a.vote.id,yes:true});btn(vote,'Против','vote',{voteId:a.vote.id,yes:false});}root.append(vote);}parent.replaceChildren(root);
 }};
})();
