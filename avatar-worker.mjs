import game from './hogwarts-worker.mjs';
export { GameRoom } from './hogwarts-worker.mjs';

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/hogwarts_ny(?=\/)/, '');
    if (path === '/prologue.html' || path === '/assets/prologue.js' || path === '/assets/player.js' || path === '/assets/editor-avatar.js' || path.startsWith('/assets/real-avatar/')) {
      url.pathname = path;
      return env.AVATAR_ASSETS.fetch(new Request(url, request));
    }
    if (request.method === 'PATCH' && /^\/api\/rooms\/[A-Z0-9]+\/players\/[^/]+$/.test(path)) {
      const body = await request.clone().json().catch(() => null);
      if (body?.character && typeof body.character === 'object' && !Array.isArray(body.character)) {
        body.character.house = 'gryffindor';
        const headers = new Headers(request.headers);
        headers.delete('content-length');
        request = new Request(request, { headers, body: JSON.stringify(body) });
      }
    }
    return game.fetch(request, env, context);
  }
};
