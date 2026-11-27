/* Audio lives only on the shared screen. The room clock drives every cue. */
window.GameSound=(()=>{
 const music=new Audio();music.loop=true;music.preload='none';
 music.addEventListener?.('ended',()=>{if(unlocked&&!paused&&desired&&level){music.currentTime=0;play();}});
 const gate=document.querySelector('#sound-gate');
 let unlocked=false,ctx,master,current=null,desired=null,paused=false,level=.45,musicBoost=1,latest;
 let fade,transition,musicJob=0,sceneKey,voiceSource,pendingVoice,playedVoice,pendingCue,playedCue;
 let playedEvent,pendingEvent,lastTone;
 let noteKey,doneKey,failedKey,ackPending=false,complete=async()=>{};
 const effects=new Set(),raw=new Map(),decoded=new Map();
 function load(url){if(!raw.has(url))raw.set(url,fetch(url,globalThis.AbortSignal?.timeout?{signal:AbortSignal.timeout(8000)}:{}).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).catch(e=>{raw.delete(url);throw e;}));return raw.get(url);}
 function buffer(url){if(!decoded.has(url))decoded.set(url,load(url).then(b=>ctx.decodeAudioData(b.slice(0))).catch(e=>{decoded.delete(url);throw e;}));return decoded.get(url);}
 function targetVolume(){return Math.min(1,level*(voiceSource ? .25 : .95*musicBoost));}
 function volume(to){clearInterval(fade);const from=music.volume,start=performance.now();fade=setInterval(()=>{const t=Math.min(1,(performance.now()-start)/450);music.volume=Math.max(0,Math.min(1,from+(to-from)*t));if(t===1)clearInterval(fade);},25);}
 function play(){if(!unlocked||paused||!current||!level)return;music.play().then(()=>{if(latest?.scene?.soundCut){music.pause();music.volume=0;return;}volume(targetVolume());}).catch(()=>{gate.hidden=false;});}
 function stopVoice(){if(voiceSource){const old=voiceSource;voiceSource=null;try{old.stop();}catch{}}}
 function stopEffects(){for(const s of effects){try{s.stop();}catch{}}effects.clear();}
 async function voice(scene){
  if(!unlocked||paused||!level||!ctx||pendingVoice===sceneKey||playedVoice===sceneKey)return;
  const key=sceneKey;pendingVoice=key;
  try{
   const data=await buffer(scene.voice.url);
   if(key!==sceneKey||paused||!level)return;
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=data;gain.gain.value=1.4;source.connect(gain).connect(master);
   voiceSource=source;playedVoice=key;volume(targetVolume());
   source.onended=()=>{source.disconnect();gain.disconnect();if(voiceSource===source){voiceSource=null;doneKey=key;volume(targetVolume());}};
   source.start(0);
  }catch{failedKey=key;}finally{if(pendingVoice===key)pendingVoice=null;}
 }
 async function effect(scene){
  if(!unlocked||paused||!level||!ctx||pendingCue===sceneKey||playedCue===sceneKey)return;
  const key=sceneKey;pendingCue=key;
  try{
   if(scene.cue==='midnight-three'){
    const elapsed=scene.id==='first-bell'?0:(scene.elapsedMs||0)/1000;
    for(let strike=0;strike<3;strike++){
     const delay=strike*5-elapsed;if(delay<-.25)continue;
     const start=ctx.currentTime+Math.max(0,delay);
     for(const [ratio,amp] of [[1,.3],[2.01,.13],[2.76,.07],[4.07,.035]]){
      const tone=ctx.createOscillator(),gain=ctx.createGain();tone.frequency.value=130.81*ratio;
      gain.gain.setValueAtTime(.001,start);gain.gain.exponentialRampToValueAtTime(amp,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+7);
      tone.connect(gain).connect(master);effects.add(tone);tone.onended=()=>{effects.delete(tone);tone.disconnect();gain.disconnect();};tone.start(start);tone.stop(start+7.1);
     }
    }
    playedCue=key;return;
   }
   const data=await buffer('/audio/'+scene.cue+'.ogg');
   if(key!==sceneKey||paused||!level)return;
   const offset=(latest.scene.elapsedMs||0)/1000,end=Math.min(data.duration,scene.cueDuration||data.duration);
   if(offset>=end){playedCue=key;return;}
   const source=ctx.createBufferSource(),gain=ctx.createGain(),duration=end-offset,now=ctx.currentTime;
   source.buffer=data;gain.gain.setValueAtTime(.65,now);gain.gain.setValueAtTime(.65,now+Math.max(0,duration-.5));gain.gain.linearRampToValueAtTime(0,now+duration);
   source.connect(gain).connect(master);source.onended=()=>{effects.delete(source);source.disconnect();gain.disconnect();};effects.add(source);source.start(0,offset,duration);playedCue=key;
  }catch{}finally{if(pendingCue===key)pendingCue=null;}
 }
 async function liveEvent(event){
  if(!event?.cue||!unlocked||paused||!level||!ctx||playedEvent===event.id||pendingEvent===event.id)return;
  pendingEvent=event.id;
  try{const data=await buffer('/audio/'+event.cue+'.ogg');if(latest?.soundEvent?.id!==event.id||paused||!level)return;
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=data;gain.gain.value=.6;source.connect(gain).connect(master);effects.add(source);source.onended=()=>{effects.delete(source);source.disconnect();gain.disconnect();};source.start(0,0,Math.min(data.duration,1.5));playedEvent=event.id;
  }catch{}finally{if(pendingEvent===event.id)pendingEvent=null;}
 }
 function reconcile(){
  clearTimeout(transition);const job=++musicJob;if(!unlocked)return;
  master.gain.setTargetAtTime(level,ctx.currentTime,.08);
  if(paused)void ctx.suspend();else void ctx.resume();
  if(paused||!level||!desired){volume(0);music.pause();return;}
  if(current===desired){play();return;}
  volume(0);transition=setTimeout(()=>{if(job!==musicJob)return;music.pause();current=desired;music.src='/audio/'+current+'.ogg';music.volume=0;play();},350);
 }
 function cues(){
  const scene=latest?.scene;if(!scene)return;
  if(scene.voice && doneKey!==sceneKey && failedKey!==sceneKey)void voice(scene);
  if(scene.cue)void effect(scene);
  if(scene.musicBreak&&unlocked&&ctx?.createOscillator&&!paused&&level&&scene.elapsedMs>=2000&&scene.elapsedMs<3700&&noteKey!==sceneKey){
   noteKey=sceneKey;const note=ctx.createOscillator(),gain=ctx.createGain();note.type='sine';note.frequency.setValueAtTime(523.25,ctx.currentTime);note.frequency.exponentialRampToValueAtTime(492,ctx.currentTime+1.3);gain.gain.setValueAtTime(.035,ctx.currentTime);gain.gain.linearRampToValueAtTime(0,ctx.currentTime+1.5);note.connect(gain).connect(master);effects.add(note);note.onended=()=>{effects.delete(note);note.disconnect();gain.disconnect();};note.start();note.stop(ctx.currentTime+1.5);
  }
  // The server holds voiced scenes until this screen has played the complete file.
  // Text-only fallback also advances, so unavailable audio cannot deadlock a room.
  if(scene.voice&&!paused&&!ackPending&&scene.elapsedMs>=scene.voice.durationMs+600&&(doneKey===sceneKey||!unlocked||!level||failedKey===sceneKey)){
   const key=sceneKey;ackPending=true;Promise.resolve(complete(key)).catch(()=>{}).finally(()=>{ackPending=false;});
  }
 }
 gate.querySelector('button').onclick=()=>{
  ctx ||=new(window.AudioContext||window.webkitAudioContext)();
  if(!master){master=ctx.createGain();master.connect(ctx.destination);}master.gain.value=level;void ctx.resume();
  music.src='/audio/'+(desired||'intro')+'.ogg';music.volume=0;
  music.play().then(()=>{unlocked=true;current=desired||'intro';gate.hidden=true;if(!desired||paused||!level)music.pause();else volume(targetVolume());if(paused)void ctx.suspend();cues();}).catch(()=>{gate.querySelector('p').textContent='Не удалось включить звук. Нажми ещё раз.';});
 };
 return {
  chime(index,key){
   if(!unlocked||paused||!level||!ctx?.createOscillator||lastTone===key)return;lastTone=key;
   const frequency=[261.63,329.63,392,440,523.25,659.25][index];if(!frequency)return;
   const tone=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;tone.type='sine';tone.frequency.setValueAtTime(frequency,t);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.24,t+.025);gain.gain.exponentialRampToValueAtTime(.001,t+.65);tone.connect(gain).connect(master);effects.add(tone);tone.onended=()=>{effects.delete(tone);tone.disconnect();gain.disconnect();};tone.start(t);tone.stop(t+.7);
  },
  onComplete(fn){complete=fn;},
  init(display){gate.hidden=!display;if(display)for(let i=1;i<=43;i++)void load('/audio/voice/'+String(i).padStart(2,'0')+'.ogg').catch(()=>{});},
  sync(state){
   latest=state;const track=['story','act1','act2'].includes(state.phase)?state.scene?.music:({crossing:'intro',credits:'intro',lineup:'intro',title:'intro'})[state.phase]||null;
   const nextLevel=state.audio?.enabled===false?0:(state.audio?.volume??.45);
   const nextPaused=Boolean(state.paused);
   const breakMusic=state.scene?.musicBreak&&state.scene.elapsedMs>=2000;
   const nextTrack=breakMusic?null:track;
   const nextBoost=state.phase==='story'&&state.scene?.musicBoost===1.6?1.6:1;
   const changed=nextTrack!==desired||nextPaused!==paused||level!==nextLevel||musicBoost!==nextBoost;
   desired=nextTrack;paused=nextPaused;level=nextLevel;musicBoost=nextBoost;music.playbackRate=state.scene?.musicUrgent?1.12:1;
   const key=state.scene?.key||state.run+':'+state.phase;
   const restartMusic=sceneKey!==key && Boolean(state.scene?.musicRestart);
   if(restartMusic){music.pause();music.currentTime=0;}
   if(sceneKey!==key){
    const carry=state.scene?.id==='steam-transition'&&sceneKey===state.run+':'+(Number(state.scene.key.split(':').pop())-1);
    sceneKey=key;stopVoice();if(!carry)stopEffects();if(state.phase==='lobby')music.currentTime=0;
    if(unlocked&&!paused)volume(targetVolume());
   }
   // The frozen clock cuts the entire soundscape immediately, including pending fades.
   if(state.scene?.soundCut){clearInterval(fade);clearTimeout(transition);musicJob++;music.pause();music.volume=0;stopVoice();if(state.scene.cue)void effect(state.scene);else stopEffects();return;}
   if(changed||restartMusic)reconcile();cues();void liveEvent(state.soundEvent);
  }
 };
})();

