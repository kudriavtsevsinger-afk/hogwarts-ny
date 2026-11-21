import { OPENING_PATH, opening } from "./opening/worker.mjs";
export { OpeningRoom } from "./opening/worker.mjs";
import game from './hogwarts-worker.mjs';
export { GameRoom } from './hogwarts-worker.mjs';

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.pathname === OPENING_PATH || url.pathname.startsWith(OPENING_PATH + "/")) {
      return opening(request, env);
    }
    if (["/app.js", "/style.css", "/qrcode.min.js", "/sound.js"].includes(url.pathname)) {
      url.pathname = "/opening" + url.pathname;
      return env.AVATAR_ASSETS.fetch(new Request(url, request));
    }
    if (url.pathname.startsWith("/portraits/")) {
      return env.AVATAR_ASSETS.fetch(request);
    }
    if (["/art/", "/audio/", "/fonts/"].some(prefix => url.pathname.startsWith(prefix))) {
      url.pathname = "/opening" + url.pathname;
      return env.AVATAR_ASSETS.fetch(new Request(url, request));
    }
    if (request.method === "GET" && !url.pathname.startsWith("/api/")) {
      url.pathname = "/opening/index.html";
      return env.AVATAR_ASSETS.fetch(new Request(url, request));
    }
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
