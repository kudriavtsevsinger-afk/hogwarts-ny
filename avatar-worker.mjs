import game from './hogwarts-worker.mjs';
export { GameRoom } from './hogwarts-worker.mjs';

export default {
  fetch(request, env, context) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/hogwarts_ny(?=\/)/, '');
    if (path === '/prologue.html' || path === '/assets/prologue.js' || path === '/assets/player.js' || path === '/assets/editor-avatar.js' || path.startsWith('/assets/real-avatar/')) {
      url.pathname = path;
      return env.AVATAR_ASSETS.fetch(new Request(url, request));
    }
    return game.fetch(request, env, context);
  }
};
