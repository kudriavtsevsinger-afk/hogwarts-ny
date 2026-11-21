const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=name=>fs.readFileSync(new URL('../avatar-static/opening/'+name,'file://'+__filename),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.className='';this.dataset={};this.hidden=false;this.style={setProperty(){}};this.videoWidth=1280;this.videoHeight=720;}
 append(...children){for(const c of children){c.parent=this;this.children.push(c);}}
 replaceChildren(...children){this.children.forEach(c=>c.parent=null);this.children=[];this.append(...children);}
 get isConnected(){return Boolean(this.parent);}
 querySelector(q){return this.children.flatMap(c=>[c,...c.all()]).find(c=>q.startsWith('.')?c.className.split(' ').includes(q.slice(1)):c.tagName===q);}
 all(){return this.children.flatMap(c=>[c,...c.all()]);}
 setAttribute(k,v){this[k]=v;} play(){return Promise.resolve();}
 getContext(){return{drawImage(){}};} toBlob(fn){fn({type:'image/jpeg'});}
}
test('camera retains preview across polls, submits receipt only, releases camera and rejects late streams',async()=>{
 const root=new Element(),streams=[],receipts=[],revoked=[];let release;
 const makeStream=()=>{const track={stopped:false,stop(){this.stopped=true;}},stream={getTracks:()=>[track]};streams.push(track);return stream;};
 const media={getUserMedia:async()=>makeStream()};
 const context=vm.createContext({window:{addEventListener(){}},document:{createElement:t=>new Element(t)},navigator:{mediaDevices:media},URL:{createObjectURL:()=> 'blob:local-photo',revokeObjectURL:u=>revoked.push(u)},Image:class{}});
 vm.runInContext(source('tickets.js'),context);const camera=context.window.TicketCamera;
 const data={key:'run:12',captured:false,answered:0,total:2};camera.render(data,root,async r=>receipts.push(r),false);
 const panel=root.children[0],buttons=()=>panel.querySelector('.ticket-actions').children;
 await buttons()[0].onclick();assert(!streams[0].stopped);await buttons()[1].onclick();assert(streams[0].stopped,'capture stops video track');
 const preview=panel.querySelector('img');assert.equal(preview.src,'blob:local-photo');camera.render({...data,answered:1},root,async r=>receipts.push(r),false);
 assert.equal(root.children[0],panel);assert.equal(panel.querySelector('img'),preview,'poll retains photo');
 await buttons()[3].onclick();assert.deepEqual(JSON.parse(JSON.stringify(receipts)),[{key:'run:12',captured:true,width:1280,height:720}]);
 camera.render(data,root,()=>{},true);assert(buttons()[3].disabled);camera.close();assert(revoked.length>0);
 camera.render({...data,key:'new:12'},root,()=>{},false);media.getUserMedia=()=>new Promise(r=>{release=r;});
 const pending=root.children[0].querySelector('.ticket-actions').children[0].onclick();camera.close();release(makeStream());await pending;assert(streams.at(-1).stopped,'camera permission resolved after navigation must stop');
});
test('shared-screen voice and effects: no repeats, pause, ducking, cue carry and stale cancellation',async()=>{
 const started=[],stopped=[],gains=[],contexts=[],button={},gate={querySelector:()=>button};let music;
 class Audio{constructor(){music=this;this.volume=.45;}play(){return Promise.resolve();}pause(){}}
 class Context{
  constructor(){contexts.push(this);this.currentTime=0;this.destination={};}resume(){this.paused=false;return Promise.resolve();}suspend(){this.paused=true;return Promise.resolve();}decodeAudioData(){return Promise.resolve({duration:30});}
  createGain(){const gain={gain:{setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}},connect(){return this;},disconnect(){}};gains.push(gain);return gain;}
  createBufferSource(){return {connect(x){return x;},disconnect(){},start(...a){started.push(a);},stop(){stopped.push(true);this.onended?.();}};}
 }
 let time=0;const fades=[];
 const context=vm.createContext({Audio,window:{AudioContext:Context},document:{querySelector:()=>gate},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}),performance:{now:()=>time},setInterval:f=>{fades.push(f);return fades.length;},clearInterval(){},setTimeout:f=>{f();return 1;},clearTimeout(){}});
 vm.runInContext(source('sound.js'),context);const sound=context.window.GameSound;
 sound.sync({run:'r',phase:'lobby'});button.onclick();await flush();
 const state={run:'r',phase:'story',scene:{id:'speech',key:'r:2',music:'calm',voice:{url:'/audio/voice/04.ogg',durationMs:30000},elapsedMs:500}};
 sound.sync(state);await flush();assert.equal(started.length,1);assert.equal(started[0][1],.5);time+=500;fades.at(-1)();assert(music.volume<.2,'music ducks during speech');
 sound.sync(state);await flush();assert.equal(started.length,1);
 sound.sync({...state,paused:true});assert(contexts[0].paused);sound.sync(state);assert(!contexts[0].paused);
 sound.sync({...state,scene:{id:'departure',key:'r:3',music:'calm',cue:'train-departure',cueDuration:12,elapsedMs:400}});await flush();assert.equal(stopped.length,1);assert.equal(started[1][2],11.6);
 sound.sync({...state,scene:{id:'steam-transition',key:'r:4',music:'calm',elapsedMs:0}});assert.equal(stopped.length,1,'wheels carry through steam');
 sound.sync({...state,scene:{id:'compartment-reveal',key:'r:5',music:'calm',elapsedMs:0}});assert.equal(stopped.length,2);
 sound.sync({...state,scene:{...state.scene,key:'r:6',elapsedMs:0}});sound.sync({phase:'lobby',run:'reset'});await flush();assert.equal(started.length,2,'cancel late voice load on restart');
});
