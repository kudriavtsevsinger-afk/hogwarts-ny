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
 querySelectorAll(q){return this.all().filter(c=>q.startsWith('#')?c.id===q.slice(1):q.startsWith('.')?c.className.split(' ').includes(q.slice(1)):q==='details[open]'?c.tag==='details'&&c.open:c.tag===q);}
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

test('laughter uses smiling portraits only for participants, without neutral body sprites',()=>{
 const {renderer,root}=setup();
 for(let count=1;count<=6;count++){
  renderer.render({key:'smile:'+count,chapter:5,visual:'hall-guests',background:'great-hall',cast:cast.slice(0,count),castGroup:true,castExpression:'smile'},root);
  const row=root.querySelector('.happy-cast');assert(row);const portraits=row.querySelectorAll('img');assert.equal(portraits.length,count);assert.deepEqual(portraits.map(p=>p.src),cast.slice(0,count).map(p=>'/portraits/'+p.id+'-smile.webp'));assert.equal(root.querySelector('.player-body'),null);
 }
});


test('Act I handoff releases old cinematic layers and never resurrects a detached stage',()=>{
 const {renderer,root}=setup(true);
 const before={key:'prologue:end',chapter:6,visual:'castle-dialogue',background:'great-hall',actor:'dumbledore',speaker:'Дамблдор',text:'Полночь',cast};
 renderer.render(before,root);renderer.render({...before,key:'prologue:next',text:'Тишина'},root);
 const old=root.children[0];assert(old.getAnimations().length);renderer.release();assert.equal(root.children.length,0);assert.equal(old.getAnimations().length,0);
 const title=new Element('section');root.replaceChildren(title);
 const travel={key:'act:travel',chapter:7,visual:'act-travel',background:'corridor',cast};renderer.render(travel,root);
 assert.notEqual(root.children[0],old);assert.equal(root.querySelector('.story-actor'),null);assert.equal(root.querySelector('.chapter-transition'),null);assert.equal(root.querySelector('.outgoing-shot'),null);
 const detached=root.children[0];root.replaceChildren(title);renderer.render({...travel,key:'act:next',background:'tower'},root);assert.notEqual(root.children[0],detached);assert.equal(root.querySelector('.outgoing-shot'),null);
});

test('meow and offscreen conductor keep the same Filch image mounted',()=>{
 const {renderer,root}=setup();
 const s={key:'meow',chapter:1,visual:'dialogue',background:'platform',actor:'filch',cast};
 renderer.render(s,root);const stage=root.children[0],actor=stage.querySelector('.filch-actor');
 renderer.render({...s,key:'conductor-filch',speaker:'Проводник · за кадром',text:'Да, мистер Филч, это относится и к вам!'},root);
 assert.equal(root.children[0],stage);assert.equal(stage.querySelector('.filch-actor'),actor);assert.equal(actor.alt,'Филч с кошкой');
});

