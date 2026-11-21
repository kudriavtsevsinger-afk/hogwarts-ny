import { questions, score } from './quiz.mjs';
import { introductions, storyPosition } from './scene01.mjs';
import { sweets } from './scene02.mjs';

const cast = { oleg: 'Олег', sima: 'Сима', masha: 'Маша', vanya: 'Ваня', liza: 'Лиза', amina: 'Амина' };
const CARD_MS = 2600;
const LINEUP_MS = 3600;
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), value => value.toString(16).padStart(2, '0')).join('');
function fail(message, status = 409) { throw Object.assign(new Error(message), { status }); }
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
function json(data, status = 200) { return Response.json(data, { status, headers }); }
async function readBody(request, limit) {
  const reader = request.body?.getReader();
  if (!reader) return {};
  let length = 0;
  let raw = '';
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      fail('Слишком большой запрос.', 413);
    }
    raw += decoder.decode(value, { stream: true });
  }
  try { return JSON.parse(raw + decoder.decode()) ?? {}; }
  catch { fail('Некорректный запрос.', 400); }
}
function lineupAt(room) { return room.revealAt + room.lineup.length * CARD_MS; }
function titleAt(room) { return lineupAt(room) + LINEUP_MS; }
function phase(room, now = Date.now()) {
  now = room.pausedAt ?? now;
  if (room.phase === 'story') return 'story';
  if (!room.revealAt) return room.phase;
  if (now >= titleAt(room)) return 'title';
  if (now >= lineupAt(room)) return 'lineup';
  return now >= room.revealAt ? 'credits' : 'crossing';
}
function view(room, auth) {
  const now = Date.now();
  const current = phase(room, room.pausedAt ?? now);
  const player = [...room.players.values()].find(p => p.token === auth);
  const host = auth === room.host;
  const isAdmin = Boolean(player && player.id === 'oleg');
  const state = {
    phase: current,
    run: room.run || 'legacy',
    isAdmin, paused: room.pausedAt != null,
    audio: room.audio || { enabled: true, volume: 0.45 },
    canStart: current === 'lobby' && room.players.has('oleg') && [...room.players.values()].every(p => p.answers.length === questions.length),
    names: Object.entries(cast).map(([id, name]) => ({
      id, name, taken: room.players.has(id),
      ...((host || isAdmin) && room.players.has(id) ? { ready: room.players.get(id).answers.length === questions.length } : {})
    })),
    player: player ? { id: player.id, name: cast[player.id], next: player.answers.length } : null
  };
  if (current === 'lobby' && player) state.question = questions[player.answers.length] ?? null;
  if (current === 'credits' && host) {
    const index = Math.floor(((room.pausedAt ?? now) - room.revealAt) / CARD_MS);
    const id = room.lineup[index];
    state.card = { id, name: cast[id], index, count: room.lineup.length };
  }
  if (['lineup', 'title'].includes(current) && host) state.lineup = Object.keys(cast).filter(id => room.lineup.includes(id)).map(id => ({ id, name: cast[id] }));
  if (current === 'title' && host) state.title = 'Тайна последней полуночи';
  if (current === 'title' && isAdmin) state.advance = {key:(room.run || 'legacy')+':title',label:'Продолжить',enabled:room.pausedAt == null};
  if (current === 'story') {
    const pos = storyPosition(room, cast, now);
    const interaction=pos.step.interaction;
    const responses=interaction==='tickets'?room.tickets:interaction==='sweets'?room.sweets:room.introductions;
    const answered = room.lineup.filter(id => Object.hasOwn(responses || {},id));
    const complete = answered.length === room.lineup.length;
    const key = (room.run || 'legacy') + ':' + pos.index;
    if (host) state.scene = {
      ...pos.step, key, elapsedMs:pos.elapsedMs, music:'calm',
      cast:room.lineup.map(id => ({id,name:cast[id]})),
      ...(pos.step.interactive ? {answered:answered.map(id=>cast[id]),total:room.lineup.length} : {})
    };
    if (player && interaction==='tickets') state.ticket = {key,captured:Boolean(room.tickets?.[player.id]),answered:answered.length,total:room.lineup.length};
    if (player && interaction==='sweets') state.sweetChoice = {key,options:sweets,choice:room.sweets?.[player.id]?.choice ?? null,answered:answered.length,total:room.lineup.length};
    if (player && interaction==='introductions') state.introduction = {
      key,question:'Как твой персонаж представится новым попутчикам?',options:introductions,
      choice:room.introductions?.[player.id] ?? null, answered:answered.length,total:room.lineup.length
    };
    if (player && pos.step.end) { state.result = score(player.answers); state.sceneEnded = true; }
    if (isAdmin) {
      const voicePlaying=pos.step.voice && pos.elapsedMs < pos.step.voice.durationMs;
      state.advance = {key,label:interaction==='introductions' ? 'Показать знакомство' : interaction==='sweets' ? 'Попробовать сладости' : 'Далее',
        enabled:room.pausedAt == null && !voicePlaying && !pos.step.durationMs && !pos.step.end && interaction!=='tickets' && (!pos.step.interactive || complete)};
      state.waiting = pos.step.interactive && !complete ? (interaction==='tickets'?'Ждём билеты: ':'Ждём ответы: ')+room.lineup.filter(id=>!answered.includes(id)).map(id=>cast[id]).join(', ') : voicePlaying ? 'Звучит реплика…' : pos.step.durationMs ? 'Сцена продолжается…' : null;
    }
  }
  return state;
}
export const OPENING_PATH = '/api/opening/rooms';
export async function serveOpening(request, env) {
  const url = new URL(request.url);
  const route = url.pathname.slice(OPENING_PATH.length);
  if (route === '' && request.method === 'POST') {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000);
      const room = env.OPENING_ROOM.get(env.OPENING_ROOM.idFromName(code));
      const created = await room.fetch('https://room.internal/create', { method: 'POST' });
      if (created.status === 409) continue;
      if (!created.ok) return created;
      const { token: hostToken } = await created.json();
      return json({ code, token: hostToken, links: [url.origin + '/?room=' + code] });
    }
    fail('Не удалось создать комнату. Попробуй ещё раз.', 503);
  }
  const match = route.match(/^\/(\d{6})(\/(?:join|answer|start|cross|remove|pause|resume|restart|sound|next|introduce|ticket|sweet))?$/);
  if (!match) fail('Страница не найдена.', 404);
  const [, code, action = '/state'] = match;
  const stub = env.OPENING_ROOM.get(env.OPENING_ROOM.idFromName(code));
  return stub.fetch(new Request('https://room.internal' + action, request));
}
export async function opening(request, env) {
  try { return await serveOpening(request, env); }
  catch (error) { return openingError(error); }
}
function openingError(error) {
  if (!error.status) console.error('Opening error', error);
  return json({ error: error.status ? error.message : 'Ошибка сервера.' }, error.status || 500);
}
export class OpeningRoom {
  constructor(ctx) { this.storage = ctx.storage; }
  async fetch(request) {
    try {
      const [, action] = new URL(request.url).pathname.split('/');
      const auth = request.headers.get('Authorization')?.replace(/^Bearer /, '');
      const method = request.method;
      if (action === 'create' && method === 'POST') {
        return await this.storage.transaction(async txn => {
          if (await txn.get('room')) fail('Этот код занят.');
          const room = { host: token(), players: new Map(), phase: 'lobby' };
          await txn.put('room', room);
          return json({ token: room.host }, 201);
        });
      }
      if (method === 'GET') {
        const room = await this.storage.get('room');
        if (!room) fail('Комната не найдена. Проверь код.', 404);
        if (action === 'state') return json(view(room, auth));
        fail('Страница не найдена.', 404);
      }
      if (method !== 'POST' || action === 'state') fail('Метод не поддерживается.', 405);
      const input = await readBody(request, 4096);
      return await this.storage.transaction(async txn => {
        const room = await txn.get('room');
        if (!room) fail('Комната не найдена. Проверь код.', 404);
        return applyAction(txn, room, action, auth, input);
      });
    } catch (error) { return openingError(error); }
  }
}
async function applyAction(txn, room, action, auth, input) {
  if (action === 'join') {
    if (phase(room) !== 'lobby') fail('Пролог уже начался.');
    if (!Object.hasOwn(cast, input.id)) fail('Выбери себя из списка.', 400);
    if (room.players.has(input.id)) fail('Это имя уже занято.');
    const player = { id: input.id, token: token(), answers: [] };
    room.players.set(input.id, player);
    await txn.put("room", room);
    return json({ token: player.token, state: view(room, player.token) });
  }
  if (action === 'answer') {
    const player = [...room.players.values()].find(p => p.token === auth);
    if (!player) fail('Сначала выбери себя.', 403);
    if (phase(room) !== 'lobby') fail('Пролог уже начался.');
    if (!Number.isInteger(input.choice) || input.choice < 0 || input.choice > 3 ||
      !Number.isInteger(input.index) || input.index < 0 || input.index >= questions.length) fail('Выбери один из вариантов.', 400);
    if (input.index < player.answers.length && player.answers[input.index] === input.choice) return json(view(room, auth));
    if (input.index !== player.answers.length) fail('Этот вопрос уже закрыт.');
    player.answers.push(input.choice);
    await txn.put("room", room);
    return json(view(room, auth));
  }
  if (['introduce','ticket','sweet'].includes(action)) {
    const player = [...room.players.values()].find(p => p.token === auth);
    if (!player || !room.lineup?.includes(player.id)) fail('Сначала присоединись к игре.',403);
    const pos=phase(room)==='story'?storyPosition(room,cast):null;
    const expected={introduce:'introductions',ticket:'tickets',sweet:'sweets'}[action];
    if (!pos || pos.step.interaction!==expected || room.pausedAt != null || input.key!==room.run+':'+pos.index) fail('Этот момент уже изменился.');
    if (action==='ticket') {
      if (input.captured!==true || !Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width<64 || input.height<64 || input.width>16000 || input.height>16000) fail('Сначала сфотографируй билет.',400);
      room.tickets ||= {}; room.tickets[player.id] ||= {capturedAt:Date.now()};
      // Only a capture receipt is stored; the photograph never leaves the phone.
      if(room.lineup.every(id=>room.tickets[id])) {room.storyIndex=pos.index+1;room.storyStartedAt=Date.now();}
      await txn.put('room',room);return json(view(room,auth));
    }
    if(action==='sweet') {
      if(!sweets.some(s=>s.id===input.choice)) fail('Выбери сладость.',400);
      room.sweets ||= {};
      if(room.sweets[player.id] && room.sweets[player.id].choice!==input.choice) fail('Сладость уже выбрана.');
      if(!room.sweets[player.id])room.sweets[player.id]={choice:input.choice,outcome:input.choice==='beans'?(crypto.getRandomValues(new Uint8Array(1))[0]%2?'caramel':'wool'):input.choice};
      await txn.put('room',room);return json(view(room,auth));
    }
    if (!Number.isInteger(input.choice) || input.choice < 0 || input.choice >= introductions.length) fail('Выбери одну реплику.',400);
    room.introductions ||= {};
    if (Object.hasOwn(room.introductions,player.id) && room.introductions[player.id] !== input.choice) fail('Реплика уже выбрана.');
    room.introductions[player.id] = input.choice;
    await txn.put('room',room); return json(view(room,auth));
  }
  const admin = room.players.get('oleg');
  if (!admin || !auth || auth !== admin.token) fail('Это действие недоступно.', 403);
  if (action === 'next') {
    if (room.pausedAt != null) fail('Сначала продолжи игру.');
    const current = view(room,auth);
    if (!current.advance?.enabled || input.key !== current.advance.key) fail('Этот момент уже изменился.');
    if (current.phase === 'title') { room.phase = 'story'; room.storyIndex = 0; room.introductions = {}; room.tickets={}; room.sweets={}; }
    else room.storyIndex = storyPosition(room,cast).index + 1;
    room.storyStartedAt = Date.now();
  } else if (action === 'sound') {
    if (typeof input.enabled !== 'boolean' || typeof input.volume !== 'number' || !Number.isFinite(input.volume) || input.volume < 0 || input.volume > 1) fail('Некорректная громкость.', 400);
    room.audio = { enabled: input.enabled, volume: input.volume };
  } else if (action === 'pause' && room.pausedAt == null && phase(room) !== 'lobby') {
    room.pausedAt = Date.now();
  } else if (action === 'resume' && room.pausedAt != null) {
    if (room.revealAt) room.revealAt += Date.now() - room.pausedAt;
    if (room.storyStartedAt != null) room.storyStartedAt += Date.now() - room.pausedAt;
    delete room.pausedAt;
  } else if (action === 'restart') {
    room.phase = 'lobby';
    delete room.revealAt; delete room.lineup; delete room.pausedAt;
    delete room.storyIndex; delete room.storyStartedAt; delete room.introductions; delete room.tickets; delete room.sweets;
    room.run = token();
    for (const p of room.players.values()) p.answers = [];
  } else if (action === 'remove' && phase(room) === 'lobby') {
    if (input.id === 'oleg') fail('Этого участника нельзя удалить.', 400);
    room.players.delete(input.id);
  } else if (action === 'start' && phase(room) === 'lobby') {
    const players = [...room.players.values()];
    if (players.length < 1 || !players.every(p => p.answers.length === questions.length)) fail('Нужен хотя бы один игрок, и все должны закончить опрос.');
    room.lineup = Object.keys(cast).filter(id => room.players.has(id));
    room.run = token(); room.phase = 'opening';
    room.revealAt = Date.now() + 1200;
  } else if (action === 'cross' && phase(room) === 'platform' && room.pausedAt == null) {
    room.revealAt = Date.now() + 1800;
  } else {
    fail('Эта команда сейчас недоступна.');
  }
  await txn.put("room", room);
  return json(view(room, auth));
}
