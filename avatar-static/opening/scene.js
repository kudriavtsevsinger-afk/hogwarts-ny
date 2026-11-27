/* Presentation primitives shared by the prologue and every act.
   Keep scene-specific artwork in renderers; never fork these layouts by act. */
window.GameUI=(()=>{
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const image=(src,alt,cls)=>{const n=el('img',cls);n.src=src;n.alt=alt||'';n.draggable=false;return n;};
 const button=(label,click,quiet=false)=>{const n=el('button','act-button'+(quiet?' quiet':''),label);n.type='button';n.onclick=click;return n;};
 let inventorySignature,inventoryConfig,selected=null,ghost;
 function copy(dialogue=false){return el('div',dialogue?'story-copy':'act-copy');}
 function activity({host,kind,id,key,background,label,kicker}){
  const root=el('section','act-screen '+(host?'act-tv':'act-phone'));Object.assign(root.dataset,{kind,scene:id,key});
  root.style.backgroundImage=host?'url('+background+')':'linear-gradient(#0b1323e8,#0b1323f5),url('+background+')';
  root.setAttribute('aria-label',label);
  if(host&&kicker&&!['title','end'].includes(kind))root.append(el('div','act-kicker',kicker));
  const main=el('div','act-main'),caption=copy();root.append(main,caption);return{root,main,copy:caption};
 }
 function shopItem(item){const tile=el('section','act-item');tile.dataset.item=item.id;tile.append(image(item.image,item.name,'item-art'),el('h2','',item.name),el('p','',item.description),el('strong','item-price',item.cost+' мон.'));return tile;}
 function waiting(title){const n=el('section','panel act-waiting');n.append(el('h1','',title),el('p','','Смотри на общий экран.'));return n;}
 function inventory(config){
  inventoryConfig=config;const {owner,host,items,key,disabled,hidden}=config;
  let pouch=document.querySelector('#team-inventory');
  if(!pouch){pouch=el('aside','team-inventory');pouch.id='team-inventory';pouch.setAttribute('aria-label','Артефакты команды');document.body.append(pouch);inventorySignature=null;}
  if(pouch.dataset.owner!==owner||pouch.dataset.key!==key)selected=null;
  Object.assign(pouch.dataset,{owner,key});pouch.hidden=Boolean(!items.length||hidden);
  pouch.className='team-inventory '+(host?'display-inventory':'phone-inventory');
  document.body.classList.toggle('has-inventory',!pouch.hidden);
  if(!items.some(i=>i.id===selected))selected=null;
  const sig=JSON.stringify([owner,host,items,key,disabled,selected,hidden]);if(sig===inventorySignature)return;inventorySignature=sig;
  pouch.replaceChildren(el('span','inventory-label','Артефакты команды'));const row=el('div','inventory-row');pouch.append(row);
  for(const item of items){const slot=el(host?'div':'button','inventory-slot'+(item.usable?' available':''));slot.append(image(item.image,'','inventory-image'),el('span','inventory-name',item.name),el('small','inventory-status',item.usable?'Можно использовать':'Пригодится позже'));
   if(!host){slot.type='button';slot.setAttribute('aria-label',item.name+' · '+(item.usable?'можно использовать':'пригодится позже'));slot.onclick=()=>{selected=selected===item.id?null:item.id;inventory(inventoryConfig);};}row.append(slot);
  }
  const item=items.find(i=>i.id===selected);if(item&&!host){const detail=el('section','inventory-detail');detail.append(el('h2','',item.name),el('p','',item.help||item.description));if(item.context)detail.append(el('p','',item.context));
   if(item.usable){const use=button('Использовать',()=>inventoryConfig.onUse(item.id));use.disabled=!!disabled;detail.append(use);}
   detail.append(button('Закрыть',()=>{selected=null;inventory(inventoryConfig);},true));pouch.append(detail);
  }
 }
 function hideInventory(owner){const pouch=document.querySelector('#team-inventory');if(pouch&&(!owner||pouch.dataset.owner===owner)){pouch.hidden=true;document.body.classList.toggle('has-inventory',false);}}
 function mount(parent,root){
  const old=parent.querySelector('.act-screen');
  if(old&&old.dataset.key===root.dataset.key){old.className=root.className;Object.assign(old.dataset,root.dataset);old.style.backgroundImage=root.style.backgroundImage;old.replaceChildren(...Array.from(root.children));return old;}
  ghost?.remove();ghost=null;parent.replaceChildren(root);
  // Cross-dissolve a changed activity over the old image; polling never restarts it.
  if(old&&old.animate&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   root.style.animation='none';old.classList.add('ui-outgoing');old.setAttribute('aria-hidden','true');old.inert=true;parent.append(old);ghost=old;
   const fade=old.animate([{opacity:1},{opacity:0}],{duration:650,easing:'ease-in-out'});fade.finished.then(()=>{old.remove();if(ghost===old)ghost=null;},()=>old.remove());
  }
  return root;
 }
 return{el,image,button,copy,activity,shopItem,waiting,inventory,hideInventory,mount};
})();