function setupActs(motion=false){
 const body=new Element('body'),root=new Element('main');body.append(root);
 const context=vm.createContext({window:{matchMedia:()=>({matches:!motion})},document:{body,activeElement:null,querySelector:q=>body.querySelector(q),createElement:t=>new Element(t)},Image:class{},setInterval(){},performance:{now:()=>100},crypto:{randomUUID:()=> 'nonce'}});
 for(const name of ['scene','act1'])vm.runInContext(fs.readFileSync(new URL('../avatar-static/opening/'+name+'.js','file://'+__filename),'utf8'),context);
 return {...context.window,body,root};
}
const actTwoBase={key:'a2:1',kind:'line',id:'sprout',speaker:'Профессор Спраут',text:'Добро пожаловать!',remaining:9000,ready:0,total:3,inventory:[],cast:[]};
test('Act II dialogue uses the prologue stage and retains actor across consecutive lines',()=>{
 const {ActTwo,PrologueScene,root}=setupActs();
 PrologueScene.render({key:'p:1',chapter:5,visual:'castle-dialogue',background:'great-hall',actor:'dumbledore',speaker:'Дамблдор',text:'Ужин',cast:[]},root);
 const prologueCaption=root.querySelector('.story-copy').className;
 ActTwo.render({act2:actTwoBase},root,true,async()=>{});
 const stage=root.querySelector('.story-stage'),actor=root.querySelector('.sprout-actor');assert(stage);assert(actor);assert.equal(root.querySelector('.story-copy').className,prologueCaption);assert.equal(root.querySelector('.act-screen'),null);
 ActTwo.render({act2:{...actTwoBase,key:'a2:2',text:'Лёд пошёл изнутри.'}},root,true,async()=>{});
 assert.equal(root.querySelector('.story-stage'),stage);assert.equal(root.querySelector('.sprout-actor'),actor);assert.equal(root.querySelector('.spoken-line').textContent,'Лёд пошёл изнутри.');
});
test('Act II activity updates preserve root, avoid polling fades, and dissolve on next scene',async()=>{
 const {ActTwo,root}=setupActs(true),mirror={...actTwoBase,key:'mirror',id:'mirror',kind:'mirror',mode:'guess',round:1,totalRounds:3,votesCast:0,voters:2,text:'Море'};
 ActTwo.render({act2:mirror},root,true,async()=>{});const first=root.querySelector('.act-screen');
 ActTwo.render({act2:{...mirror,remaining:5000}},root,true,async()=>{});assert.equal(root.querySelector('.act-screen'),first);assert.equal(root.querySelector('.a2-timer').textContent,'5 с');
 ActTwo.render({act2:{...mirror,votesCast:1}},root,true,async()=>{});assert.equal(root.querySelector('.act-screen'),first);assert.equal(first.getAnimations().length,0);
 ActTwo.render({act2:{...mirror,key:'choice',id:'choice',kind:'choice'}},root,true,async()=>{});assert.notEqual(root.querySelector('.act-screen'),first);assert.equal(first['aria-hidden'],'true');assert(first.inert);
 const fade=first.animations[0];assert(fade.frames.every(f=>Object.keys(f).join(',')==='opacity'));fade.finish();await Promise.resolve();assert.equal(root.querySelectorAll('.act-screen').length,1);
});
test('shared inventory survives Act I cleanup, uses current context, removes consumed items',()=>{
 const {GameUI,ActOne,body}=setupActs(),used=[];
 const cfg={owner:'act1',host:false,key:'one',items:[{id:'watch',name:'Тик-так',image:'watch.webp',usable:true}],onUse:id=>used.push('one:'+id)};
 GameUI.inventory(cfg);const pouch=body.querySelector('#team-inventory');
 GameUI.inventory({...cfg,owner:'act2',key:'two',onUse:id=>used.push('two:'+id)});ActOne.hide();assert.equal(pouch.hidden,false);assert.equal(body.querySelectorAll('#team-inventory').length,1);
 pouch.querySelector('.inventory-slot').onclick();const detail=pouch.querySelector('.inventory-detail');assert(detail);detail.querySelector('button').onclick();assert.deepEqual(used,['two:watch']);
 GameUI.inventory({...cfg,owner:'act2',key:'two',items:[]});assert.equal(pouch.hidden,true);assert.equal(pouch.querySelector('.inventory-detail'),null);
});
test('Act II shop calls the same product component and sends purchases only from phone',async()=>{
 const {ActTwo,GameUI,root}=setupActs();let calls=0;const shared=GameUI.shopItem;GameUI.shopItem=i=>{calls++;return shared(i);};
 const a={...actTwoBase,key:'shop',id:'shop',kind:'shop',items:[{id:'shield',name:'Щит Хранителя',cost:3}]};const sent=[];
 ActTwo.render({act2:a},root,true,async p=>sent.push(p));assert.equal(calls,1);assert.equal(root.querySelectorAll('.act-item').length,1);assert.equal(root.querySelector('.act-item').querySelector('button'),null);
 ActTwo.render({act2:a},root,false,async p=>sent.push(p));assert.equal(calls,2);const b=root.querySelector('.act-item').querySelector('button');await b.onclick();assert.equal(sent[0].type,'propose');assert.equal(sent[0].target,'shield');assert.equal(sent[0].key,'shop');
});
