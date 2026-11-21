/* Full-screen illustrated scene. All dialogue sits over the lower edge. */
window.PrologueScene = (() => {
  const art = '/art/scene-01/';
  const art2 = '/art/scene-02/';
  let active, stage;
  const el = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls;if(text)n.textContent=text;return n; };
  function img(src, alt, cls) { const n=el('img',cls);n.src=src;n.alt=alt||'';n.draggable=false;return n; }
  function portrait(id, name, expression='neutral') {
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
    scene.cast.forEach((p,i)=>{const fig=el('figure','seated-person');fig.style.setProperty('--seat',Math.floor(i/2));fig.dataset.side=i%2?'right':'left';fig.style.zIndex=String(4-Math.floor(i/2));fig.append(img('/portraits/'+p.id+'-neutral.webp',p.name));row.append(fig);});
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
      stage.dataset.chapter=scene.chapter||1;
      stage.setAttribute('aria-label',scene.chapter===2?'Вторая сцена · В поезде':'Первая сцена · Кингс-Кросс');
      const bg=({wall:'wall',trolley:'wall',threshold:'wall',door:'carriage-door',boarding:'carriage-door',window:'carriage-window',steam:'carriage-window',end:'carriage-window'})[scene.visual] || scene.background || 'platform';
      if(scene.visual!=='blackout')stage.append(img((scene.chapter===2?art2:art)+bg+'.webp','','story-background'));
      if(scene.visual==='trolley') stage.append(img(art+'trolley.webp','Тележка с чемоданами','moving-trolley'));
      if(scene.visual==='threshold')stage.append(el('div','wall-shadow'));
      if(['platform','dialogue','choice','arrival','group','door','boarding','window','steam','end'].includes(scene.visual))stage.append(el('div','platform-steam'));
      if(scene.chapter===2 && bg==='compartment'){stage.append(el('div',scene.visual==='castle-question'?'castle-window':'passing-fields'));if(['compartment','compartment-dusk'].includes(scene.visual)){stage.append(seated(scene),el('div','compartment-table'));}}
      if(scene.actor)stage.append(portrait(scene.actor,scene.speaker,scene.expression));
      if(scene.visual==='arrival')stage.append(img(art+'trolley.webp','Багаж','arrival-luggage'));
      if(scene.visual==='group')stage.append(group(scene));
      if(scene.visual==='boarding')stage.append(group(scene,true));
      if(scene.visual==='door')stage.append(el('div','door-light'));
      if(scene.visual==='sweet-reaction')sweet(scene);
      if(scene.visual==='vendor-exit')stage.append(el('div','compartment-door'));
      if(scene.visual==='steam')stage.append(el('div','steam-curtain'));
      if(scene.text || scene.speaker) {
        const copy=el('div','story-copy');
        if(scene.speaker)copy.append(el('h1','speaker-name',scene.speaker));
        if(scene.text)copy.append(el('p','spoken-line',scene.text));
        if(scene.interactive){copy.append(el('p','choice-instruction',scene.interaction==='tickets'?'Сфотографируйте билеты на своих телефонах':scene.interaction==='sweets'?'Выберите сладость на своём телефоне':'Выберите реплику на своём телефоне'));copy.append(el('p','choice-progress'));}
        stage.append(copy);
      }
      parent.replaceChildren(stage);
    }
    const progress=stage.querySelector('.choice-progress');
    if(progress)progress.textContent='Готово '+scene.answered.length+' из '+scene.total+(scene.answered.length?' · '+scene.answered.join(', '):'');
  }
  function sync(scene,paused) {
    if(!stage?.isConnected || active!==scene?.key)return;
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
    for(const name of ['compartment','vendor','viaduct','sweets']){const im=new Image();im.src=art2+name+'.webp';}
  }};
})();
