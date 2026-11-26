// Pure server-side rules. Never send the recipe or unconsented wishes to clients.
export const INGREDIENTS=['Полынь','Бубонтюбер','Мандрагора','Асфодель','Жабросли','Валериана'];
export const SHEETS=[['Холодные цвета','Синий → Валериана. Зелёный → Полынь.'],['Тёплые цвета','Красный → Асфодель. Жёлтый → Жабросли.'],['Пар','Нет → Мандрагора. Лёгкий → Бубонтюбер. Густой → Валериана.'],['Пузыри','Редкие → Жабросли. Частые → Мандрагора. Кипит → Асфодель.'],['Иней','Ингредиенты кладут в обратном порядке.'],['Свечение','Второй ингредиент пропускают.']];
export const ROUND_SECONDS=[90,75,75,75,90];
export function recipe(s){let a=[[5,0,3,4][s.color],[2,1,5][s.steam],[4,2,3][s.bubbles]];if(s.glow)a.splice(1,1);if(s.frost)a.reverse();return a;}
export function newCauldron(round,random){if(round<1||round>5)throw Error('Invalid round');return {round,color:random(4),steam:random(3),bubbles:random(3),frost:round===3||round===5,glow:round>=4,cracks:0,added:[],remaining:ROUND_SECONDS[round-1]};}
export const ABILITIES={
 'Смельчак':{id:'brave_stand',name:'Не отступать',desc:'Убрать одну трещину котла'},
 'Мудрец':{id:'read_between',name:'Читать между строк',desc:'Раскрыть листы про пар и пузыри'},
 'Стратег':{id:'cold_calc',name:'Расчёт',desc:'Убрать один неверный вариант Зеркала'},
 'Хранитель':{id:'care',name:'Забота',desc:'Добавить 20 секунд'},
 'Лидер':{id:'leader_word',name:'Слово старосты',desc:'Решить ничью Зеркала'},
 'Творец':{id:'maker_touch',name:'Находчивость',desc:'Сменить рецепт текущего раунда'}
};
export function assignAbility(player,role,act){player.ability={...ABILITIES[role],act,usedInAct:null,spent:false};}
export function spendAbility(player,act,id){const a=player.ability;if(!a||a.act!==act||a.id!==id||a.spent||a.usedInAct===act)throw Error('Способность недоступна');a.usedInAct=act;a.spent=true;player.flags||={};player.flags.abilitiesUsed||=[];player.flags.abilitiesUsed.push(id);}
export function expireAbility(player){if(player.ability)player.ability.spent=true;}
export function sheetsFor(index,count){return SHEETS.map(([name,text],i)=>({id:i+1,name,text})).filter((_,i)=>i%count===index);}
export function buttonsFor(index,count){return INGREDIENTS.map((name,i)=>({id:i,name})).filter((_,i)=>(i+1)%count===index);}
export function mirrorReward(correct,total){return total&&correct/total>.8?2:total&&correct/total>=.5?1:0;}
export function finaleFlags(players){const ids=[...players];const release=ids.filter(p=>p.flags?.zerkalo_choice==='release').length;return {canRelease:release>ids.length/2};}
export function consentedWishes(players,wishes,consent){return [...players].filter(p=>consent[p.id]===true&&typeof wishes[p.id]==='string'&&wishes[p.id].trim()).map(p=>({author:p.id,text:Array.from(wishes[p.id].trim()).slice(0,140).join('')}));}
