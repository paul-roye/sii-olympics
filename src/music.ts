// Musiques 8-bit originales, synthétisées en Web Audio (aucun fichier) : un thème d'accueil et un thème par continent.
// Séquenceur à pas de double-croche : lead (onde carrée), basse (triangle), arpèges (carrée douce), batterie (bruit + kick).
import { audioContext, isMuted, onMuteChange } from './sound';

type Song = {
  bpm: number;
  /** Accords par mesure : racine + octave, suffixe m = mineur (ex. 'C2m', 'Bb1'). */
  chords: string[];
  /** Mélodie : une chaîne par mesure, 16 jetons (note, '-' = tenue, '.' = silence). */
  lead: string[];
  /** Motif de basse sur 16 pas : R racine, O octave, F quinte, '.' silence. */
  bass: string;
  /** Motif de batterie sur 16 pas : k kick, s caisse claire, h charleston, '.' silence. */
  drums: string;
  /** Arpèges sur les accords (true = activés à partir du 2e tour). */
  arp?: boolean;
  /** Échelle de l'arpège : intervalles en demi-tons ajoutés à la racine. */
  arpShape?: number[];
};

const SONGS: Record<string, Song> = {
  // Accueil : héroïque, do mineur
  menu: {
    bpm: 140,
    chords: ['C3m', 'Ab2', 'Bb2', 'G2'],
    lead: [
      'G4 - - - C5 - D5 - Eb5 - - - D5 - C5 -',
      'C5 - - - Ab4 - Bb4 - C5 - - - Eb5 - - -',
      'D5 - - - Bb4 - C5 - D5 - - - F5 - Eb5 -',
      'D5 - - - B4 - - - G4 - A4 - B4 - D5 -',
    ],
    bass: 'R . O . R . O . R . O . R O F O',
    drums: 'k . h . s . h . k k h . s . h h',
    arp: true,
  },
  // Amérique : rock de stade, mi majeur, énergique
  amerique: {
    bpm: 152,
    chords: ['E2', 'D2', 'A2', 'B2'],
    lead: [
      'B4 - E5 - - - F#5 - G#5 - - - F#5 - E5 -',
      'F#5 - - - E5 - D5 - E5 - - - - - . .',
      'C#5 - E5 - A5 - - - G#5 - F#5 - E5 - C#5 -',
      'D#5 - - - E5 - F#5 - B4 - - - D#5 - F#5 -',
    ],
    bass: 'R R O R R R O R R R O R F F O F',
    drums: 'k . h k s . h . k . h k s . h s',
    arp: true,
  },
  // Europe-Asie : arène espagnole, mode phrygien de mi
  'europe-asie': {
    bpm: 138,
    chords: ['E2', 'F2', 'E2', 'D2m'],
    lead: [
      'E5 - F5 - G#5 - - - A5 - G#5 - F5 - E5 -',
      'F5 - - - A5 - C6 - B5 - A5 - G#5 - - -',
      'B5 - C6 - B5 - A5 - G#5 - F5 - E5 - - -',
      'D5 - F5 - E5 - D5 - C5 - - - B4 - - -',
    ],
    bass: 'R . R O . R . R R . R O . R F .',
    drums: 'k . h s k . s h k . h s k s s .',
    arp: true,
    arpShape: [0, 4, 7, 8],
  },
  // Afrique : pentatonique, percussions syncopées
  afrique: {
    bpm: 132,
    chords: ['A2m', 'A2m', 'G2', 'C3'],
    lead: [
      'E5 - . E5 G5 - E5 - D5 - . C5 D5 - - -',
      'A4 - . C5 D5 - E5 - G5 - E5 - D5 - C5 -',
      'E5 - . E5 A5 - G5 - E5 - . D5 E5 - - -',
      'C5 - D5 - C5 - A4 - G4 - A4 - - - . .',
    ],
    bass: 'R . . R . . O . F . . F . . O .',
    drums: 'k . h k s . h k . k h . s h k h',
    arp: true,
    arpShape: [0, 7, 12, 7],
  },
  // Océanie : île, do majeur, détendu mais rythmé
  oceanie: {
    bpm: 124,
    chords: ['C3', 'G2', 'F2', 'C3'],
    lead: [
      'E5 - - - G5 - - - A5 - G5 - E5 - - -',
      'D5 - - - E5 - D5 - B4 - - - G4 - - -',
      'F5 - - - A5 - - - C6 - A5 - G5 - - -',
      'E5 - D5 - C5 - D5 - E5 - - - . . . .',
    ],
    bass: 'R . F . O . F . R . F . O . F .',
    drums: 'k . h . s . h k . k h . s . h .',
    arp: true,
    arpShape: [0, 4, 7, 12],
  },
};

