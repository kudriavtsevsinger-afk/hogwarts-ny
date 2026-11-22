// Server-owned team economy. Puzzle handlers must validate a solution before awarding.
export const ECONOMY=Object.freeze({
  startingCoins:30,
  rewards:Object.freeze({easy:6,standard:10,hard:14}),
  hintPrices:Object.freeze([3,5,8])
});
export function createBank(){return {balance:ECONOMY.startingCoins,earned:0,spent:0,solved:[],hints:{},ledger:[]};}
export function bankView(bank){return {balance:bank.balance,earned:bank.earned,spent:bank.spent};}
function fail(message){throw Object.assign(new Error(message),{status:409});}
function puzzle(catalog,id){
  if(typeof id!=='string'||!Object.hasOwn(catalog,id))fail('Загадка недоступна.');
  const p=catalog[id];if(!Object.hasOwn(ECONOMY.rewards,p.difficulty))fail('Не задана сложность загадки.');return p;
}
export function awardSolvedPuzzle(bank,catalog,id){
  const p=puzzle(catalog,id);if(bank.solved.includes(id))return 0;
  const amount=ECONOMY.rewards[p.difficulty];bank.balance+=amount;bank.earned+=amount;bank.solved.push(id);
  bank.ledger.push({key:'solve:'+id,amount,balance:bank.balance});return amount;
}
export function purchaseHint(bank,catalog,id,level){
  const p=puzzle(catalog,id);
  if(!Number.isInteger(level)||level<1||level>3||typeof p.hints?.[level-1]!=='string'||!p.hints[level-1].trim())fail('Подсказка недоступна.');
  const bought=Object.hasOwn(bank.hints,id)?bank.hints[id]:[];
  if(bought.includes(level))return {text:p.hints[level-1],charged:0};
  if(bank.solved.includes(id))fail('Эта загадка уже решена.');
  if(level!==bought.length+1)fail('Открывай подсказки по порядку.');
  const cost=ECONOMY.hintPrices[level-1];if(bank.balance<cost)fail('В общем банке недостаточно монет.');
  bank.balance-=cost;bank.spent+=cost;Object.defineProperty(bank.hints,id,{value:[...bought,level],writable:true,configurable:true,enumerable:true});
  bank.ledger.push({key:'hint:'+id+':'+level,amount:-cost,balance:bank.balance});return {text:p.hints[level-1],charged:cost};
}
