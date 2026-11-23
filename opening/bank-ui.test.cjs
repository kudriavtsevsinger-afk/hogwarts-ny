const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
class Node{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={setProperty(){}};this.className='';this.classList={toggle(){},add(){}};this.textContent='';}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(k,v){this[k]=v;}removeAttribute(k){delete this[k];}
 all(){return this.children.flatMap(n=>[n,...n.all()]);}
 querySelectorAll(q){return this.all().filter(n=>q.startsWith('#')?n.id===q.slice(1):q.startsWith('.')?n.className.split(' ').includes(q.slice(1)):n.tag===q);}
 querySelector(q){return this.querySelectorAll(q)[0]||null;}
}
test('team bank is a single persistent overlay on display and phones, including zero',()=>{
 for(const phone of [false,true]){
  const body=new Node('body');for(const id of ['screen','error','weather','pause-label']){const n=new Node('div');n.id=id;body.append(n);}
  const context=vm.createContext({setTimeout(){},clearTimeout(){},document:{body,querySelector:q=>body.querySelector(q),createElement:t=>new Node(t)},window:{GameSound:{init(){},onComplete(){},sync(){}},PrologueScene:{render(){},sync(){}},TicketCamera:{close(){}}},location:{search:phone?'?room=123456':'',origin:'https://game.local'},URLSearchParams,sessionStorage:{getItem(){},setItem(){}},localStorage:{getItem(){},setItem(){}}});
  const code=fs.readFileSync(new URL('../avatar-static/opening/app.js','file://'+__filename),'utf8').split("window.addEventListener('pageshow'")[0];vm.runInContext(code,context);vm.runInContext('render=()=>{}',context);
  const accept=state=>{context.next=state;vm.runInContext('accept(next)',context);};
  const cast=[{id:'oleg',name:'Олег'},{id:'sima',name:'Сима'}];const base={phase:'story',scene:{key:'r:1',cast},bank:{balance:30},player:{id:'sima'},isAdmin:false};accept(base);const hud=body.querySelector('#team-bank');assert(hud);assert.equal(hud.querySelector('.bank-amount').textContent,'30');assert.equal(hud.hidden,false);
  accept({...base,bank:{balance:40}});accept({...base,bank:{balance:0}});assert.equal(body.querySelectorAll('#team-bank').length,1);assert.equal(body.querySelector('#team-bank'),hud);assert.equal(hud.querySelector('.bank-amount').textContent,'0');assert.equal(hud.hidden,false);assert.equal(hud['aria-label'],'Общий банк: 0 монет');
  const roster=body.querySelector('#team-roster');assert.equal(roster.hidden,phone);assert.equal(roster.children.length,phone?0:2);
  if(!phone){
   assert.deepEqual(roster.querySelectorAll('img').map(n=>n.src),['/portraits/oleg-neutral.webp','/portraits/sima-neutral.webp']);
   const avatar=roster.children[0];accept(base);assert.equal(roster.children[0],avatar,'avatars persist on polling');
   accept({...base,scene:{key:'r:2',cast:[cast[0]]}});assert.equal(roster.children.length,1,'absent participants are excluded');
   for(const phase of ['lobby','crossing','credits']){accept({...base,phase});assert.equal(roster.hidden,true);assert.equal(roster.children.length,0,'no portrait spoilers');}
   accept({...base,phase:'lineup',scene:undefined,lineup:cast});assert.equal(roster.hidden,false);assert.equal(roster.children.length,2);
  }
  if(!phone){for(const kind of ['title','end','black']){accept({...base,phase:'act1',act:{kind}});assert.equal(body.querySelector('#game-hud').hidden,true,'cinematic title must not show gameplay overlays');}accept({...base,phase:'act1',act:{kind:'shop'}});assert.equal(body.querySelector('#game-hud').hidden,false);}
  accept({...base,bank:undefined});assert.equal(hud.hidden,true);assert.equal(body.querySelector('#game-hud').hidden,true);
 }
});

