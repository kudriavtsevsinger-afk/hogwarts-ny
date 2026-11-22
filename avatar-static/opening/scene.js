/* Full-screen illustrated scene. All dialogue sits over the lower edge. */
window.PrologueScene = (() => {
  const art = '/art/scene-01/';
  const art2 = '/art/scene-02/';
  const castle='/art/castle/';
  let active, stage;
  const el = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls;if(text)n.textContent=text;return n; };
  function img(src, alt, cls) { const n=el('img',cls);n.src=src;n.alt=alt||'';n.draggable=false;return n; }
  function portrait(id, name, expression='neutral') {
    if(['mcgonagall','hagrid','dumbledore'].includes(id)){
      const frames={mcgonagall:{neutral:0,smile:1,concerned:2},hagrid:{smile:0,embarrassed:1,neutral:2},dumbledore:{smile:0,amused:1,concerned:2}};
      const n=el('div','story-actor full-body-npc');n.dataset.npc=id;n.style.backgroundImage='url('+castle+id+'.webp)';n.style.backgroundPosition=((frames[id][expression]??0)*50)+'% 0';n.setAttribute('role','img');n.setAttribute('aria-label',name||id);return n;
    }
    if(id==='peeves')return img(castle+'peeves.webp',name,'story-actor peeves-actor');
    const npc=['caretaker','conductor'].includes(id);
    if(id==='vendor')return img(art2+'vendor.webp',name,'story-actor vendor-actor');
    return img(npc?art+id+'.webp':'/portraits/'+id+'-'+expression+'.webp',name,'story-actor');
  }
  function group(scene, boarding=false) {
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
  function render(scene,parent) {
    if(active!==scene.key || !stage?.isConnected) {
      active=scene.key;
      stage=el('section','story-stage');stage.dataset.visual=scene.visual;
      stage.dataset.chapter=scene.chapter||1;stage.dataset.framing=scene.framing||'medium';if(scene.darkHall)stage.classList.add('dark-hall');
      stage.setAttribute('aria-label','Пролог · Сцена '+(scene.chapter||1));
      const bg=({wall:'wall',trolley:'wall',threshold:'wall',door:'carriage-door',boarding:'carriage-door',window:'carriage-window',steam:'carriage-window',end:'carriage-window'})[scene.visual] || scene.background || 'platform';
      if(!['blackout','final-title'].includes(scene.visual))stage.append(img((scene.chapter>=3?castle:scene.chapter===2?art2:art)+bg+'.webp','','story-background'));
      if(scene.visual==='trolley') stage.append(img(art+'trolley.webp','Тележка с чемоданами','moving-trolley'));
      if(scene.visual==='threshold')stage.append(el('div','wall-shadow'));
      if(['platform','dialogue','choice','arrival','group','door','boarding','window','steam','end'].includes(scene.visual))stage.append(el('div','platform-steam'));
      if(scene.chapter===2 && bg==='compartment'){stage.append(el('div',scene.visual==='castle-question'?'castle-window':'passing-fields'));if(['compartment','compartment-dusk','sweets-reactions'].includes(scene.visual)){stage.append(seated(scene),el('div','compartment-table'));}}
      if(scene.actor)stage.append(portrait(scene.actor,scene.speaker,scene.expression));
      if(scene.castGroup)stage.append(group(scene));
      if(scene.sparkActor){const i=scene.cast.findIndex(p=>p.id===scene.sparkActor);const spark=el('div','wish-spark');spark.style.left=((i+.5)/scene.cast.length*100)+'%';stage.append(spark);}
      if(scene.confetti||scene.enchantedSnow){const dust=el('div',scene.confetti?'confetti':'enchanted-snow');for(let i=0;i<28;i++){const bit=el('i');bit.style.setProperty('--i',i);bit.style.setProperty('--x',((i*37)%100)+'%');dust.append(bit);}stage.append(dust);}
      if(scene.clock){const clock=el('div','midnight-clock');clock.setAttribute('aria-label',scene.visual==='clock'?'23:58 — 23:59':'23:59');for(let i=1;i<=12;i++){const n=el('span','clock-number',String(i));n.style.setProperty('--angle',(i*30)+'deg');clock.append(n);}clock.append(el('span','clock-time',scene.visual==='clock'?'23:58':'23:59'));clock.append(el('i','hour-hand'),el('i','minute-hand'),el('i','clock-pin'));stage.append(clock);}
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
      if(scene.text || scene.visual==='arrival') {
        const copy=el('div','story-copy');
        if(scene.speaker)copy.append(el('h1','speaker-name',scene.speaker));
        if(scene.text)copy.append(el('p','spoken-line',scene.text));
        if(scene.interactive)copy.append(el('p','choice-progress'));
        stage.append(copy);
      }
      parent.replaceChildren(stage);
    }
    const progress=stage.querySelector('.choice-progress');
    if(progress)progress.textContent='Готово '+scene.answered.length+' из '+scene.total+(scene.answered.length?' · '+scene.answered.join(', '):'');
  }
  function sync(scene,paused) {
    if(!stage?.isConnected || active!==scene?.key)return;
    const time=stage.querySelector('.clock-time');if(time)time.textContent=scene.visual==='clock'&&scene.elapsedMs<2200?'23:58':'23:59';
    // Seek from authoritative scene time after reload and resume; no repeated remounts.
    for(const a of stage.getAnimations({subtree:true})) {
      if(Math.abs(Number(a.currentTime||0)-scene.elapsedMs)>600)a.currentTime=scene.elapsedMs;
      if(paused && a.playState!=='paused')a.pause();
      else if(!paused && a.playState==='paused')a.play();
    }
  }
  let preloaded=false;
  return {render,sync,preload(){
    if(preloaded)return;preloaded=true;
    for(const name of ['wall','platform','trolley','conductor','caretaker','carriage-door','carriage-window']){const im=new Image();im.src=art+name+'.webp';}
    for(const name of ['lake','vestibule','great-hall','mcgonagall','hagrid','dumbledore','peeves']){const im=new Image();im.src=castle+name+'.webp';}
    for(const name of ['compartment','vendor','viaduct','sweets']){const im=new Image();im.src=art2+name+'.webp';}
  }};
})();
