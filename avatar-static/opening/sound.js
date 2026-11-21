/* Audio lives only on the shared screen. The room clock drives every cue. */
window.GameSound=(()=>{
 const music=new Audio();music.loop=true;music.preload='none';
 const gate=document.querySelector('#sound-gate');
 let unlocked=false,ctx,master,current=null,desired=null,paused=false,level=.45,latest;
 let fade,transition,musicJob=0,sceneKey,voiceSource,pendingVoice,playedVoice,pendingCue,playedCue;
 const effects=new Set(),raw=new Map(),decoded=new Map();
 function load(url){if(!raw.has(url))raw.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).catch(e=>{raw.delete(url);throw e;}));return raw.get(url);}
 function buffer(url){if(!decoded.has(url))decoded.set(url,load(url).then(b=>ctx.decodeAudioData(b.slice(0))).catch(e=>{decoded.delete(url);throw e;}));return decoded.get(url);}
 function targetVolume(){return level*(voiceSource ? .25 : .95);}
 function volume(to){clearInterval(fade);const from=music.volume,start=performance.now();fade=setInterval(()=>{const t=Math.min(1,(performance.now()-start)/450);music.volume=Math.max(0,Math.min(1,from+(to-from)*t));if(t===1)clearInterval(fade);},25);}
 function play(){if(!unlocked||paused||!current||!level)return;music.play().then(()=>volume(targetVolume())).catch(()=>{gate.hidden=false;});}
 function stopVoice(){if(voiceSource){const old=voiceSource;voiceSource=null;try{old.stop();}catch{}}}
 function stopEffects(){for(const s of effects){try{s.stop();}catch{}}effects.clear();}
 async function voice(scene){
  if(!unlocked||paused||!level||!ctx||pendingVoice===sceneKey||playedVoice===sceneKey)return;
  const key=sceneKey;pendingVoice=key;
  try{
   const data=await buffer(scene.voice.url);
   if(key!==sceneKey||paused||!level)return;
   const offset=(latest.scene.elapsedMs||0)/1000;
   if(offset>=data.duration){playedVoice=key;return;}
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=data;gain.gain.value=1.4;source.connect(gain).connect(master);
   voiceSource=source;playedVoice=key;volume(targetVolume());
   source.onended=()=>{source.disconnect();gain.disconnect();if(voiceSource===source){voiceSource=null;volume(targetVolume());}};
   source.start(0,offset);
  }catch{}finally{if(pendingVoice===key)pendingVoice=null;}
 }
 async function effect(scene){
  if(!unlocked||paused||!level||!ctx||pendingCue===sceneKey||playedCue===sceneKey)return;
  const key=sceneKey;pendingCue=key;
  try{
   const data=await buffer('/audio/'+scene.cue+'.ogg');
   if(key!==sceneKey||paused||!level)return;
   const offset=(latest.scene.elapsedMs||0)/1000,end=Math.min(data.duration,scene.cueDuration||data.duration);
   if(offset>=end){playedCue=key;return;}
   const source=ctx.createBufferSource(),gain=ctx.createGain(),duration=end-offset,now=ctx.currentTime;
   source.buffer=data;gain.gain.setValueAtTime(.65,now);gain.gain.setValueAtTime(.65,now+Math.max(0,duration-.5));gain.gain.linearRampToValueAtTime(0,now+duration);
   source.connect(gain).connect(master);source.onended=()=>{effects.delete(source);source.disconnect();gain.disconnect();};effects.add(source);source.start(0,offset,duration);playedCue=key;
  }catch{}finally{if(pendingCue===key)pendingCue=null;}
 }
 function reconcile(){
  clearTimeout(transition);const job=++musicJob;if(!unlocked)return;
  master.gain.setTargetAtTime(level,ctx.currentTime,.08);
  if(paused)void ctx.suspend();else void ctx.resume();
  if(paused||!level||!desired){volume(0);music.pause();return;}
  if(current===desired){play();return;}
  volume(0);transition=setTimeout(()=>{if(job!==musicJob)return;music.pause();current=desired;music.src='/audio/'+current+'.ogg';music.volume=0;play();},350);
 }
 function cues(){if(latest?.scene?.voice)void voice(latest.scene);if(latest?.scene?.cue)void effect(latest.scene);}
 gate.querySelector('button').onclick=()=>{
  ctx ||=new(window.AudioContext||window.webkitAudioContext)();
  if(!master){master=ctx.createGain();master.connect(ctx.destination);}master.gain.value=level;void ctx.resume();
  music.src='/audio/'+(desired||'intro')+'.ogg';music.volume=0;
  music.play().then(()=>{unlocked=true;current=desired||'intro';gate.hidden=true;if(!desired||paused||!level)music.pause();else volume(targetVolume());if(paused)void ctx.suspend();cues();}).catch(()=>{gate.querySelector('p').textContent='Не удалось включить звук. Нажми ещё раз.';});
 };
 return {
  init(display){gate.hidden=!display;if(display)for(let i=1;i<=13;i++)void load('/audio/voice/'+String(i).padStart(2,'0')+'.ogg').catch(()=>{});},
  sync(state){
   latest=state;const track=state.phase==='story'?state.scene?.music:({crossing:'intro',credits:'intro',lineup:'intro',title:'intro'})[state.phase]||null;
   const nextLevel=state.audio?.enabled===false?0:(state.audio?.volume??.45);
   const changed=track!==desired||Boolean(state.paused)!==paused||level!==nextLevel;
   desired=track;paused=Boolean(state.paused);level=nextLevel;
   const key=state.scene?.key||state.run+':'+state.phase;
   if(sceneKey!==key){
    const carry=state.scene?.id==='steam-transition'&&sceneKey===state.run+':'+(Number(state.scene.key.split(':').pop())-1);
    sceneKey=key;stopVoice();if(!carry)stopEffects();if(state.phase==='lobby')music.currentTime=0;
    if(unlocked&&!paused)volume(targetVolume());
   }
   if(changed)reconcile();cues();
  }
 };
})();
