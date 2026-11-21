import { questions, score } from './quiz.mjs';

const cast = { oleg: 'Олег', sima: 'Сима', masha: 'Маша', vanya: 'Ваня', liza: 'Лиза', amina: 'Амина' };
const CARD_MS = 2600;
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
function creditsEnd(room) { return room.revealAt + room.lineup.length * CARD_MS + TITLE_MS; }
function phase(room, now = Date.now()) {
  if (!room.revealAt) return room.phase;
  if (now >= creditsEnd(room)) return 'train';
  if (now >= room.revealAt + room.lineup.length * CARD_MS) return 'title';
  return now >= room.revealAt ? 'credits' : 'crossing';
}
function view(room, auth) {
  const now = Date.now();
  const current = phase(room, now);
  const player = [...room.players.values()].find(p => p.token === auth);
  const host = auth === room.host;
  const state = {
    phase: current,
    names: Object.entries(cast).map(([id, name]) => ({
      id, name, taken: room.players.has(id),
      ...(host && room.players.has(id) ? { ready: room.players.get(id).answers.length === questions.length } : {})
    })),
    player: player ? { id: player.id, name: cast[player.id], next: player.answers.length } : null
  };
  if (current === 'lobby' && player) state.question = questions[player.answers.length] ?? null;
  if (current === 'credits' && host) {
    const index = Math.floor((now - room.revealAt) / CARD_MS);
    const id = room.lineup[index];
    state.card = { id, name: cast[id], index, count: room.lineup.length };
  }
  if ((current === 'title' && host) || current === 'train') state.title = 'Хогвартс. Тайна последней полуночи';
  if (current === 'train' && player) state.result = score(player.answers);
  if (current === 'train' && host) state.lineup = room.lineup.map(id => ({ id, name: cast[id] }));
  return state;
}
export const OPENING_PATH = '/hogwarts_ny/start';
const paths = new Map([
  ['', 'index.html'], ['/', 'index.html'], ['/play', 'index.html'], ['/play/', 'index.html'],
  ['/qrcode.min.js', 'qrcode.min.js'], ['/app.js', 'app.js'], ['/style.css', 'style.css'], ['/art/station.webp', 'art/station.webp']
]);
export async function serveOpening(request, env) {
  const url = new URL(request.url);
  const route = url.pathname.slice(OPENING_PATH.length);
  if (request.method === 'GET' && paths.has(route)) {
    url.pathname = '/opening/' + paths.get(route);
    return env.AVATAR_ASSETS.fetch(new Request(url, request));
  }
  if (route === '/api/rooms' && request.method === 'POST') {
    const portraits = await readBody(request, 1500000);
    if (!Object.keys(cast).every(id => typeof portraits[id] === 'string' &&
        portraits[id].length <= 120000 && /^UklGR[A-Za-z0-9+/=]+$/.test(portraits[id]))) {
      fail('Выбери файл с комплектом портретов.', 400);
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000);
      const room = env.OPENING_ROOM.get(env.OPENING_ROOM.idFromName(code));
      const created = await room.fetch('https://room.internal/create', {
        method: 'POST', body: JSON.stringify(Object.fromEntries(Object.keys(cast).map(id => [id, portraits[id]])))
      });
      if (created.status === 409) continue;
      if (!created.ok) return created;
      const { token: hostToken } = await created.json();
      return json({ code, token: hostToken, links: [url.origin + OPENING_PATH + '/play?room=' + code] });
    }
    fail('Не удалось создать комнату. Попробуй ещё раз.', 503);
  }
  const match = route.match(/^\/api\/rooms\/(\d{6})(\/(?:join|answer|start|cross|remove|portrait\/[a-z]+))?$/);
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
      const [, action, target] = new URL(request.url).pathname.split('/');
      const auth = request.headers.get('Authorization')?.replace(/^Bearer /, '');
      const method = request.method;
      if (action === 'create' && method === 'POST') {
        const portraits = await readBody(request, 1500000);
        return await this.storage.transaction(async txn => {
          if (await txn.get('room')) fail('Этот код занят.');
          const room = { host: token(), players: new Map(), phase: 'lobby' };
          await txn.put({ room, ...Object.fromEntries(Object.entries(portraits).map(([id, data]) => ['portrait:' + id, data])) });
          return json({ token: room.host }, 201);
        });
      }
      if (method === 'GET') {
        const room = await this.storage.get('room');
        if (!room) fail('Комната не найдена. Проверь код.', 404);
        if (action === 'state') return json(view(room, auth));
        if (action !== 'portrait') fail('Страница не найдена.', 404);
        const current = phase(room);
        const isHost = auth === room.host;
        const isCurrentCard = isHost && current === 'credits' && view(room, auth).card?.id === target;
        const canSee = isCurrentCard || (current === 'train' && (isHost || (auth && room.players.get(target)?.token === auth)));
        if (!canSee || !room.lineup?.includes(target)) fail('Портрет пока скрыт.', 403);
        const portrait = await this.storage.get('portrait:' + target);
        return new Response(Uint8Array.from(atob(portrait), c => c.charCodeAt(0)), {
          headers: { ...headers, 'Content-Type': 'image/webp' }
        });
      }
      if (method !== 'POST' || action === 'state' || action === 'portrait') fail('Метод не поддерживается.', 405);
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
  if (auth !== room.host) fail('Команду может выполнить только ведущий.', 403);
  if (action === 'remove' && phase(room) === 'lobby') {
    room.players.delete(input.id);
  } else if (action === 'start' && phase(room) === 'lobby') {
    const players = [...room.players.values()];
    if (players.length < 3 || !players.every(p => p.answers.length === questions.length)) fail('Нужны минимум три игрока и все должны закончить опрос.');
    room.lineup = players.map(p => p.id);
    room.phase = 'platform';
  } else if (action === 'cross' && phase(room) === 'platform') {
    room.revealAt = Date.now() + 1800;
  } else {
    fail('Эта команда сейчас недоступна.');
  }
  await txn.put("room", room);
  return json(view(room, auth));
}
