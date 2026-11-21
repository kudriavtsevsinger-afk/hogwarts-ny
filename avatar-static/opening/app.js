const basePath = '/hogwarts_ny/start';
const screen = document.querySelector('#screen');
const errorBox = document.querySelector('#error');
const host = !location.pathname.replace(/\/$/,'').endsWith('/play');
const requested = new URLSearchParams(location.search).get('room') || '';
const storageKey = host ? 'platform-host' : 'platform-player';
let session = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
if (requested && session?.code !== requested) session = null;
let code = session?.code || (host ? '' : requested);
let state, rendered, pollPending = false, busy = false, revision = 0;
const portraitUrls = new Map();
document.body.classList.toggle('host', host);
function save() { sessionStorage.setItem(storageKey, JSON.stringify(session)); }
function error(message) { errorBox.hidden = !message; errorBox.textContent = message || ''; }
async function api(action = '', payload, roomCode = code) {
  const response = await fetch(action === 'create' ? basePath + '/api/rooms' : basePath + '/api/rooms/' + roomCode + action, {
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
function image(id, name) {
  const img = element('img');
  img.alt = name;
  if (!portraitUrls.has(id)) {
    portraitUrls.set(id, fetch(basePath + '/api/rooms/' + code + '/portrait/' + id, {
      headers: { Authorization: 'Bearer ' + session.token }
    }).then(async response => {
      if (!response.ok) throw new Error('Портрет ещё недоступен.');
      return URL.createObjectURL(await response.blob());
    }).catch(e => { portraitUrls.delete(id); throw e; }));
  }
  portraitUrls.get(id).then(url => { img.src = url; }).catch(() => {});
  return img;
}
async function create(file) {
  if (!file) throw new Error('Выбери файл с портретами.');
  if (file.size > 1500000) throw new Error('Файл с портретами слишком большой.');
  let portraits;
  try { portraits = JSON.parse(await file.text()); }
  catch { throw new Error('Выбери файл с портретами в формате JSON.'); }
  const room = await api('create', portraits);
  session = room;
  code = room.code;
  save();
  accept(await api());
}
function accept(next) {
  state = next;
  const key = JSON.stringify([state, code, Boolean(session)]);
  if (key === rendered) return;
  rendered = key;
  render();
}
function entry() {
  if (host) {
    const box = panel('Кингс-Кросс', 'Собери компанию перед отправлением.');
    const label = element('label', 'Файл с портретами');
    const file = element('input');
    file.type = 'file';
    file.accept = '.json,application/json';
    label.append(file);
    box.append(label);
    button(box, 'Создать комнату', () => create(file.files[0]));
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
  const box = panel('Ожидаем остальных', 'Пусть каждый откроет ссылку на телефоне и выберет своё имя.');
  box.append(element('div', code, 'code'));
  const links = session.links.length ? session.links : [location.origin + basePath + '/play?room=' + code];
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
  for (const href of links) {
    const link = element('a', href, 'join-link');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener';
    box.append(link);
  }
  const list = element('ul', '', 'players');
  const members = state.names.filter(p => p.taken);
  for (const p of members) {
    const item = element('li');
    item.append(element('span', p.name), element('span', p.ready ? 'Готов' : 'Отвечает', 'status'));
    const remove = button(item, 'Убрать', async () => accept(await api('/remove', { id: p.id })), 'small');
    remove.setAttribute('aria-label', 'Убрать из комнаты: ' + p.name);
    list.append(item);
  }
  box.append(list);
  const ready = members.length >= 3 && members.every(p => p.ready);
  button(box, 'Начать пролог', async () => accept(await api('/start', {}))).disabled = !ready;
  if (!ready) box.append(element('p', 'Нужны 3–6 игроков. Каждый отвечает на все восемь вопросов.', 'hint'));
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
  if (state.phase === 'lobby') return host ? hostLobby() : playerLobby();
  if (!host && state.phase !== 'train') return panel('Смотри на общий экран');
  if (state.phase === 'platform') {
    const box = panel('Кингс-Кросс', 'До отправления несколько минут. Между девятой и десятой платформами стоит кирпичный столб. Вокруг спешат пассажиры. Никто не обращает внимания на человека, который только что исчез за стеной.');
    button(box, 'Шагнуть к стене', async () => accept(await api('/cross', {})));
  } else if (state.phase === 'crossing') {
    screen.replaceChildren(element('div', '', 'blackout'));
  } else if (state.phase === 'credits' && state.card) {
    const scene = element('section', '', 'credits');
    const { id, name, index } = state.card;
    scene.append(image(id, name), element('h1', name));
    screen.replaceChildren(scene);
    if (!index) whistle();
  } else if (state.phase === 'title') {
    const scene = element('section', '', 'title-card');
    const [brand, subtitle] = state.title.split('. ');
    scene.append(element('p', brand, 'eyebrow'), element('h1', subtitle));
    screen.replaceChildren(scene);
  } else if (state.phase === 'train') {
    if (host) {
      const box = panel('Платформа 9¾', 'Пар рассеивается. У платформы ждёт поезд. Проводник поднимает фонарь: «Купе номер семь. Вам туда».');
      const line = element('div', '', 'lineup');
      for (const p of state.lineup) {
        const card = element('figure');
        card.append(image(p.id, p.name), element('figcaption', p.name));
        line.append(card);
      }
      box.append(line);
    } else if (state.result) {
      const box = panel(state.player.name, state.result.role);
      box.append(image(state.player.id, state.player.name), element('p', state.result.strongest.join(' · ')));
    } else {
      panel('Пролог начался', 'Попроси ведущего создать новую комнату, чтобы сыграть сначала.');
    }
  }
}
let audio;
screen.addEventListener('click', () => {
  if (!host || !window.AudioContext) return;
  audio ||= new AudioContext();
  if (audio.state === 'suspended') void audio.resume().catch(() => {});
});
function whistle() {
  if (!audio || audio.state !== 'running') return;
  const now = audio.currentTime;
  const volume = audio.createGain();
  volume.gain.setValueAtTime(0, now);
  volume.gain.linearRampToValueAtTime(.04, now + .25);
  volume.gain.linearRampToValueAtTime(0, now + 1.3);
  volume.connect(audio.destination);
  for (const hz of [360, 455, 540]) {
    const tone = audio.createOscillator();
    tone.frequency.setValueAtTime(hz, now);
    tone.frequency.linearRampToValueAtTime(hz * .92, now + 1.3);
    tone.connect(volume);
    tone.start(now);
    tone.stop(now + 1.31);
  }
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
entry();
void poll();
setInterval(poll, 400);
