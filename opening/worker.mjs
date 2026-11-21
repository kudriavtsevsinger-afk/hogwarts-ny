import { questions, score } from './quiz.mjs';

const cast = { oleg: 'Олег', sima: 'Сима', masha: 'Маша', vanya: 'Ваня', liza: 'Лиза', amina: 'Амина' };
const CARD_MS = 2600;
const LINEUP_MS = 3600;
const TITLE_MS = 3900;
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
function creditsEnd(room) { return titleAt(room) + TITLE_MS; }
function phase(room, now = Date.now()) {
  now = room.pausedAt ?? now;
  if (!room.revealAt) return room.phase;
  if (now >= creditsEnd(room)) return 'train';
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
  if ((current === 'title' && host) || current === 'train') state.title = 'Тайна последней полуночи';
  if (current === 'train' && player) state.result = score(player.answers);
  if (current === 'train' && host) state.lineup = room.lineup.map(id => ({ id, name: cast[id] }));
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
  const match = route.match(/^\/(\d{6})(\/(?:join|answer|start|cross|remove|pause|resume|restart|sound))?$/);
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
  const admin = room.players.get('oleg');
  if (!admin || !auth || auth !== admin.token) fail('Это действие недоступно.', 403);
  if (action === 'sound') {
    if (typeof input.enabled !== 'boolean' || typeof input.volume !== 'number' || !Number.isFinite(input.volume) || input.volume < 0 || input.volume > 1) fail('Некорректная громкость.', 400);
    room.audio = { enabled: input.enabled, volume: input.volume };
  } else if (action === 'pause' && room.pausedAt == null && phase(room) !== 'lobby') {
    room.pausedAt = Date.now();
  } else if (action === 'resume' && room.pausedAt != null) {
    if (room.revealAt) room.revealAt += Date.now() - room.pausedAt;
    delete room.pausedAt;
  } else if (action === 'restart') {
    room.phase = 'lobby';
    delete room.revealAt; delete room.lineup; delete room.pausedAt;
    for (const p of room.players.values()) p.answers = [];
  } else if (action === 'remove' && phase(room) === 'lobby') {
    if (input.id === 'oleg') fail('Этого участника нельзя удалить.', 400);
    room.players.delete(input.id);
  } else if (action === 'start' && phase(room) === 'lobby') {
    const players = [...room.players.values()];
    if (players.length < 1 || !players.every(p => p.answers.length === questions.length)) fail('Нужен хотя бы один игрок, и все должны закончить опрос.');
    room.lineup = players.map(p => p.id);
    room.phase = 'platform';
  } else if (action === 'cross' && phase(room) === 'platform' && room.pausedAt == null) {
    room.revealAt = Date.now() + 1800;
  } else {
    fail('Эта команда сейчас недоступна.');
  }
  await txn.put("room", room);
  return json(view(room, auth));
}
