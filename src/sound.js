// ============================================================
// sound.js — Web Audio API: viento, grillos, pájaros, ambiente
// ============================================================

let ctx = null;
let masterGain = null;
let started = false;

function ensureCtx() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.0;
  masterGain.connect(ctx.destination);
}

export function isPlaying() {
  return started;
}

export function startAmbient() {
  if (started) return;
  ensureCtx();
  if (ctx.state === 'suspended') ctx.resume();
  started = true;

  // ============== VIENTO ==============
  // Brown noise + low-pass + LFO on filter freq
  const bufSize = ctx.sampleRate * 4;
  const windBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = windBuf.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }
  const windSrc = ctx.createBufferSource();
  windSrc.buffer = windBuf;
  windSrc.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'lowpass';
  windFilter.frequency.value = 400;
  windFilter.Q.value = 0.5;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.4;
  windSrc.connect(windFilter).connect(windGain).connect(masterGain);
  windSrc.start();

  // LFO en el filtro (ráfagas de viento)
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain).connect(windFilter.frequency);
  lfo.start();

  // LFO en el gain del viento (gusts)
  const windAmpLfo = ctx.createOscillator();
  windAmpLfo.frequency.value = 0.08;
  const windAmpLfoGain = ctx.createGain();
  windAmpLfoGain.gain.value = 0.2;
  windAmpLfo.connect(windAmpLfoGain).connect(windGain.gain);
  windAmpLfo.start();

  // ============== GRILLOS ==============
  // Pulsos agudos ~4kHz a alta frecuencia
  function cricket() {
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 3800 + Math.random() * 600;
    const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.04, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4000;
    filter.Q.value = 3;
    o.connect(filter).connect(g).connect(masterGain);
    o.start(now);
    o.stop(now + 0.06);
    setTimeout(cricket, 80 + Math.random() * 250);
  }
  cricket();

  // ============== PÁJAROS ==============
  function bird() {
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const baseFreq = 1800 + Math.random() * 1500;
    o.frequency.setValueAtTime(baseFreq, now);
    o.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.1);
    o.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.2);
    const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.025, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    o.connect(g).connect(masterGain);
    o.start(now);
    o.stop(now + 0.3);
    setTimeout(bird, 2000 + Math.random() * 5000);
  }
  bird();

  // ============== RÁFAGA DE VIENTO (más intenso) ==============
  function gust() {
    if (!started) return;
    const now = ctx.currentTime;
    const o = ctx.createBufferSource();
    o.buffer = windBuf;
    o.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    const g = ctx.createGain();
      g.gain.setValueAtTime(0.1, now);
      g.gain.linearRampToValueAtTime(0.5, now + 1);
      g.gain.linearRampToValueAtTime(0.1, now + 3);
    o.connect(f).connect(g).connect(masterGain);
    o.start(now);
    o.stop(now + 3.1);
    setTimeout(gust, 8000 + Math.random() * 12000);
  }
  gust();

  // Fade in
  masterGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 1.5);
}

export function stopAmbient() {
  if (!started || !ctx) return;
  started = false;
  masterGain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.5);
  setTimeout(() => {
    if (ctx && ctx.state === 'running') ctx.suspend();
  }, 600);
}

export function toggleAmbient() {
  if (started) stopAmbient();
  else startAmbient();
  return started;
}

// ============ BRAMA DEL CIERVO (evento) ============
// Escucha el evento 'deer-brama' emitido por el macho alfa y reproduce un sonido grave
let audioCtx = null;

function getCtx() {
  if (audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function startListening() {
  if (typeof window === 'undefined') return;
  window.addEventListener('deer-brama', (e) => {
    if (!started) return;
    const { volume = 0.7 } = e.detail || {};
    playBrama(volume);
  });
}

function playBrama(volume = 0.7) {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const now = ctx.currentTime;

  // Brama: tono grave con modulación y formantes
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  const baseFreq = 85 + Math.random() * 25; // 85-110 Hz

  // Envolvente de frecuencia (el brama empieza alto y cae)
  o.frequency.setValueAtTime(baseFreq * 1.3, now);
  o.frequency.linearRampToValueAtTime(baseFreq * 0.85, now + 0.3);
  o.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + 1.5);

  // Formante 1 (resonancia)
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass';
  f1.frequency.value = 400;
  f1.Q.value = 8;

  // Formante 2 (resonancia más alta, da el "ooh")
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass';
  f2.frequency.value = 900;
  f2.Q.value = 6;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(volume * 0.5, now + 0.05);
  g.gain.linearRampToValueAtTime(volume * 0.45, now + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

  o.connect(f1);
  o.connect(f2);
  f1.connect(g);
  f2.connect(g);
  g.connect(masterGain);

  o.start(now);
  o.stop(now + 2.1);
}

// Inicia escucha al cargar el módulo
if (typeof window !== 'undefined') {
  startListening();
}