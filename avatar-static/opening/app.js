const basePath = '/api/opening/rooms';
const screen = document.querySelector('#screen');
const errorBox = document.querySelector('#error');
const requested = new URLSearchParams(location.search).get('room') || '';
const host = !requested;
const storageKey = host ? 'midnight-host' : 'midnight-player';
const storage = host ? sessionStorage : localStorage;
let session;
try { session = JSON.parse(storage.getItem(storageKey) || sessionStorage.getItem(storageKey) || 'null'); } catch { session = null; }
if (requested && session?.code !== requested) session = null;
let code = session?.code || (host ? '' : requested);
let state, rendered, pollPending = false, busy = false, revision = 0;
document.body.classList.toggle('host', host);
window.GameSound.init(host);
window.GameSound.onComplete(async key=>{if(!host||state?.scene?.key!==key)return;revision++;const next=await api('/complete',{key});revision++;accept(next);});
let adminExpanded = false;
const weather = document.querySelector('#weather');
for (let i = 0; i < 38; i++) {
  const flake = document.createElement('i');
  flake.style.cssText = `--x:${(i * 37) % 100}%;--duration:${8 + (i % 9)}s;--delay:-${i % 17}s;--size:${2 + (i % 4)}px`;
  weather.append(flake);
}
function save() { storage.setItem(storageKey, JSON.stringify(session)); }
if (session) save();
let noticeTimer,noticeText='',noticeAt=0;
function error(message) {
 if(message&&message===noticeText&&Date.now()-noticeAt<8000)return;
 clearTimeout(noticeTimer);errorBox.hidden=!message;errorBox.textContent=message?message+'  ×':'';
 if(message){noticeText=message;noticeAt=Date.now();noticeTimer=setTimeout(()=>{errorBox.hidden=true;errorBox.textContent='';},4500);}
}
errorBox.onclick=()=>error();errorBox.setAttribute('role','status');errorBox.setAttribute('aria-live','polite');
window.GameNotice={show:error};
async function api(action = '', payload, roomCode = code) {
  const response = await fetch(action === 'create' ? basePath : basePath + '/' + roomCode + action, {
    method: payload === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: 'Bearer ' + session.token } : {}) },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error), { status: response.status });
  return result;
}
async function act(work) {
  if (busy) return;
  busy = true;
  revision++;
  error();
  screen.setAttribute('aria-busy', 'true');
  for (const button of screen.querySelectorAll('button:not(:disabled)')) {
    button.dataset.pending = 'true';
    button.disabled = true;
  }
  try { await work(); } catch (e) { error(e.message); }
  finally {
    busy = false;
    screen.removeAttribute('aria-busy');
    for (const button of screen.querySelectorAll('[data-pending]')) {
      delete button.dataset.pending;
      button.disabled = false;
    }
  }
}
function element(tag, label, cls) {
  const el = document.createElement(tag);
  if (label) el.textContent = label;
  if (cls) el.className = cls;
  return el;
}
function button(parent, label, work, cls) {
  const el = element('button', label, cls);
  el.onclick = () => act(work);
  parent.append(el);
  return el;
}
function panel(title, subtitle) {
  const section = element('section', '', 'panel');
  section.append(element('h1', title));
  if (subtitle) section.append(element('p', subtitle, 'subtitle'));
  screen.replaceChildren(section);
  return section;
}
function image(id, name, expression = 'neutral') {
  const img = element('img');
  img.alt = name;
  img.src = '/portraits/' + id + '-' + expression + '.webp';
  return img;
}
async function create() {
  const room = await api('create', {});
  session = room;
  code = room.code;
  save();
  accept(await api());
}
function accept(next) {
  if(state&&(state.phase!==next.phase||state.act?.key!==next.act?.key))error();
  state = next;
  if(state.phase!=='act1')window.ActOne?.hide?.();
  let bank=document.querySelector('#team-bank');
  if(!bank){bank=element('aside','','team-bank');bank.id='team-bank';bank.setAttribute('role','status');bank.setAttribute('aria-live','polite');bank.setAttribute('aria-atomic','true');const icon=element('span','✦','bank-coin');icon.setAttribute('aria-hidden','true');bank.append(icon,element('span','Общий банк','bank-label'),element('strong','','bank-amount'));const hud=element('div','','game-hud');hud.id='game-hud';const roster=element('div','','team-roster');roster.id='team-roster';roster.setAttribute('role','group');roster.setAttribute('aria-label','Участники');hud.append(roster,bank);document.body.append(hud);}
  bank.hidden=!state.bank;
  const hud=document.querySelector('#game-hud'),roster=document.querySelector('#team-roster');
  hud.hidden=!state.bank||Boolean(host&&(state.act&&['title','end','black'].includes(state.act.kind)||state.scene&&['blackout','final-title'].includes(state.scene.visual)));
  const members=host && ['lineup','title','story','act1'].includes(state.phase)?(state.scene?.cast || state.lineup || []):[];
  roster.hidden=!members.length;
  const rosterKey=members.map(p=>p.id+':'+p.name).join('|');
  if(roster.dataset.members!==rosterKey){roster.dataset.members=rosterKey;roster.replaceChildren(...members.map(p=>{const avatar=element('span','','team-avatar');avatar.title=p.name;avatar.append(image(p.id,p.name));return avatar;}));}
  document.body.classList.toggle('has-bank',Boolean(state.bank));
  if(state.bank){const amount=String(state.bank.balance);if(bank.querySelector('.bank-amount').textContent!==amount)bank.querySelector('.bank-amount').textContent=amount;bank.setAttribute('aria-label','Общий банк: '+amount+' монет');bank.title='Монеты команды на подсказки';}
  if (host) window.GameSound.sync(state);
  document.querySelector('#pause-label').hidden = !state.paused;
  document.body.classList.toggle('is-paused', host && Boolean(state.paused));
  // Sound and pause updates must not remount a paused scene at animation frame zero.
  const visualState = host ? { ...state, paused: undefined, audio: undefined, scene:state.scene ? {...state.scene, elapsedMs:undefined} : undefined } : state;
  const key = JSON.stringify([visualState, code, Boolean(session)]);
  if (key === rendered) { if(host && state.scene) window.PrologueScene.sync(state.scene,state.paused); return; }
  rendered = key;
  render();
  if(host && state.scene) window.PrologueScene.sync(state.scene,state.paused);
}
function entry() {
  const bank=document.querySelector('#team-bank');if(bank)bank.hidden=true;
  const hud=document.querySelector('#game-hud');if(hud)hud.hidden=true;
  window.TicketCamera.close();
  if (host) {
    const box = panel('Собираем историю', 'Подготавливаем общий экран…');
    if (!code) void act(async () => {
      try { await create(); } catch (e) { button(box, 'Повторить подключение', create); throw e; }
    });
    return;
  }
  const box = panel('Вход в комнату', 'Введи код с общего экрана.');
  const form = element('form');
  const input = element('input');
  input.placeholder = '000000';
  input.inputMode = 'numeric';
  input.maxLength = 6;
  input.value = code;
  input.setAttribute('aria-label', 'Шестизначный код комнаты');
  form.append(input, element('button', 'Войти'));
  form.onsubmit = e => {
    e.preventDefault();
    act(async () => {
      const value = input.value.trim();
      if (!/^\d{6}$/.test(value)) throw new Error('Введи шестизначный код.');
      const next = await api('', undefined, value);
      code = value;
      accept(next);
    });
  };
  box.append(form);
}
function hostLobby() {
  const box = panel('Вечер начинается', 'Отсканируйте QR-код и выберите своё имя.');
  box.classList.add('lobby-display');
  box.prepend(element('p', 'Ваша история ещё не написана', 'eyebrow'));
  box.append(element('div', code, 'code'));
  const links = session?.links?.length ? session.links : [location.origin + '/?room=' + code];
  if (typeof window.qrcode === "function") {
    const qr = element('div', '', 'qr');
    qr.setAttribute('aria-label', 'QR-код входа');
    const matrix = window.qrcode(0, 'M');
    matrix.addData(links[0]);
    matrix.make();
    const graphic = element('img');
    graphic.src = matrix.createDataURL(4, 16);
    graphic.alt = 'QR-код входа';
    qr.append(graphic);
    box.append(qr);
  }
  const list = element('ul', '', 'players');
  const members = state.names.filter(p => p.taken);
  for (const p of members) {
    const item = element('li');
    item.append(element('span', p.name), element('span', p.ready ? 'Готов' : 'Отвечает', 'status'));
    list.append(item);
  }
  box.append(list);
  box.append(element('p', 'История начнётся, когда все будут готовы.', 'hint'));
}
function playerLobby() {
  if (!state.player) {
    const box = panel('Выбери себя');
    const list = element('div', '', 'options');
    for (const p of state.names) {
      button(list, p.name + (p.taken ? ' · занято' : ''), async () => {
        const joined = await api('/join', { id: p.id });
        session = { code, token: joined.token };
        save();
        accept(joined.state);
      }, 'option').disabled = p.taken;
    }
    box.append(list);
    return;
  }
  if (!state.question) {
    panel('Ты готов', 'Дождись остальных и смотри на общий экран.');
    return;
  }
  const [title, ...choices] = state.question;
  const index = state.player.next;
  const box = panel(title);
  box.prepend(element('p', (index + 1) + ' из 8', 'eyebrow'));
  const progress = element('progress');
  progress.value = index + 1;
  progress.max = 8;
  progress.setAttribute('aria-label', 'Прогресс опроса');
  const list = element('div', '', 'options');
  for (const [choice, text] of choices.entries()) {
    button(list, 'ABCD'[choice] + '   ' + text, async () =>
      accept(await api('/answer', { index, choice })), 'option');
  }
  box.append(progress, list);
}
function render() {
  document.body.dataset.phase = state?.phase || 'entry';
  if (!state) return entry();
  if (!state.ticket) window.TicketCamera.close();
  document.body.dataset.outdoor = String(host && Boolean(state.scene?.outdoor));
  if (state.phase === 'lobby') {
    host ? hostLobby() : playerLobby();
    if(host)window.PrologueScene.preload();
    if (!host) adminControls();
    return;
  }
  if(state.phase==='act1'){
    window.ActOne.render(state,screen,host,async payload=>{revision++;const next=await api('/act',payload);revision++;accept(next);},state.player?.id);
    if(!host)adminControls();return;
  }
  if (state.phase === 'story') {
    if(host) window.PrologueScene.render(state.scene,screen);
    else {
      if(state.wish) wishChoice();
      else if(state.ticket) window.TicketCamera.render(state.ticket,screen,async payload=>act(async()=>accept(await api('/ticket',payload))),state.paused);
      else if(state.sweetChoice) sweetChoice();
      else if(state.introduction) introductionChoice();
      else if(state.sceneEnded && state.result) personalResult();
      else panel(state.paused ? 'Небольшая пауза' : 'История оживает', 'Смотри на общий экран.');
      adminControls();
    }
    return;
  }
  if (!host) {
    panel(state.paused ? 'Небольшая пауза' : 'История оживает', 'Смотри на общий экран.');
    adminControls(); return;
  }
  if (state.phase === 'platform') {
    const box = panel('Перед началом', 'Мир вокруг затихает. В темноте появляется узкая полоса света. За ней слышны три коротких удара, затем снова тишина.');
    box.classList.add('scene-copy');
  } else if (state.phase === 'crossing') {
    screen.replaceChildren(element('div', '', 'blackout'));
  } else if (state.phase === 'credits' && state.card) {
    const scene = element('section', '', 'credits');
    const { id, name, index } = state.card;
    const figure = element('div', '', 'portrait-scene');
    figure.append(image(id, name), element('h1', name));
    scene.append(figure);
    screen.replaceChildren(scene);

  } else if (state.phase === 'lineup' || state.phase === 'title') {
    // Keep the same ensemble mounted when the logo appears.
    const castKey = state.lineup.map(p => p.id).join(',');
    let scene = screen.querySelector('.lineup-scene');
    if (!scene || scene.dataset.cast !== castKey) {
      scene = element('section', '', 'lineup-scene');
      scene.dataset.cast = castKey;
      const row = element('div', '', 'lineup');
      row.style.setProperty('--count', state.lineup.length);
      for (const p of state.lineup) {
        const figure = element('figure', '', 'lineup-person');
        figure.append(image(p.id, p.name), element('figcaption', p.name));
        row.append(figure);
      }
      scene.append(row);
      screen.replaceChildren(scene);
    }
    if (state.phase === 'title' && !scene.querySelector('.ensemble-logo')) {
      const logoFrame = element('div', '', 'ensemble-logo');
      const logo = element('img');
      logo.src = '/art/game-logo.webp';
      logo.alt = state.title;
      logoFrame.append(logo);
      scene.append(logoFrame);
    }
  }
}
function introductionChoice() {
  const q=state.introduction;
  if(q.choice !== null) {
    const box=panel('Твоя реплика выбрана',q.options[q.choice]);
    box.append(element('p','Готово '+q.answered+' из '+q.total+'. Скоро вы познакомитесь на платформе.','hint'));return;
  }
  const box=panel(q.question),list=element('div','','options');
  q.options.forEach((text,choice)=>{
    button(list,text,async()=>accept(await api('/introduce',{choice,key:q.key})),'option').disabled=state.paused;
  });box.append(list);
  if(state.paused)box.append(element('p','Выбор продолжится после паузы.','hint'));
}
const wishDrafts=new Map();
function wishChoice(){
 const q=state.wish;
 if(q.value!==null){panel('Желание сохранено','Пусть оно найдёт дорогу к исполнению.');return;}
 let box=screen.querySelector('.wish-panel');
 if(!box||box.dataset.key!==q.key){
  box=panel('Загадай желание','Перед наступлением Нового года загадай желание для своего персонажа.');box.classList.add('wish-panel');box.dataset.key=q.key;
  const form=element('form'),text=element('textarea');text.maxLength=500;text.rows=5;text.placeholder='Моё желание…';text.setAttribute('aria-label','Желание персонажа');text.value=wishDrafts.get(q.key)||'';text.oninput=()=>wishDrafts.set(q.key,text.value);
  const send=element('button','Загадать','primary-action');form.append(text,send);form.onsubmit=e=>{e.preventDefault();if(!text.value.trim())return;void act(async()=>{const next=await api('/wish',{key:q.key,text:text.value});wishDrafts.delete(q.key);accept(next);});};box.append(form);
 }
 box.querySelector('textarea').disabled=state.paused;box.querySelector('button').disabled=state.paused;
}
function sweetChoice() {
  const q=state.sweetChoice;
  if(q.choice!==null){const chosen=q.options.find(s=>s.id===q.choice);const box=panel('Сладость выбрана',chosen.name);box.append(element('p','Готово '+q.answered+' из '+q.total+'. Смотри на общий экран.','hint'));return;}
  const box=panel('Что попробуешь?','У каждой сладости есть свой характер.'),list=element('div','','sweet-options');
  for(const sweet of q.options){const b=button(list,'',async()=>accept(await api('/sweet',{key:q.key,choice:sweet.id})),'sweet-option');const art=element('span','','sweet-art');art.dataset.sweet=sweet.id;art.setAttribute('aria-hidden','true');b.append(art,element('span',sweet.name));b.disabled=state.paused;}
  box.append(list);
}
function personalResult() {
  const box=panel(state.player.name,state.result.role);
  const expression=({'Смельчак':'smile','Мудрец':'neutral','Стратег':'concerned','Хранитель':'smile','Лидер':'surprised','Творец':'surprised'})[state.result.role];
  box.classList.add('personal-result');const copy=element('div','','result-copy');
  while(box.firstChild)copy.append(box.firstChild);
  copy.append(element('p',state.result.strongest.join(' · '),'traits'));
  if(state.profile?.wish)copy.append(element('p',state.profile.wish,'saved-wish'));
  copy.append(element('p','Полночь остановилась. Ваша история только начинается.','hint'));
  box.append(image(state.player.id,state.player.name,expression),copy);
}

