/* Sound is emitted by the shared screen only. Library assets load on demand. */
window.GameSound = (() => {
  const music = new Audio(); music.loop = true; music.preload = 'none';
  const gate = document.querySelector('#sound-gate');
  let unlocked = false, ctx, current = null, desired = null, paused = false, level = .45;
  let previousPhase, fade, transition, generation = 0;
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
  async function effect(id) {
    if (!unlocked || paused || !level || !ctx) return;
    try {
      if (!buffers.has(id)) buffers.set(id, fetch('/audio/' + id + '.ogg').then(r => { if (!r.ok) throw Error(); return r.arrayBuffer(); }).then(b => ctx.decodeAudioData(b)));
      const buffer = await buffers.get(id);
      if (paused || !level) return;
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = buffer; gain.gain.value = level * .65;
      source.connect(gain).connect(ctx.destination); source.start();
    } catch { buffers.delete(id); }
  }
  function reconcile() {
    clearTimeout(transition); generation++;
    if (!unlocked) return;
    if (ctx) { if (paused || !level) void ctx.suspend(); else void ctx.resume(); }
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
    void ctx.resume();
    // This user gesture unlocks this media element for later remote cues.
    music.src = '/audio/' + (desired || 'intro') + '.ogg'; music.volume = 0;
    music.play().then(() => {
      unlocked = true; current = desired || 'intro'; gate.hidden = true;
      if (!desired || paused || !level) music.pause(); else volume(level);
    }).catch(() => { gate.querySelector('p').textContent = 'Не удалось включить звук. Нажми ещё раз.'; });
  };
  return {
    init(display) { gate.hidden = !display; },
    sync(state) {
      const track = ({platform:'tension',crossing:'tension',credits:'intro',lineup:'intro',title:'intro',train:'calm'})[state.phase] || null;
      const nextLevel = state.audio?.enabled === false ? 0 : (state.audio?.volume ?? .45);
      const changed = track !== desired || Boolean(state.paused) !== paused || level !== nextLevel;
      desired = track; paused = Boolean(state.paused); level = nextLevel;
      if (changed) reconcile();
      if (previousPhase !== state.phase) {
        const cue = {crossing:'magic', title:'unlock', train:'success'}[state.phase];
        if (cue) void effect(cue);
        previousPhase = state.phase;
      }
    },
    effect
  };
})();
