import { rollAbility, APPEARANCE_CATEGORIES, ABILITIES } from './content/appearance.js';
import { flattenStory } from './content/story.js';

const STEPS = flattenStory();

function newId() {
  return crypto.randomUUID();
}

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.state = null;
  }

  async loadState() {
    if (this.state) return this.state;
    const saved = await this.ctx.storage.get('state');
    this.state = saved || this.defaultState();
    return this.state;
  }

  defaultState() {
    return {
      phase: 'lobby', // lobby -> appearance -> story -> finished
      players: {},
      sharedCoins: 0,
      stepIndex: -1, // -1 = ещё не началось (экран лобби)
      scene: {}, // данные текущей сцены: fragments assignment, votes, hint, solved
      createdAt: Date.now(),
    };
  }

  async saveState() {
    await this.ctx.storage.put('state', this.state);
  }

  publicState() {
    const s = this.state;
    const step = s.stepIndex >= 0 && s.stepIndex < STEPS.length ? STEPS[s.stepIndex] : null;
    return {
      phase: s.phase,
      players: Object.values(s.players).map((p) => ({
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        connected: p.connected,
        appearanceDone: !!p.appearance,
        ability: p.ability ? { name: p.ability.name, desc: p.ability.desc } : null,
      })),
      sharedCoins: s.sharedCoins,
      stepIndex: s.stepIndex,
      totalSteps: STEPS.length,
      step: step
        ? {
            id: step.id,
            type: step.type,
            title: step.title,
            actTitle: step.actTitle,
            text: step.text,
            intro: step.intro,
            prompt: step.prompt,
            options: step.options,
            hintCost: step.hintCost,
          }
        : null,
      scene: s.scene,
      categories: APPEARANCE_CATEGORIES,
    };
  }

  // Персональная проекция для конкретного игрока: добавляет его фрагменты шифра (если есть)
  playerView(playerId) {
    const base = this.publicState();
    const s = this.state;
    const step = s.stepIndex >= 0 && s.stepIndex < STEPS.length ? STEPS[s.stepIndex] : null;
    base.me = s.players[playerId]
      ? {
          id: playerId,
          name: s.players[playerId].name,
          isAdmin: s.players[playerId].isAdmin,
          appearance: s.players[playerId].appearance,
          ability: s.players[playerId].ability,
        }
      : null;
    if (step && step.type === 'fragment_cipher' && s.scene.assignments) {
      const myFragIdx = s.scene.assignments[playerId] || [];
      base.myFragments = myFragIdx.map((i) => step.fragments[i]);
    }
    return base;
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    await this.loadState();
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null, role: 'unknown' });
    return new Response(null, { status: 101, webSocket: client });
  }

  send(ws, data) {
    try {
      ws.send(JSON.stringify(data));
    } catch (e) {
      // соединение могло уже закрыться
    }
  }

  broadcast() {
    for (const ws of this.ctx.getWebSockets()) {
      const { playerId, role } = ws.deserializeAttachment() || {};
      if (role === 'player' && playerId) {
        this.send(ws, { type: 'state', state: this.playerView(playerId) });
      } else {
        this.send(ws, { type: 'state', state: this.publicState() });
      }
    }
  }

  async webSocketMessage(ws, message) {
    await this.loadState();
    let msg;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    const attachment = ws.deserializeAttachment() || {};

    switch (msg.type) {
      case 'join':
        await this.handleJoin(ws, attachment, msg);
        break;
      case 'set_admin':
        this.handleSetAdmin(attachment.playerId, msg.value);
        break;
      case 'set_appearance':
        this.handleAppearance(attachment.playerId, msg.appearance);
        break;
      case 'advance':
        this.handleAdvance(attachment.playerId, msg.action);
        break;
      case 'vote':
        this.handleVote(attachment.playerId, msg.optionId);
        break;
      case 'submit_code':
        this.handleSubmitCode(attachment.playerId, msg.code);
        break;
      case 'spend_hint':
        this.handleSpendHint(attachment.playerId);
        break;
      default:
        break;
    }

    await this.saveState();
    this.broadcast();
  }

  async webSocketClose(ws) {
    await this.loadState();
    const { playerId } = ws.deserializeAttachment() || {};
    if (playerId && this.state.players[playerId]) {
      this.state.players[playerId].connected = false;
      await this.saveState();
      this.broadcast();
    }
  }

  // ---- handlers ----

  async handleJoin(ws, attachment, msg) {
    if (msg.role === 'host') {
      ws.serializeAttachment({ playerId: null, role: 'host' });
      return;
    }
    // role === 'player'
    let playerId = attachment.playerId || msg.playerId;
    if (!playerId || !this.state.players[playerId]) {
      playerId = newId();
      this.state.players[playerId] = {
        id: playerId,
        name: (msg.name || 'Без имени').slice(0, 24),
        isAdmin: false,
        appearance: null,
        ability: null,
        connected: true,
      };
    } else {
      this.state.players[playerId].connected = true;
      if (msg.name) this.state.players[playerId].name = msg.name.slice(0, 24);
    }
    ws.serializeAttachment({ playerId, role: 'player' });
    this.send(ws, { type: 'joined', playerId });
  }

  handleSetAdmin(playerId, value) {
    if (!playerId || !this.state.players[playerId]) return;
    if (value) {
      // ровно один администратор в комнате
      for (const p of Object.values(this.state.players)) p.isAdmin = false;
      this.state.players[playerId].isAdmin = true;
    } else {
      this.state.players[playerId].isAdmin = false;
    }
  }

  handleAppearance(playerId, appearance) {
    if (!playerId || !this.state.players[playerId]) return;
    const player = this.state.players[playerId];
    player.appearance = appearance;
    player.ability = rollAbility(appearance);

    const connectedIds = Object.values(this.state.players)
      .filter((p) => p.connected)
      .map((p) => p.id);
    const allDone = connectedIds.length > 0 && connectedIds.every((id) => this.state.players[id].appearance);
    if (allDone && this.state.phase === 'appearance') {
      // ждём явной команды админа "advance", чтобы начать пролог — не переключаем фазу автоматически
    }
  }

  isAdmin(playerId) {
    return playerId && this.state.players[playerId] && this.state.players[playerId].isAdmin;
  }

  handleAdvance(playerId, action) {
    if (!this.isAdmin(playerId)) return;
    if (action === 'start_appearance') {
      this.state.phase = 'appearance';
    } else if (action === 'start_story') {
      this.state.phase = 'story';
      this.state.stepIndex = 0;
      this.prepareStep();
    } else if (action === 'next_step') {
      if (this.state.stepIndex < STEPS.length - 1) {
        this.state.stepIndex += 1;
        this.prepareStep();
      } else {
        this.state.phase = 'finished';
      }
    }
  }

  // Готовит эпемерные данные сцены (голоса/раздача фрагментов) при входе в новый шаг
  prepareStep() {
    const step = STEPS[this.state.stepIndex];
    this.state.scene = { solved: false, hintUsed: false };
    if (!step) return;
    if (step.type === 'vote_choice') {
      this.state.scene.votes = {};
    }
    if (step.type === 'fragment_cipher') {
      const connected = Object.values(this.state.players).filter((p) => p.connected);
      const assignments = {};
      connected.forEach((p) => (assignments[p.id] = []));
      // раздаём фрагменты по кругу — работает для любого числа игроков (3..6+)
      step.fragments.forEach((frag, i) => {
        const player = connected[i % connected.length];
        if (player) assignments[player.id].push(i);
      });
      this.state.scene.assignments = assignments;
    }
  }

  currentStep() {
    const i = this.state.stepIndex;
    return i >= 0 && i < STEPS.length ? STEPS[i] : null;
  }

  handleVote(playerId, optionId) {
    const step = this.currentStep();
    if (!step || step.type !== 'vote_choice') return;
    if (!this.state.players[playerId]) return;
    if (!this.state.scene.votes) this.state.scene.votes = {};
    this.state.scene.votes[playerId] = optionId;

    const connectedIds = Object.values(this.state.players).filter((p) => p.connected).map((p) => p.id);
    const votedCount = Object.keys(this.state.scene.votes).length;
    if (votedCount >= connectedIds.length && !this.state.scene.solved) {
      // считаем победителя голосования
      const tally = {};
      for (const v of Object.values(this.state.scene.votes)) tally[v] = (tally[v] || 0) + 1;
      let winner = null;
      let max = -1;
      for (const [opt, count] of Object.entries(tally)) {
        if (count > max) {
          max = count;
          winner = opt;
        }
      }
      this.state.scene.solved = true;
      this.state.scene.winner = winner;
      if (step.coinsReward) this.state.sharedCoins += step.coinsReward;
    }
  }

  handleSubmitCode(playerId, code) {
    const step = this.currentStep();
    if (!step || step.type !== 'fragment_cipher') return;
    if (this.state.scene.solved) return;
    this.state.scene.lastAttempt = code;
    if (String(code).trim() === String(step.code)) {
      this.state.scene.solved = true;
      if (step.coinsReward) this.state.sharedCoins += step.coinsReward;
    } else {
      this.state.scene.wrongAttempts = (this.state.scene.wrongAttempts || 0) + 1;
    }
  }

  handleSpendHint(playerId) {
    const step = this.currentStep();
    if (!step || !step.hintCost || !step.hintText) return;
    if (this.state.scene.hintUsed) return;
    if (this.state.sharedCoins < step.hintCost) return;
    this.state.sharedCoins -= step.hintCost;
    this.state.scene.hintUsed = true;
    this.state.scene.hintText = step.hintText;
  }
}
