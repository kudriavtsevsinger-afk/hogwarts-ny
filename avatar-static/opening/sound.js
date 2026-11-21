/* Sound is emitted by the shared screen only. Library assets load on demand. */
window.GameSound = (() => {
  const music = new Audio(); music.loop = true; music.preload = 'none';
  const gate = document.querySelector('#sound-gate');
  let unlocked = false, ctx, master, current = null, desired = null, paused = false, level = .45;
  let cueKey, latestState, fade, transition, generation = 0;
  const playingEffects = new Set();
  let pendingCue, playedCue;
  const buffers = new Map();
  function volume(to) {
    clearInterval(fade);
    const from = music.volume, start = performance.now();
    fade = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / 500);
      music.volume = Math.max(0, Math.min(1, from + (to - from) * t));
      if (t === 1) clearInterval(fade);
    }, 25);
  }
  function play() {
    if (!unlocked || paused || !current || !level) return;
    music.play().then(() => volume(level)).catch(() => { gate.hidden = false; });
  }
  function stopEffects() {
    for (const source of playingEffects) { try { source.stop(); } catch {} }
    playingEffects.clear();
  }
  async function effect(id, scene = {}) {
    if (!unlocked || paused || !level || !ctx) return;
    const key = cueKey;
    if (pendingCue === key || playedCue === key) return;
    pendingCue = key;
    try {
      if (!buffers.has(id)) buffers.set(id, fetch('/audio/' + id + '.ogg').then(r => { if (!r.ok) throw Error(); return r.arrayBuffer(); }).then(b => ctx.decodeAudioData(b)));
      const buffer = await buffers.get(id);
      if (key !== cueKey || paused || !level) return;
      const offset = (latestState?.scene?.elapsedMs || 0) / 1000;
      const end = Math.min(buffer.duration, scene.cueDuration || buffer.duration);
      if (offset >= end) return;
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = buffer;
      const duration = end - offset, now = ctx.currentTime;
      gain.gain.setValueAtTime(.65, now);
      gain.gain.setValueAtTime(.65, now + Math.max(0, duration - .5));
      gain.gain.linearRampToValueAtTime(0, now + duration);
      source.connect(gain).connect(master);
      source.onended = () => { playingEffects.delete(source); source.disconnect(); gain.disconnect(); };
      playingEffects.add(source); source.start(0, offset, duration); playedCue = key;
    } catch { buffers.delete(id); } finally { if (pendingCue === key) pendingCue = null; }
  }
  function reconcile() {
    clearTimeout(transition); generation++;
    if (!unlocked) return;
    if (ctx) { master.gain.setTargetAtTime(level, ctx.currentTime, .08); if (paused) void ctx.suspend(); else void ctx.resume(); }
    if (paused || !level || !desired) { volume(0); music.pause(); return; }
    if (current === desired) { play(); return; }
    const job = generation; volume(0);
    transition = setTimeout(() => {
      if (job !== generation) return;
      music.pause(); current = desired; music.src = '/audio/' + current + '.ogg'; music.volume = 0; play();
    }, 350);
  }
  gate.querySelector('button').onclick = () => {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (!master) { master=ctx.createGain(); master.connect(ctx.destination); }
    master.gain.value=level;
    void ctx.resume();
    // This user gesture unlocks this media element for later remote cues.
    music.src = '/audio/' + (desired || 'intro') + '.ogg'; music.volume = 0;
    music.play().then(() => {
      unlocked = true; current = desired || 'intro'; gate.hidden = true;
      if (!desired || paused || !level) music.pause(); else volume(level);
      if (latestState?.scene?.cue) void effect(latestState.scene.cue, latestState.scene);
    }).catch(() => { gate.querySelector('p').textContent = 'Не удалось включить звук. Нажми ещё раз.'; });
  };
  return {
    init(display) { gate.hidden = !display; },
    sync(state) {
      latestState = state;
      const track = state.phase === 'story' ? state.scene?.music : ({crossing:'intro',credits:'intro',lineup:'intro',title:'intro'})[state.phase] || null;
      const nextLevel = state.audio?.enabled === false ? 0 : (state.audio?.volume ?? .45);
      const changed = track !== desired || Boolean(state.paused) !== paused || level !== nextLevel;
      desired = track; paused = Boolean(state.paused); level = nextLevel;
      if (changed) reconcile();
      const nextCueKey = state.scene?.key || state.run + ':' + state.phase;
      if (cueKey !== nextCueKey) {
        const carry = state.scene?.id === 'steam-transition' && cueKey === state.run + ':' + (Number(state.scene.key.split(':').pop()) - 1);
        cueKey = nextCueKey;
        if (!carry) stopEffects();
        }
      if (state.scene?.cue) void effect(state.scene.cue, state.scene);
    },
    effect
  };
})();
