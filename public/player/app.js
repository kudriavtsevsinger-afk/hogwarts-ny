const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const roomFromQuery = params.get('room') || '';

let ws = null;
let state = null;
let roomCode = roomFromQuery;

function storageKey(code) {
  return `hogwarts_ny_playerId_${code}`;
}

function wsUrl(code) {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/hogwarts_ny/ws/${code}`;
}

function connect(code, name) {
  roomCode = code.toUpperCase();
  ws = new WebSocket(wsUrl(roomCode));
  ws.onopen = () => {
    const cachedId = localStorage.getItem(storageKey(roomCode));
    ws.send(JSON.stringify({ type: 'join', role: 'player', name, playerId: cachedId }));
  };
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'joined') {
      localStorage.setItem(storageKey(roomCode), msg.playerId);
    } else if (msg.type === 'state') {
      state = msg.state;
      render();
    }
  };
  ws.onclose = () => {
    app.innerHTML = `<div class="card"><p>Связь прервана. <button class="btn" onclick="location.reload()">Переподключиться</button></p></div>`;
  };
  ws.onerror = () => {};
}

function send(payload) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function renderLogin() {
  app.innerHTML = `
    <h1 class="gold">⚡ Хогвартс</h1>
    <p class="muted">Введите код комнаты и своё имя</p>
    <div class="card">
      <p><input type="text" id="codeInput" placeholder="КОД КОМНАТЫ" value="${roomFromQuery}" maxlength="8" /></p>
      <p><input type="text" id="nameInput" placeholder="Ваше имя" maxlength="24" /></p>
      <p><label class="muted"><input type="checkbox" id="adminInput" /> Я организатор этой игры (админ)</label></p>
      <p><button class="btn" id="joinBtn">Войти в игру</button></p>
    </div>
  `;
  document.getElementById('joinBtn').onclick = () => {
    const code = document.getElementById('codeInput').value.trim();
    const name = document.getElementById('nameInput').value.trim() || 'Без имени';
    const isAdmin = document.getElementById('adminInput').checked;
    if (!code) return;
    connect(code, name);
    window.__wantsAdmin = isAdmin;
  };
}

function renderLobby() {
  if (window.__wantsAdmin && state.me && !state.me.isAdmin) {
    send({ type: 'set_admin', value: true });
    window.__wantsAdmin = false;
  }
  const admin = state.me && state.me.isAdmin;
  app.innerHTML = `
    <h2 class="gold">Вы в игре${admin ? ' (администратор) 👑' : ''}</h2>
    <p class="muted">Ждём остальных игроков...</p>
    <div class="players-strip">${state.players
      .map((p) => `<div class="player-chip ${p.isAdmin ? 'admin' : ''}">${p.name}${p.isAdmin ? ' 👑' : ''}</div>`)
      .join('')}</div>
    ${admin ? `<p style="margin-top:20px"><button class="btn btn-admin" id="startAppearance">Начать выбор внешности</button></p>` : ''}
  `;
  if (admin) {
    document.getElementById('startAppearance').onclick = () => send({ type: 'advance', action: 'start_appearance' });
  }
}

let appearanceDraft = {};

function renderAppearance() {
  const admin = state.me && state.me.isAdmin;
  if (state.me && state.me.appearance) {
    const done = state.players.filter((p) => p.appearanceDone).length;
    app.innerHTML = `
      <h2 class="gold">Ваш облик готов!</h2>
      <div class="card">
        <h3 class="gold">${state.me.ability.name}</h3>
        <p>${state.me.ability.desc}</p>
      </div>
      <p class="muted">Готово игроков: ${done} из ${state.players.length}</p>
      ${admin ? `<p style="margin-top:16px"><button class="btn btn-admin" id="startStory">Начать историю</button></p>` : '<p class="muted">Ждём остальных и начала истории...</p>'}
    `;
    if (admin) {
      document.getElementById('startStory').onclick = () => send({ type: 'advance', action: 'start_story' });
    }
    return;
  }

  const cats = state.categories;
  app.innerHTML = `
    <h2 class="gold">Создайте своего персонажа</h2>
    <p class="muted">Выберите по одному варианту в каждой категории</p>
    <div id="catList"></div>
    <p><button class="btn" id="confirmAppearance" disabled>Готово</button></p>
  `;
  const list = document.getElementById('catList');
  cats.forEach((cat) => {
    const block = el(`<div class="card" style="margin-bottom:12px">
      <h3>${cat.label}</h3>
      <div class="category-grid">
        ${cat.options
          .map(
            (opt) =>
              `<button class="option-btn ${appearanceDraft[cat.id] === opt.id ? 'selected' : ''}" data-cat="${cat.id}" data-opt="${opt.id}">${opt.label}</button>`
          )
          .join('')}
      </div>
    </div>`);
    list.appendChild(block);
  });
  list.querySelectorAll('.option-btn').forEach((btn) => {
    btn.onclick = () => {
      appearanceDraft[btn.dataset.cat] = btn.dataset.opt;
      renderAppearance();
    };
  });
  const confirmBtn = document.getElementById('confirmAppearance');
  confirmBtn.disabled = Object.keys(appearanceDraft).length < cats.length;
  confirmBtn.onclick = () => send({ type: 'set_appearance', appearance: appearanceDraft });
}

function renderStory() {
  const step = state.step;
  const admin = state.me && state.me.isAdmin;
  if (!step) {
    app.innerHTML = `<p class="muted">Ожидание следующей сцены...</p>`;
    return;
  }

  let body = '';
  if (step.type === 'narrative') {
    body = `<div class="narrative">${step.text.map((t) => `<p>${t}</p>`).join('')}</div>`;
  } else if (step.type === 'vote_choice') {
    const myVote = state.scene.votes ? state.scene.votes[state.me.id] : null;
    body = `
      <div class="narrative"><p>${step.prompt}</p></div>
      ${step.options
        .map(
          (o) =>
            `<button class="btn ${myVote === o.id ? 'selected' : ''}" data-opt="${o.id}" ${myVote ? 'disabled' : ''}>${o.label}</button>`
        )
        .join('<br/>')}
      ${myVote ? `<p class="muted">Ваш голос учтён, ждём остальных...</p>` : ''}
    `;
  } else if (step.type === 'fragment_cipher') {
    const frags = state.myFragments || [];
    body = `
      <div class="narrative">${(step.intro || []).map((t) => `<p>${t}</p>`).join('')}</div>
      <div class="fragment-grid">
        ${frags
          .map((f) => `<div class="fragment-card"><div class="rune">${f.rune}</div><div class="muted">${f.label}</div><div class="digit">${f.digit}</div></div>`)
          .join('')}
      </div>
      ${
        state.scene.solved
          ? '<p class="gold">✨ Код принят! ✨</p>'
          : `<p><input type="text" id="codeInput" placeholder="Общий код" maxlength="12" /> <button class="btn" id="submitCode">Ввести</button></p>`
      }
      ${
        step.hintCost && !state.scene.hintUsed && !state.scene.solved
          ? `<p><button class="btn" id="hintBtn">Подсказка за ${step.hintCost} 🪙 (в казне ${state.sharedCoins})</button></p>`
          : ''
      }
      ${state.scene.hintText ? `<p class="muted">Подсказка: ${state.scene.hintText}</p>` : ''}
    `;
  }

  app.innerHTML = `
    <div class="coins">🪙 ${state.sharedCoins}</div>
    <h3 class="muted">${step.actTitle}</h3>
    <h2 class="gold">${step.title}</h2>
    ${body}
    ${admin ? `<p style="margin-top:24px"><button class="btn btn-admin" id="nextStep">Далее ➜</button></p>` : ''}
  `;

  if (step.type === 'vote_choice' && !((state.scene.votes || {})[state.me.id])) {
    app.querySelectorAll('[data-opt]').forEach((btn) => {
      btn.onclick = () => send({ type: 'vote', optionId: btn.dataset.opt });
    });
  }
  if (step.type === 'fragment_cipher' && !state.scene.solved) {
    document.getElementById('submitCode').onclick = () => {
      const code = document.getElementById('codeInput').value.trim();
      if (code) send({ type: 'submit_code', code });
    };
    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) hintBtn.onclick = () => send({ type: 'spend_hint' });
  }
  if (admin) {
    document.getElementById('nextStep').onclick = () => send({ type: 'advance', action: 'next_step' });
  }
}

function render() {
  if (!state) return;
  if (state.phase === 'lobby') return renderLobby();
  if (state.phase === 'appearance') return renderAppearance();
  if (state.phase === 'story') return renderStory();
  if (state.phase === 'finished') {
    app.innerHTML = `<h1 class="gold">🎄 С Новым годом! 🎄</h1><p>Спасибо, что были частью этой истории.</p>`;
  }
}

function el(html) {
  const div = document.createElement('div');
  div.innerHTML = html.trim();
  return div.firstChild;
}

renderLogin();