function adminControls() {
  screen.querySelector('.admin-console')?.remove();
  if (!state.isAdmin) return;
  const controls = element('aside', '', 'admin-console');
  controls.setAttribute('aria-label', 'Действия');
  if (state.phase === 'lobby') {
    button(controls, 'Показать заставку', async () => accept(await api('/start', {})), 'primary-action').disabled = !state.canStart;
    if (!state.canStart) controls.append(element('p', 'Начало станет доступно, когда все участники закончат опрос.', 'hint'));
  } else {
    if(state.phase==='title') button(controls,'Начать',async()=>accept(await api('/start',{})),'primary-action').disabled=state.paused;
    if (state.advance && !state.sceneEnded) {
      const stepKey=state.advance.key;
      button(controls,state.advance.label,async()=>accept(await api('/next',{key:stepKey})),'primary-action').disabled=!state.advance.enabled;
    }
    if (state.waiting) controls.append(element('p',state.waiting,'hint'));
    button(controls, state.paused ? 'Продолжить' : 'Пауза', async () => accept(await api(state.paused ? '/resume' : '/pause', {})), 'secondary-action');
    if (state.sceneEnded) controls.append(element('p','Пролог завершён.','hint'));
  }
  const settings = element('details'); settings.open = adminExpanded;
  settings.ontoggle = () => { adminExpanded = settings.open; };
  settings.append(element('summary', 'Звук и участники'));
  const audio = state.audio || {enabled:true,volume:.45};
  button(settings, audio.enabled ? 'Выключить музыку и звуки' : 'Включить музыку и звуки', async () => accept(await api('/sound', {...audio, enabled:!audio.enabled})), 'secondary-action');
  const label = element('label', 'Громкость общего экрана');
  const range = element('input'); range.type = 'range'; range.min = 0; range.max = 100; range.step = 5; range.value = audio.volume * 100;
  range.setAttribute('aria-label', 'Громкость общего экрана');
  range.onchange = () => act(async () => accept(await api('/sound', {enabled:audio.enabled,volume:Number(range.value)/100})));
  label.append(range); settings.append(label);
  if (state.phase === 'lobby') {
    for (const p of state.names.filter(p => p.taken)) {
      const row = element('div', '', 'admin-person');
      row.append(element('span', p.name + (p.ready ? ' · готов' : ' · отвечает')));
      if (p.id !== 'oleg') button(row, 'Убрать', async () => accept(await api('/remove', {id:p.id})), 'small secondary-action');
      settings.append(row);
    }
  }
  button(settings, 'Начать заново', async () => {
    if (window.confirm('Начать заново? Ответы всех участников будут сброшены.')) accept(await api('/restart', {}));
  }, 'secondary-action');
  controls.append(settings); screen.append(controls);
}
async function poll() {
  if (!code || busy || pollPending) return;
  pollPending = true;
  const started = revision;
  try {
    const next = await api();
    if (started === revision) accept(next);
  } catch (e) {
    if (started !== revision) return;
    if (e.status === 404) {
      session = null;
      code = '';
      save();
      state = undefined;
      rendered = undefined;
      entry();
    }
    error(e.message);
  } finally { pollPending = false; }
}
window.addEventListener('pageshow',()=>{rendered=undefined;void poll();});
entry();
void poll();
setInterval(()=>{if(state?.act?.kind==='hunt'||state?.act?.kind==='chimes')void poll();},200);
setInterval(()=>{if(!['hunt','chimes'].includes(state?.act?.kind))void poll();},400);

