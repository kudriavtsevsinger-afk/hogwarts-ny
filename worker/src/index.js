import { GameRoom } from './room.js';

export { GameRoom };

// В проде перед Worker'ом стоит правило kudriavtsev-on.ru/hogwarts_ny* —
// поэтому отрезаем префикс, если он есть, и код одинаково работает
// локально (wrangler dev, без префикса) и в проде.
const PREFIX = '/hogwarts_ny';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;
    if (path.startsWith(PREFIX)) {
      path = path.slice(PREFIX.length) || '/';
    }

    if (path.startsWith('/ws/')) {
      const roomCode = path.slice('/ws/'.length).toUpperCase();
      if (!/^[A-Z0-9]{4,8}$/.test(roomCode)) {
        return new Response('bad room code', { status: 400 });
      }
      const id = env.GAME_ROOM.idFromName(roomCode);
      const stub = env.GAME_ROOM.get(id);
      return stub.fetch(request);
    }

    if (path === '/api/new-room' && request.method === 'POST') {
      return Response.json({ code: generateRoomCode() });
    }

    if (path === '/' || path === '') {
      return serveAsset(env, request, '/host/index.html');
    }
    if (path === '/player' || path === '/player/') {
      return serveAsset(env, request, '/player/index.html');
    }

    return serveAsset(env, request, path);
  },
};

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

async function serveAsset(env, request, pathname) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = pathname;
  const assetReq = new Request(assetUrl.toString(), request);
  return env.ASSETS.fetch(assetReq);
}