/* Full-screen illustrated scene. All dialogue sits over the lower edge. */
window.PrologueScene = (() => {
  const art = '/art/scene-01/';
  const art2 = '/art/scene-02/';
  const castle='/art/castle/';
  let active, stage, previous;
  const fades=new WeakSet(), frozen=new WeakSet(), ghosts=new Set();
  const reducedMotion=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  function dissolve(node,from,to,remove=false){
    if(!node)return;
    if(reducedMotion() || !node.animate){if(remove)node.remove();return;}
    const a=node.animate([{opacity:from},{opacity:to}],{duration:650,easing:'ease-in-out',fill:'both'});
    fades.add(a);
    a.finished.then(()=>{if(remove){node.remove();ghosts.delete(node);}a.cancel();},()=>{if(remove){node.remove();ghosts.delete(node);}});
  }
  function leave(node,parent){
    if(!node)return;
    node.setAttribute('aria-hidden','true');node.inert=true;node.style.pointerEvents='none';
    ghosts.add(node);parent.append(node);dissolve(node,1,0,true);
  }
  const el = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls;if(text)n.textContent=text;return n; };
  function img(src, alt, cls) { const n=el('img',cls);n.src=src;n.alt=alt||'';n.draggable=false;return n; }
  function portrait(id, name, expression='neutral') {
    if(['mcgonagall','hagrid','dumbledore'].includes(id)){
      const frames={mcgonagall:{neutral:0,smile:1,concerned:2},hagrid:{smile:0,embarrassed:1,neutral:2},dumbledore:{smile:0,amused:1,concerned:2}};
      const n=el('div','story-actor full-body-npc');n.dataset.npc=id;n.style.backgroundImage='url('+castle+id+'.webp)';n.style.backgroundPosition=((frames[id][expression]??0)*50)+'% 0';n.setAttribute('role','img');n.setAttribute('aria-label',name||id);return n;
    }
    if(id==='sprout')return img('/art/act2/sprout.webp',name,'story-actor sprout-actor');
    if(id==='portrait')return img('/art/act1/painting-2.webp',name,'story-actor');
    if(id==='filch')return img(castle+'filch.png','Филч с кошкой','story-actor filch-actor');
    if(id==='peeves')return img(castle+'peeves.webp',name,'story-actor peeves-actor');
    const npc=['caretaker','conductor'].includes(id);
    if(id==='vendor')return img(art2+'vendor.webp',name,'story-actor vendor-actor');
    return img(npc?art+id+'.webp':'/portraits/'+id+'-'+expression+'.webp',name,'story-actor');
  }
  function playerBody(p, pose='front') {
    const n=el('div','player-body');n.dataset.pose=pose;n.dataset.player=p.id;
    n.style.backgroundImage='url(/art/players/'+p.id+'.webp)';
    n.style.backgroundPosition=({front:'0',back:'50',toast:'100'}[pose]||'0')+'% 0';
    n.setAttribute('role','img');n.setAttribute('aria-label',p.name);return n;
  }
  function group(scene, boarding=false) {
    if(scene.castExpression==='smile' && !boarding){
      const row=el('div','happy-cast');row.style.setProperty('--count',scene.cast.length);
      for(const p of scene.cast){const fig=el('figure','happy-person');fig.append(img('/portraits/'+p.id+'-smile.webp',p.name));row.append(fig);}
      return row;
    }
    if(boarding || scene.chapter>=3){
      const pose=boarding||scene.visual==='castle-walk'?'back':scene.castPose||'front';
      const row=el('div',boarding?'boarding-cast':'full-cast');row.dataset.pose=pose;row.style.setProperty('--count',scene.cast.length);
      if(scene.background==='great-hall' && pose==='front')row.classList.add('floor-cast');
      scene.cast.forEach((p,i)=>{const fig=el('figure',boarding?'boarding-person':'full-person');fig.style.setProperty('--i',i);fig.style.setProperty('--travel',(57-i*10)+'vw');fig.append(playerBody(p,pose));row.append(fig);});return row;
    }
    const row=el('div',boarding?'boarding-cast':'lineup');row.style.setProperty('--count',scene.cast.length);
    scene.cast.forEach((p,i)=>{
      const fig=el('figure',boarding?'boarding-person':'lineup-person');
      fig.style.setProperty('--i',i);fig.style.setProperty('--travel',(57-i*10)+'vw');
      fig.append(img('/portraits/'+p.id+'-neutral.webp',p.name));
      if(!boarding)fig.append(el('figcaption','',p.name));row.append(fig);
    });return row;
  }
  function seated(scene) {
    const row=el('div','seated-cast');
    scene.cast.forEach((p,i)=>{const fig=el('figure','seated-person');fig.style.setProperty('--seat',Math.floor(i/2));fig.dataset.side=i%2?'right':'left';fig.style.zIndex=String(4-Math.floor(i/2));const result=scene.sweetResults?.find(s=>s.id===p.id);const expression=result?(result.outcome==='wool'?'concerned':result.outcome==='frog'?'surprised':'smile'):'neutral';
      fig.append(img('/portraits/'+p.id+'-'+expression+'.webp',p.name));
      if(result){fig.dataset.outcome=result.outcome;fig.style.setProperty('--reaction-delay',(result.index*1.5)+'s');const candy=el('span','sweet-art seated-sweet');candy.dataset.sweet=result.choice;fig.append(candy);}
      row.append(fig);});
    return row;
  }
  function sweet(scene) {
    const node=el('div','sweet-effect');node.dataset.outcome=scene.outcome;
    const item=el('span','sweet-art');item.dataset.sweet=scene.sweet;node.append(item);
    if(scene.outcome==='frog'){node.append(el('div','chocolate-box'));if(scene.neighbor&&scene.neighbor!==scene.actor){const p=portrait(scene.neighbor,scene.cast.find(p=>p.id===scene.neighbor)?.name,'surprised');p.classList.add('frog-neighbor');stage.append(p);}}
    if(scene.outcome==='pumpkin')stage.append(el('div','golden-aura'));
    stage.append(node);
  }
  function background(scene){
    const name=({wall:'wall',trolley:'wall',threshold:'wall',door:'carriage-door',boarding:'carriage-door',window:'carriage-window',steam:'carriage-window',end:'carriage-window'})[scene.visual] || scene.background || 'platform';
    return {name,url:scene.backgroundUrl || (scene.chapter>=3?castle:scene.chapter===2?art2:art)+name+'.webp'};
  }
  function updateCopy(scene){
    let copy=stage.querySelector('.story-copy');
    if(!scene.text && scene.visual!=='arrival' && !scene.interactive){copy?.remove();return;}
    if(!copy){copy=window.GameUI.copy(true);stage.append(copy);}
    copy.replaceChildren();
    if(scene.interaction==='wish'){
      copy.className='story-copy wish-instruction';
      copy.append(el('h1','speaker-name','Загадай желание'),el('p','choice-instruction','Напиши желание для своего персонажа на телефоне'));
    }else{
      copy.className='story-copy';
      if(scene.speaker)copy.append(el('h1','speaker-name',scene.speaker));
      if(scene.text)copy.append(el('p','spoken-line',scene.text));
    }
    if(scene.interactive)copy.append(el('p','choice-progress'));
  }
  const dialogue=s=>Boolean(s && ['dialogue','choice','castle-dialogue','vendor','sweets-choice'].includes(s.visual));
  function render(scene,parent) {
    if(active!==scene.key || !stage?.isConnected) {
      for(const ghost of ghosts)ghost.remove();ghosts.clear();
      const oldStage=stage?.isConnected?stage:null;
      const chapterChanged=!stage?.isConnected || (previous?.chapter||1)!==(scene.chapter||1);
      const continueDialogue=stage?.isConnected && dialogue(previous) && dialogue(scene) && !chapterChanged && background(previous).url===background(scene).url;
      active=scene.key;
      if(continueDialogue){
        // A new line changes only its content. Keep the camera, backdrop and same actor mounted.
        stage.querySelector('.chapter-transition')?.remove();
        stage.dataset.visual=scene.visual;
        if(scene.framing || previous.actor!==scene.actor)stage.dataset.framing=scene.framing||'medium';
        stage.classList.toggle('dark-hall',Boolean(scene.darkHall));
        let actor=stage.querySelector('.story-actor');
        if(previous.actor!==scene.actor){
          actor?.remove();const fresh=scene.actor?portrait(scene.actor,scene.speaker,scene.expression):null;
          if(fresh){stage.append(fresh);dissolve(fresh,0,1);}leave(actor,stage);
        }else if(actor){
          const fresh=portrait(scene.actor,scene.speaker,scene.expression);
          const changed=actor.dataset.npc?actor.style.backgroundPosition!==fresh.style.backgroundPosition:actor.src!==fresh.src;
          const old=changed?actor.cloneNode(true):null;
          if(actor.dataset.npc)actor.style.backgroundPosition=fresh.style.backgroundPosition;else if(changed)actor.src=fresh.src;
          if(changed){dissolve(actor,0,1);leave(old,stage);}
        }
        if(!scene.confetti)stage.querySelector('.confetti')?.remove();
        else if(!stage.querySelector('.confetti')){const dust=el('div','confetti');for(let i=0;i<28;i++){const bit=el('i');bit.style.setProperty('--i',i);bit.style.setProperty('--x',((i*37)%100)+'%');dust.append(bit);}stage.append(dust);}
        const oldCopy=stage.querySelector('.story-copy')?.cloneNode(true);
        updateCopy(scene);dissolve(stage.querySelector('.story-copy'),0,1);leave(oldCopy,stage);
      }else{
      stage=el('section','story-stage');stage.dataset.visual=scene.visual;
      stage.dataset.shot=scene.id||scene.visual;
      if(chapterChanged&&scene.chapter!==7)stage.append(el('div','chapter-transition'));
      stage.dataset.chapter=scene.chapter||1;stage.dataset.framing=scene.framing||'medium';if(scene.darkHall)stage.classList.add('dark-hall');
      stage.setAttribute('aria-label',scene.chapter===8?'Акт II · Зимняя теплица':scene.chapter===7?'Акт I · Часовая башня':'Пролог · Сцена '+(scene.chapter||1));
      const bg=background(scene).name;
      if(!['blackout','final-title'].includes(scene.visual))stage.append(img(background(scene).url,'','story-background'));
      if(scene.visual==='trolley') stage.append(img(art+'trolley.webp','Тележка с чемоданами','moving-trolley'));
      if(scene.visual==='threshold')stage.append(el('div','wall-shadow'));
      if(['platform','dialogue','choice','arrival','group','door','boarding','window','steam','end'].includes(scene.visual))stage.append(el('div','platform-steam'));
      if(scene.chapter===2 && bg==='compartment'){stage.append(el('div',scene.visual==='castle-question'?'castle-window':'passing-fields'));if(['compartment','compartment-dusk','sweets-reactions'].includes(scene.visual)){stage.append(seated(scene),el('div','compartment-table'));}}
      if(scene.actor)stage.append(portrait(scene.actor,scene.speaker,scene.expression));
      if(scene.castGroup)stage.append(group(scene));
      if(scene.sparkActor){const i=scene.cast.findIndex(p=>p.id===scene.sparkActor);const spark=el('div','wish-spark');spark.style.left=((i+.5)/scene.cast.length*100)+'%';stage.append(spark);}
      if(scene.confetti||scene.enchantedSnow){const dust=el('div',scene.confetti?'confetti':'enchanted-snow');for(let i=0;i<28;i++){const bit=el('i');bit.style.setProperty('--i',i);bit.style.setProperty('--x',((i*37)%100)+'%');dust.append(bit);}stage.append(dust);}
      if(scene.clock){const clock=el('div','midnight-clock');clock.setAttribute('role','img');clock.setAttribute('aria-label',scene.visual==='clock'?'23:58 — 23:59':'23:59');clock.append(img(castle+'clock.webp','','clock-art'));const dial=el('div','clock-dial');const roman=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];for(let i=1;i<=12;i++){const n=el('span','clock-number',roman[i-1]);const a=i*Math.PI/6;n.style.left=(50+43*Math.sin(a))+'%';n.style.top=(50-43*Math.cos(a))+'%';dial.append(n);}dial.append(el('span','clock-time',scene.visual==='clock'?'23:58':'23:59'));dial.append(el('i','hour-hand'),el('i','minute-hand'),el('i','clock-pin'));clock.append(dial);stage.append(clock);}
      if(['celebration-star','star-trembles','final-flash'].includes(scene.visual))stage.append(el('div','magic-star'));
      if(['stars-fading','final-flash'].includes(scene.visual))stage.append(el('div','magic-veil'));
      if(scene.visual==='final-title'){const logo=el('div','final-logo');logo.append(img('/art/game-logo.webp','Хогвартс. Тайна последней полуночи'));stage.append(logo);}
      if(scene.visual==='arrival')stage.append(img(art+'trolley.webp','Багаж','arrival-luggage'));
      if(scene.visual==='group')stage.append(group(scene));
      if(scene.visual==='boarding')stage.append(group(scene,true));
      if(scene.visual==='door')stage.append(el('div','door-light'));
      if(scene.visual==='sweet-reaction')sweet(scene);
      if(scene.visual==='vendor-exit')stage.append(el('div','compartment-door'));
      if(scene.visual==='steam')stage.append(el('div','steam-curtain'));
      updateCopy(scene);
      parent.replaceChildren(stage);
      if(oldStage && !chapterChanged && !['blackout','final-flash','final-title','steam','threshold'].includes(scene.visual) && !['blackout','final-flash','steam','threshold'].includes(previous?.visual)){
        // Cross-dissolve the previous picture over the next; never fade through black.
        oldStage.classList.add('outgoing-shot');
        leave(oldStage,stage);
        for(const a of oldStage.getAnimations({subtree:true})){if(!fades.has(a)){a.pause();frozen.add(a);}}
      }
      }
      previous=scene;
    }
    const progress=stage.querySelector('.choice-progress');
    if(progress && scene.interactive)progress.textContent='Готово '+(scene.answered||[]).length+' из '+scene.total+((scene.answered||[]).length?' · '+scene.answered.join(', '):'');
  }
  function sync(scene,paused) {
    if(!stage?.isConnected || active!==scene?.key)return;
    const time=stage.querySelector('.clock-time');if(time)time.textContent=scene.visual==='clock'&&scene.elapsedMs<4400?'23:58':'23:59';
    // Seek from authoritative scene time after reload and resume; no repeated remounts.
    for(const a of stage.getAnimations({subtree:true})) {
      if(frozen.has(a))continue;
      if(!fades.has(a) && Math.abs(Number(a.currentTime||0)-scene.elapsedMs)>600)a.currentTime=scene.elapsedMs;
      if(paused && a.playState!=='paused')a.pause();
      else if(!paused && a.playState==='paused')a.play();
    }
  }
  let preloaded=false;
  return {render,sync,release(){for(const ghost of ghosts)ghost.remove();ghosts.clear();if(stage){for(const a of stage.getAnimations({subtree:true}))a.cancel();stage.remove();}stage=null;active=null;previous=null;},preload(){
    if(preloaded)return;preloaded=true;
    for(const name of ['wall','platform','trolley','conductor','caretaker','carriage-door','carriage-window']){const im=new Image();im.src=art+name+'.webp';}
    {const im=new Image();im.src=castle+'filch.png';}
    for(const name of ['lake','vestibule','great-hall','mcgonagall','hagrid','dumbledore','peeves','clock','feast-table','feast-guests','feast-candles','feast-desserts','feast-goblets','feast-ornaments','feast-flames','feast-exterior']){const im=new Image();im.src=castle+name+'.webp';}
    for(const id of ['oleg','vanya','sima','amina','masha','liza']){const im=new Image();im.src='/art/players/'+id+'.webp';}
    for(const name of ['compartment','vendor','viaduct','sweets']){const im=new Image();im.src=art2+name+'.webp';}
  }};
})();

