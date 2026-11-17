// Petits sons rétro 8/16-bit synthétisés avec la Web Audio API (aucun fichier audio).
// L'AudioContext démarre au premier geste (clic, touche, bouton de manette) : exigence des navigateurs.

type Wave = OscillatorType;
interface Note {
  f: number; // fréquence de départ (Hz)
  to?: number; // fréquence d'arrivée (glissando)
  d: number; // durée (s)
  at?: number; // décalage (s)
  w?: Wave;
  v?: number; // volume 0..1
}

const MUTE_KEY = 'sii-olympics-mute';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();
const listeners = new Set<(m: boolean) => void>();

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** À appeler une fois : débloque l'audio au premier geste de l'utilisateur. */
export function unlockAudioOnGesture() {
  if (typeof window === 'undefined') return;
  const unlock = () => audio();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function play(notes: Note[]) {
  if (muted) return;
  const c = audio();
  if (!c || !master || c.state !== 'running') return;
  const t0 = c.currentTime + 0.005;
  for (const n of notes) {
    const o = c.createOscillator();
    const g = c.createGain();
    const start = t0 + (n.at ?? 0);
    o.type = n.w ?? 'square';
    o.frequency.setValueAtTime(n.f, start);
    if (n.to) o.frequency.exponentialRampToValueAtTime(n.to, start + n.d);
    const v = n.v ?? 0.6;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(v, start + 0.005);
    g.gain.setValueAtTime(v, start + n.d * 0.6);
    g.gain.linearRampToValueAtTime(0, start + n.d);
    o.connect(g).connect(master);
    o.start(start);
    o.stop(start + n.d + 0.02);
  }
}

/** Bruit blanc court (chocs). */
function noise(d: number, v = 0.5) {
  if (muted) return;
  const c = audio();
  if (!c || !master || c.state !== 'running') return;
  const len = Math.floor(c.sampleRate * d);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource();
  const g = c.createGain();
  g.gain.value = v;
  s.buffer = buf;
  s.connect(g).connect(master);
  s.start();
}

let lastStep = 0;

export const sfx = {
  /** Navigation / validation dans les menus. */
  select: () => play([{ f: 880, d: 0.05 }, { f: 1320, d: 0.06, at: 0.05 }]),
  move: () => play([{ f: 660, d: 0.03, v: 0.3 }]),
  /** Décompte 3-2-1 puis départ. */
  count: () => play([{ f: 440, d: 0.12, w: 'square' }]),
  go: () => play([{ f: 880, d: 0.25, w: 'square' }]),
  /** Bonne touche (QTE). */
  key: () => play([{ f: 1046, d: 0.06, w: 'square', v: 0.45 }]),
  /** Figure / accord réussi. */
  trick: () => play([{ f: 784, d: 0.06 }, { f: 988, d: 0.06, at: 0.06 }, { f: 1318, d: 0.1, at: 0.12 }]),
  /** Raté. */
  miss: () => play([{ f: 220, to: 110, d: 0.22, w: 'sawtooth', v: 0.5 }]),
  /** Saut. */
  jump: () => play([{ f: 300, to: 900, d: 0.16, w: 'square', v: 0.4 }]),
  /** Choc contre un obstacle. */
  hit: () => {
    noise(0.15, 0.6);
    play([{ f: 160, to: 60, d: 0.18, w: 'triangle', v: 0.8 }]);
  },
  /** Ballon touché. */
  kick: () => play([{ f: 520, to: 1040, d: 0.08, w: 'square', v: 0.5 }]),
  /** Appui de course (limité pour ne pas saturer). */
  step: () => {
    const now = performance.now();
    if (now - lastStep < 70) return;
    lastStep = now;
    play([{ f: 140, d: 0.025, w: 'triangle', v: 0.35 }]);
  },
  /** Petite fanfare de victoire. */
  win: () =>
    play([
      { f: 523, d: 0.1 },
      { f: 659, d: 0.1, at: 0.1 },
      { f: 784, d: 0.1, at: 0.2 },
      { f: 1046, d: 0.3, at: 0.3 },
      { f: 262, d: 0.6, at: 0, w: 'triangle', v: 0.5 },
    ]),
  /** Défaite. */
  lose: () =>
    play([
      { f: 392, d: 0.15, w: 'square' },
      { f: 330, d: 0.15, at: 0.15, w: 'square' },
      { f: 262, to: 196, d: 0.4, at: 0.3, w: 'square' },
    ]),
  /** Arrivée / fin de parcours. */
  finish: () =>
    play([
      { f: 523, d: 0.12 },
      { f: 523, d: 0.12, at: 0.14 },
      { f: 523, d: 0.12, at: 0.28 },
      { f: 659, d: 0.4, at: 0.42 },
      { f: 784, d: 0.5, at: 0.56 },
    ]),
};

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* stockage indisponible */
  }
  listeners.forEach((l) => l(m));
  if (!m) sfx.select();
}

export function onMuteChange(l: (m: boolean) => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