const NOTE: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const midi = (n: string) => {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  return m ? NOTE[m[1]] + 12 * (Number(m[2]) + 1) : null;
};
const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
function chord(c: string) {
  const m = /^([A-G][#b]?)(\d)(m?)$/.exec(c)!;
  return { root: NOTE[m[1]] + 12 * (Number(m[2]) + 1), minor: m[3] === 'm' };
}

let current: string | null = null;
let timer: number | null = null;
let musicGain: GainNode | null = null;
let musicOn = (() => {
  try {
    return localStorage.getItem('sii-olympics-music') !== '0';
  } catch {
    return true;
  }
})();
const listeners = new Set<(on: boolean) => void>();

function out(ctx: AudioContext) {
  if (!musicGain) {
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.07;
    musicGain.connect(ctx.destination);
  }
  return musicGain;
}

function tone(ctx: AudioContext, dest: AudioNode, type: OscillatorType, f: number, t: number, d: number, v: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.005);
  g.gain.setValueAtTime(v, t + d * 0.7);
  g.gain.linearRampToValueAtTime(0, t + d);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + d + 0.02);
}

let noiseBuf: AudioBuffer | null = null;
function drum(ctx: AudioContext, dest: AudioNode, kind: string, t: number) {
  if (kind === 'k') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(1, t);
    g.gain.linearRampToValueAtTime(0, t + 0.14);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.16);
    return;
  }
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  s.buffer = noiseBuf;
  f.type = kind === 'h' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'h' ? 7000 : 1800;
  const len = kind === 'h' ? 0.04 : 0.12;
  g.gain.setValueAtTime(kind === 'h' ? 0.35 : 0.8, t);
  g.gain.linearRampToValueAtTime(0, t + len);
  s.connect(f).connect(g).connect(dest);
  s.start(t);
  s.stop(t + len + 0.02);
}

/** Démarre (ou change) le thème. null = silence. Sans effet si le thème joue déjà. */
export function playMusic(theme: string | null) {
  if (theme === current) return;
  stopLoop();
  current = theme;
  startLoop();
}

function stopLoop() {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

function startLoop() {
  if (!current || !musicOn || isMuted()) return;
  const song = SONGS[current];
  const ctx = audioContext();
  if (!song || !ctx) return;
  const dest = out(ctx);
  const stepDur = 60 / song.bpm / 4;
  const lead = song.lead.map((bar) => bar.split(/\s+/));
  const bars = song.chords.length;
  let step = 0;
  let next = ctx.currentTime + 0.1;
  let held: { m: number; start: number; len: number } | null = null;

  const flushLead = () => {
    if (held) tone(ctx, dest, 'square', freq(held.m), held.start, held.len * stepDur * 0.95, 0.5);
    held = null;
  };

  const schedule = () => {
    if (ctx.state !== 'running') {
      next = ctx.currentTime + 0.1;
      return;
    }
    while (next < ctx.currentTime + 0.15) {
      const bar = Math.floor(step / 16) % bars;
      const loop = Math.floor(step / (16 * bars));
      const i = step % 16;
      const { root, minor } = chord(song.chords[bar]);
      // lead (notes tenues regroupées)
      const tok = lead[bar][i] ?? '.';
      if (tok === '-') {
        if (held) held.len++;
      } else {
        flushLead();
        const m = midi(tok);
        if (m !== null) held = { m, start: next, len: 1 };
      }
      if (i === 15) flushLead();
      // basse
      const b = song.bass.split(/\s+/)[i];
      const bm = b === 'R' ? root : b === 'O' ? root + 12 : b === 'F' ? root + 7 : null;
      if (bm !== null) tone(ctx, dest, 'triangle', freq(bm), next, stepDur * 0.9, 0.9);
      // arpèges (à partir du 2e tour, pour varier)
      if (song.arp && loop % 2 === 1) {
        const shape = song.arpShape ?? [0, minor ? 3 : 4, 7, 12];
        tone(ctx, dest, 'square', freq(root + 24 + shape[i % shape.length]), next, stepDur * 0.6, 0.12);
      }
      // batterie
      const d = song.drums.split(/\s+/)[i];
      if (d && d !== '.') drum(ctx, dest, d, next);
      next += stepDur;
      step++;
    }
  };
  schedule();
  timer = window.setInterval(schedule, 25);
}

export function isMusicOn() {
  return musicOn;
}

export function setMusicOn(on: boolean) {
  musicOn = on;
  try {
    localStorage.setItem('sii-olympics-music', on ? '1' : '0');
  } catch {
    /* stockage indisponible */
  }
  stopLoop();
  if (on) startLoop();
  listeners.forEach((l) => l(on));
}

export function onMusicChange(l: (on: boolean) => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// Couper le son coupe aussi la musique ; le remettre la relance.
onMuteChange((m) => {
  stopLoop();
  if (!m) startLoop();
});

/** Relance la musique quand l'audio est débloqué par le premier geste. */
export function resumeMusicOnGesture() {
  const go = () => {
    if (timer === null) startLoop();
  };
  window.addEventListener('pointerdown', go, { once: true });
  window.addEventListener('keydown', go, { once: true });
}
