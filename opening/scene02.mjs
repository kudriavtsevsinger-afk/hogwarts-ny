export const sweets = [
  {id:'frog',name:'Шоколадная лягушка'},
  {id:'beans',name:'Драже Берти Боттс'},
  {id:'pumpkin',name:'Тыквенный пирожок'},
  {id:'licorice',name:'Лакричная палочка'}
];
export function secondScene(ids,cast,choices={}) {
 const shot=(id,visual,durationMs,extra={})=>({id,visual,durationMs,chapter:2,background:'compartment',...extra});
 const line=(id,text,voiceNumber,extra={})=>({id,visual:'vendor',chapter:2,background:'compartment',speaker:'Продавщица',text,actor:'vendor',voiceNumber,...extra});
 const observer=ids.includes('vanya')?'vanya':ids[0];
 return [
  shot('compartment-reveal','compartment',6000),
  shot('vendor-arrives','vendor-enter',3500,{actor:'vendor'}),
  line('vendor-sweets','Сладости, мои дорогие? Шоколадные лягушки, тыквенные пирожки, лакричные палочки и драже Берти Боттс!',8),
  line('vendor-soap','Только с драже будьте осторожнее. Вчера один молодой волшебник уверял, что ему попалась клубника со сливками. Оказалось, мыло. Очень убедительное мыло.',9),
  line('vendor-brave','Ну что, кто у нас самый смелый?',10),
  {id:'sweets-choice',visual:'sweets-choice',chapter:2,background:'compartment',actor:'vendor',speaker:'Продавщица',text:'Что попробуем?',interactive:true,interaction:'sweets'},
  ...ids.map((id,i)=>{
   const selection=choices[id]||{choice:'frog',outcome:'frog'};
   const neighbor=ids[(i+1)%ids.length];
   const outcomes={
    frog:{text:ids.length>1?`Шоколадная лягушка выпрыгивает из коробки и садится на плечо ${neighbor==='oleg'?'Олегу':neighbor==='vanya'?'Ване':({sima:'Симе',masha:'Маше',liza:'Лизе',amina:'Амине'})[neighbor]}!`:'Шоколадная лягушка выпрыгивает из коробки и садится тебе на плечо!',expression:'surprised',neighbor},
    caramel:{text:'Карамель! Кажется, сегодня тебе везёт.',expression:'smile'},
    wool:{text:'Мокрая шерсть… Вот это поворот!',expression:'concerned'},
    pumpkin:{text:'Тыквенный пирожок на мгновение озаряет тебя золотым светом.',expression:'surprised'},
    licorice:{text:'Лакричная палочка неожиданно завязывается узлом!',expression:'surprised'}
   };
   return shot('sweet-'+id,'sweet-reaction',6500,{actor:id,speaker:cast[id],sweet:selection.choice,outcome:selection.outcome,...outcomes[selection.outcome],cue:selection.outcome==='pumpkin'?'magic':selection.outcome==='wool'?'pickup':'success',cueDuration:1.7});
  }),
  line('vendor-ready','Прекрасно! Вот теперь я вижу, что вы действительно готовы к Хогвартсу.',11),
  line('vendor-share','И запомните: самое лучшее волшебство обычно случается тогда, когда рядом есть с кем им поделиться.',12),
  shot('vendor-leaves','vendor-exit',3000,{actor:'vendor'}),
  shot('compartment-dusk','compartment-dusk',4500),
  shot('high-bridge','viaduct',6500,{background:'viaduct',outdoor:true}),
  {id:'castle-question',visual:'castle-question',chapter:2,background:'compartment',speaker:cast[observer],actor:observer,expression:'surprised',text:'Смотрите… Это он?',voiceId:'castle-question-'+observer},
  shot('castle-approach','castle',6000,{background:'viaduct',outdoor:true}),
  line('welcome-home','Добро пожаловать домой.',13,{actor:null,speaker:'Продавщица · из коридора',visual:'castle',background:'viaduct',outdoor:true}),
  {id:'prologue-end',visual:'castle',chapter:2,background:'viaduct',outdoor:true,end:true}
 ];
}
