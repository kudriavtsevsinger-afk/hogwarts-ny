const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={setProperty:(k,v)=>this.style[k]=v};this.className='';this.classList={add:c=>this.className+=' '+c,toggle:(c,on)=>{const names=new Set(this.className.split(' ').filter(Boolean));if(on)names.add(c);else names.delete(c);this.className=[...names].join(' ');}};}
 append(...nodes){for(const n of nodes){n.remove();n.parent=this;this.children.push(n);}}
 replaceChildren(...nodes){this.children.forEach(c=>c.parent=null);this.children=[];this.append(...nodes);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}
 get isConnected(){return Boolean(this.parent);}
 setAttribute(k,v){this[k]=v;}
 cloneNode(deep){const n=new Element(this.tag);n.className=this.className;n.dataset={...this.dataset};Object.assign(n.style,this.style);n.src=this.src;n.textContent=this.textContent;if(deep)n.append(...this.children.map(c=>c.cloneNode(true)));return n;}
 all(){return this.children.flatMap(c=>[c,...c.all()]);}
 querySelectorAll(q){return this.all().filter(c=>q.startsWith('.')?c.className.split(' ').includes(q.slice(1)):c.tag===q);}
 querySelector(q){return this.querySelectorAll(q)[0]||null;}
 animate(frames,options){let finish;const a={frames,options,currentTime:0,playState:'running',finished:new Promise(r=>finish=r),finish:()=>finish(),pause(){this.playState='paused';},play(){this.playState='running';},cancel(){this.playState='idle';}};(this.animations??=[]).push(a);return a;}
 getAnimations(){return [this,...this.all()].flatMap(n=>n.animations||[]).filter(a=>a.playState!=='idle');}
}
function setup(motion=false){const context=vm.createContext({window:{matchMedia:()=>({matches:!motion})},document:{createElement:t=>new Element(t)},Image:class{}});vm.runInContext(fs.readFileSync(new URL('../avatar-static/opening/scene.js','file://'+__filename),'utf8'),context);return {renderer:context.window.PrologueScene,root:new Element('main')};}
const cast=['oleg','vanya','sima','amina','masha','liza'].map(id=>({id,name:id}));
test('dialogue retains stage, backdrop and actor while expression and captions change',()=>{
 const {renderer,root}=setup();let s={key:'r:1',chapter:5,background:'great-hall',visual:'castle-dialogue',actor:'dumbledore',speaker:'Дамблдор',expression:'smile',text:'Добро пожаловать',cast};
 renderer.render(s,root);const stage=root.children[0],actor=stage.querySelector('.story-actor'),bg=stage.querySelector('.story-background');
 renderer.render({...s,key:'r:2',expression:'amused',text:'К ужину.'},root);
 assert.equal(root.children[0],stage);assert.equal(stage.querySelector('.story-background'),bg);assert.equal(stage.querySelector('.story-actor'),actor);assert.equal(actor.style.backgroundPosition,'50% 0');assert.equal(stage.querySelector('.spoken-line').textContent,'К ужину.');assert.equal(stage.querySelector('.chapter-transition'),null);
 renderer.render({...s,key:'r:3',actor:'mcgonagall',speaker:'Макгонагалл',text:'Альбус!'},root);
 assert.equal(root.children[0],stage);assert.equal(stage.querySelector('.story-background'),bg);assert.notEqual(stage.querySelector('.story-actor'),actor);
 renderer.render({...s,key:'r:4',chapter:6},root);assert.notEqual(root.children[0],stage);assert(root.querySelector('.chapter-transition'),'chapter cut retains transition');
});
test('full-body poses follow the active cast; wish instruction is visible without dialogue',()=>{
 const {renderer,root}=setup();
 for(let count=1;count<=6;count++){
  for(const [visual,chapter,pose] of [['boarding',1,'back'],['castle-walk',3,'back'],['hall-guests',5,'front'],['hall-guests',5,'toast']]){
   renderer.render({key:count+':'+visual+pose,chapter,visual,background:chapter===3?'lake':'great-hall',cast:cast.slice(0,count),castGroup:chapter>=3,castPose:pose},root);
   const bodies=root.querySelectorAll('.player-body');assert.equal(bodies.length,count);assert.deepEqual(bodies.map(b=>b.dataset.player),cast.slice(0,count).map(p=>p.id));assert(bodies.every(b=>b.dataset.pose===pose));
   if(visual==='hall-guests')assert.equal(Boolean(root.querySelector('.floor-cast')),pose==='front');
  }
 }
 const wish={key:'wish',chapter:5,visual:'holiday-wish',background:'great-hall',cast,castGroup:true,interactive:true,interaction:'wish',answered:[],total:6};renderer.render(wish,root);
 assert.equal(root.querySelector('.speaker-name').textContent,'Загадай желание');assert.equal(root.querySelector('.spoken-line'),null);const stage=root.children[0];renderer.render({...wish,answered:['Олег']},root);assert.equal(root.children[0],stage);assert.match(root.querySelector('.choice-progress').textContent,/Готово 1 из 6/);
});
test('dissolves animate opacity only, survive polling, pause and clean outgoing content',async()=>{
 const {renderer,root}=setup(true);const s={key:'r:1',chapter:5,background:'great-hall',visual:'castle-dialogue',actor:'dumbledore',expression:'smile',speaker:'Дамблдор',text:'Привет',cast};renderer.render(s,root);
 const next={...s,key:'r:2',expression:'amused',text:'Ужин'};renderer.render(next,root);const stage=root.children[0],anims=stage.getAnimations();assert.equal(anims.length,4);
 for(const a of anims){assert(a.frames.every(f=>Object.keys(f).join(',')==='opacity'));a.currentTime=200;}
 renderer.sync({...next,elapsedMs:2500},true);assert(anims.every(a=>a.currentTime===200 && a.playState==='paused'),'poll must not seek local dissolve');renderer.sync({...next,elapsedMs:2700},false);assert(anims.every(a=>a.playState==='running'));
 renderer.render({...next,elapsedMs:3000},root);assert.equal(stage.getAnimations().length,4,'poll must not restart dissolve');anims.forEach(a=>a.finish());await Promise.resolve();assert.equal(stage.querySelectorAll('.story-actor').length,1);assert.equal(stage.querySelectorAll('.story-copy').length,1);
 renderer.render({...next,key:'r:3',text:'Следующая фраза'},root);assert.equal(stage.querySelector('.story-actor').getAnimations().length,0,'same expression stays still');
 const montage={key:'r:4',chapter:5,visual:'feast-closeup',background:'feast-table',cast};renderer.render(montage,root);const outgoing=root.querySelector('.outgoing-shot');assert(outgoing);assert.equal(outgoing['aria-hidden'],'true');const fade=root.children[0].getAnimations().find(a=>a.frames[0].opacity===1&&a.frames[1].opacity===0&&a.playState==='running');assert(fade);fade.finish();await Promise.resolve();assert.equal(root.querySelector('.outgoing-shot'),null);
});
test('illustrated clock has separate accurate dial and holds 23:59 after stopping',()=>{
 const {renderer,root}=setup();const s={key:'clock',chapter:6,visual:'clock',background:'great-hall',cast,clock:true,elapsedMs:0};renderer.render(s,root);
 assert.equal(root.querySelector('.clock-art').src,'/art/castle/clock.webp');assert.equal(root.querySelectorAll('.clock-number').length,12);assert.equal(root.querySelectorAll('.clock-number')[11].textContent,'XII');assert(root.querySelector('.minute-hand'));renderer.sync({...s,elapsedMs:4300},false);assert.equal(root.querySelector('.clock-time').textContent,'23:58');renderer.sync({...s,elapsedMs:4400},false);assert.equal(root.querySelector('.clock-time').textContent,'23:59');renderer.render({...s,key:'stopped',visual:'clock-stopped'},root);renderer.sync({...s,key:'stopped',visual:'clock-stopped',elapsedMs:0},true);assert.equal(root.querySelector('.clock-time').textContent,'23:59');
});
