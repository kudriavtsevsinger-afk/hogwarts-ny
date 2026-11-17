const app = document.getElementById('app');

function el(html) {
  const div = document.createElement('div');
  div.innerHTML = html.trim();
  return div.firstChild;
}

async function createRoom() {
  const res = await fetch('/hogwarts_ny/api/new-room', { method: 'POST' });
  const data = await res.json();
  return data.code;
}

function wsUrl(code) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/hogwarts_ny/ws/${code}`;
}

function playerLink(code) {
  return `${location.origin}/hogwarts_ny/player?room=${code}`;
}

let currentState = null;

function renderPlayers(players) {
  return `<div class="players-strip">${players
    .map(
      (p) =>
        `<div class="player-chip ${p.isAdmin ? 'admin' : ''} ${p.connected ? '' : 'offline'}">
          ${p.name}${p.isAdmin ? ' 👑' : ''}${p.ability ? ' · ' + p.ability.name : ''}
        </div>`
    )
    .join('')}</div>`;
}

function render(state, code) {
  currentState = state;

  if (state.phase === 'lobby') {
    app.innerHTML = `
      <h1 class="gold">⚡ Хогвартс. Новогодняя ночь</h1>
      <p class="muted">Отсканируйте QR-код с телефона, чтобы войти в игру</p>
      <div class="qr-box" id="qrbox"></div>
      <p class="muted">или откройте вручную и введите код комнаты:</p>
      <div class="room-code">${code}</div>
      ${renderPlayers(state.players)}
    `;
    const qrEl = document.getElementById('qrbox');
    const qr = qrcode(0, 'M');
    qr.addData(playerLink(code));
    qr.make();
    qrEl.innerHTML = qr.createImgTag(6, 4);
    return;
  }

  if (state.phase === 'appearance') {
    const done = state.players.filter((p) => p.appearanceDone).length;
    app.innerHTML = `
      <h1 class="gold">Выбор облика</h1>
      <p>Каждый игрок создаёт своего персонажа на телефоне — лицо, причёску и одежду.</p>
      <p class="muted">Готово: ${done} из ${state.players.length}</p>
      ${renderPlayers(state.players)}
    `;
    return;
  }

  if (state.phase === 'story') {
    const step = state.step;
    if (!step) {
      app.innerHTML = `<h2 class="muted">Ожидание...</h2>`;
      return;
    }
    let body = '';
    if (step.type === 'narrative') {
      body = `<div class="narrative">${step.text.map((t) => `<p>${t}</p>`).join('')}</div>`;
    } else if (step.type === 'vote_choice') {
      const votes = state.scene.votes || {};
      const votedCount = Object.keys(votes).length;
      body = `
        <div class="narrative"><p>${step.prompt}</p></div>
        <p class="muted">Проголосовало: ${votedCount} из ${state.players.length}</p>
        ${state.scene.solved ? `<p class="gold">Выбор сделан!</p>` : ''}
      `;
    } else if (step.type === 'fragment_cipher') {
      body = `
        <div class="narrative">${(step.intro || []).map((t) => `<p>${t}</p>`).join('')}</div>
        ${state.scene.solved ? '<p class="gold">✨ Звезда зажжена! ✨</p>' : '<p class="muted">Соберите код сообща и введите его с любого телефона.</p>'}
        ${state.scene.hintText ? `<p class="muted">Подсказка: ${state.scene.hintText}</p>` : ''}
      `;
    }
    app.innerHTML = `
      <div class="coins">🪙 ${state.sharedCoins}</div>
      <h3 class="muted">${step.actTitle}</h3>
      <h1 class="gold">${step.title}</h1>
      ${body}
      ${renderPlayers(state.players)}
    `;
    return;
  }

  if (state.phase === 'finished') {
    app.innerHTML = `<h1 class="gold">🎄 С Новым годом, волшебники! 🎄</h1>`;
  }
}

async function main() {
  app.innerHTML = `<h2 class="muted">Создаём комнату...</h2>`;
  const code = await createRoom();
  const ws = new WebSocket(wsUrl(code));
  ws.onopen = () => ws.send(JSON.stringify({ type: 'join', role: 'host' }));
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'state') render(msg.state, code);
  };
  ws.onclose = () => {
    app.innerHTML += `<p class="muted">Соединение потеряно, обновите страницу</p>`;
  };
}

main();
