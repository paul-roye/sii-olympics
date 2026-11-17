// Épreuve 1 "figures" : Quick Time Event au clavier (lettres A-Z), 60 s.
// 0-30 s : combinaisons de 1, 2, 3, 4, 5 puis 6 touches, révélées touche après touche.
// 30-60 s : séries d'accords de 2 touches à presser EN MÊME TEMPS.
// Chaque touche a un temps limité (cadre qui se resserre). Réussite = creux plus court, raté = creux plus long.
import { C, clamp, H, pixelText, steppedSky, W, type ActivityResult, type HudItem, type Input, type Mode } from './engine';
import type { Sport } from './data';
import { drawBackground, drawSprite, fitHeight } from '../sprites';
import { sfx } from '../sound';

export const TRICKS_LIMIT = 60;
const CHORD_START = 30; // passage aux accords
const COMBO_LENGTHS = [1, 2, 3, 4, 5, 6];
const LULL_START = 0.8; // creux entre deux combinaisons
const LULL_MIN = 0.35;
const LULL_MAX = 1.6;
const KEY_WINDOW = 1.5; // temps pour une touche (diminue avec les réussites)
const KEY_WINDOW_MIN = 0.9;
const CHORD_WINDOW = 2.0;
const GOAL = 18; // figures à réussir pour la médaille
const GROUND = H - 90;
const PLAYER_X = 220;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

type Phase = 'lull' | 'key' | 'chord';

const pick = (n: number, exclude: string[] = []) => {
  const pool = ALPHABET.split('').filter((l) => !exclude.includes(l));
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
};

export class Tricks implements Mode {
  result: ActivityResult | null = null;
  private sport: Sport;
  private accent: string;
  private t = 0;
  private phase: Phase = 'lull';
  private left = LULL_START; // temps restant de la phase courante
  private phaseLen = LULL_START;
  private lull = LULL_START;
  private keyWindow = KEY_WINDOW;
  private comboIdx = 0; // index dans COMBO_LENGTHS
  private comboLen = 0;
  private comboPos = 0; // touche courante dans la combinaison
  private current: string[] = []; // 1 lettre (combinaison) ou 2 (accord)
  private points = 0;
  private success = 0;
  private fails = 0;
  private keysOk = 0;
  private scroll = 0;
  private speed = 220;
  private anim = 0;
  private stumble = 0;
  private pop = 0; // petit effet quand une touche est validée
  private feedback: { text: string; color: string; t: number } | null = null;
  private decoys: string[] = [];

  constructor(sport: Sport, accent: string) {
    this.sport = sport;
    this.accent = accent;
  }

  private get word() {
    return this.sport.trickWord ?? 'figure';
  }
  private get chordMode() {
    return this.t >= CHORD_START || this.comboIdx >= COMBO_LENGTHS.length;
  }

  /** 6 lettres proposées en boutons (tactile / manette) : les bonnes + des leurres. */
  private setTouch() {
    const extra = pick(6 - this.current.length, this.current);
    this.decoys = [...this.current, ...extra].sort(() => Math.random() - 0.5);
  }

  private nextKey() {
    this.current = pick(1);
    this.phase = 'key';
    this.left = this.phaseLen = this.keyWindow;
    this.setTouch();
  }

  private startNext() {
    if (this.chordMode) {
      this.current = pick(2);
      this.phase = 'chord';
      this.left = this.phaseLen = CHORD_WINDOW;
      this.setTouch();
    } else {
      this.comboLen = COMBO_LENGTHS[this.comboIdx];
      this.comboPos = 0;
      this.nextKey();
    }
  }

  private succeed(bonus: number) {
    this.success++;
    this.points += bonus;
    this.lull = Math.max(LULL_MIN, this.lull - 0.1);
    this.keyWindow = Math.max(KEY_WINDOW_MIN, this.keyWindow - 0.05);
    this.speed = Math.min(420, this.speed + 25);
    this.anim = 0.8;
    sfx.trick();
    this.feedback = { text: this.word === 'esquive' ? 'ESQUIVÉ !' : 'FIGURE !', color: C.ok, t: 0.8 };
    this.toLull();
  }

  private fail() {
    this.fails++;
    this.lull = Math.min(LULL_MAX, this.lull + 0.3);
    this.keyWindow = Math.min(KEY_WINDOW, this.keyWindow + 0.1);
    this.speed = Math.max(140, this.speed - 60);
    this.stumble = 0.7;
    sfx.miss();
    this.feedback = { text: 'RATÉ !', color: C.alert, t: 0.8 };
    this.toLull();
  }

  private toLull() {
    if (this.phase === 'key') this.comboIdx++;
    this.phase = 'lull';
    this.left = this.phaseLen = this.lull;
    this.current = [];
    this.decoys = [];
  }

  private labeler: ((l: string) => string) | null = null;
  setLabeler(f: ((l: string) => string) | null) {
    this.labeler = f;
  }

  touchLetters() {
    return this.phase === 'lull' ? [] : this.decoys;
  }

  update(dt: number, input: Input) {
    if (this.result) return;
    this.t += dt;
    this.scroll += this.speed * dt;
    this.anim = Math.max(0, this.anim - dt);
    this.stumble = Math.max(0, this.stumble - dt);
    this.pop = Math.max(0, this.pop - dt);
    if (this.feedback && (this.feedback.t -= dt) <= 0) this.feedback = null;
    const presses = input.consume().filter((k) => k.length === 1);

    if (this.t >= TRICKS_LIMIT) return this.finish();
    this.left -= dt;

    if (this.phase === 'lull') {
      if (this.left <= 0) this.startNext();
      return;
    }

    if (this.phase === 'key') {
      // à 30 s, la combinaison en cours s'arrête et on passe aux accords
      if (this.t >= CHORD_START && this.comboIdx < COMBO_LENGTHS.length) {
        this.comboIdx = COMBO_LENGTHS.length;
        this.phase = 'lull';
        this.left = this.phaseLen = this.lull;
        this.current = [];
        this.decoys = [];
        return;
      }
      for (const k of presses) {
        if (k !== this.current[0]) return this.fail();
        this.keysOk++;
        this.points += 10;
        this.pop = 0.15;
        this.comboPos++;
        if (this.comboPos < this.comboLen) sfx.key();
        if (this.comboPos >= this.comboLen) return this.succeed(5 * this.comboLen);
        return this.nextKey();
      }
      if (this.left <= 0) this.fail();
      return;
    }

    // accord : les deux lettres doivent être enfoncées en même temps
    for (const k of presses) if (!this.current.includes(k)) return this.fail();
    if (this.current.every((l) => input.held.has(l))) {
      this.keysOk += 2;
      return this.succeed(30);
    }
    if (this.left <= 0) this.fail();
  }

  private finish() {
    if (this.result) return;
    const won = this.success >= GOAL;
    const score = this.points + (won ? 50 : 0);
    const s = (n: number) => (n > 1 ? 's' : '');
    this.result = {
      won,
      score,
      details: `${this.success} ${this.word}${s(this.success)} réussie${s(this.success)} · ${this.fails} ratée${s(this.fails)}`,
      stats: { success: this.success, fails: this.fails, keys: this.keysOk },
    };
  }

  hud(): HudItem[] {
    return [
      { label: 'TEMPS', value: `${Math.max(0, Math.ceil(TRICKS_LIMIT - this.t))} s`, progress: 1 - clamp(this.t / TRICKS_LIMIT, 0, 1) },
      { label: this.word === 'esquive' ? 'ESQUIVES' : 'FIGURES', value: `${this.success}/${GOAL}`, progress: Math.min(1, this.success / GOAL) },
      { label: 'SCORE', value: String(this.points).padStart(4, '0') },
    ];
  }

  /** Touche à presser : case crème, cadre qui se resserre et passe du jaune au rouge avec le temps. */
  private drawKey(ctx: CanvasRenderingContext2D, letter: string, cx: number, cy: number, p: number) {
    const size = 72 + (this.pop > 0 ? 8 : 0);
    const color = p > 0.5 ? C.gold : p > 0.25 ? '#FF8A1F' : C.alert;
    const m = Math.round((40 * p) / 4) * 4; // marge du cadre : 40 px → 0, par pas de 4 px
    const fs = size + 2 * m + 16;
    const fx = cx - fs / 2;
    const fy = cy - fs / 2;
    ctx.fillStyle = color;
    ctx.fillRect(fx, fy, fs, 4);
    ctx.fillRect(fx, fy + fs - 4, fs, 4);
    ctx.fillRect(fx, fy, 4, fs);
    ctx.fillRect(fx + fs - 4, fy, 4, fs);
    ctx.fillStyle = C.ink;
    ctx.fillRect(cx - size / 2, cy - size / 2 - 4, size, size + 8);
    ctx.fillRect(cx - size / 2 - 4, cy - size / 2, size + 8, size);
    ctx.fillStyle = C.cream;
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(cx - size / 2, cy + size / 2 - 8, size, 8);
    const label = this.labeler ? this.labeler(letter) : letter.toUpperCase();
    pixelText(ctx, label, cx, cy - 2, label.length > 1 ? 22 : 32, C.ink);
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.sport.background && drawBackground(ctx, this.sport.background, W, H)) {
      // fond du continent (design) + traits de sol qui défilent
      ctx.fillStyle = 'rgba(10,10,26,.18)';
      for (let x = -(this.scroll % 48); x < W; x += 48) ctx.fillRect(x, GROUND + 28, 24, 8);
    } else {
      steppedSky(ctx, GROUND);
      ctx.fillStyle = C.night3;
      for (let i = 0; i < 8; i++) {
        const x = ((i * 140 - this.scroll * 0.25) % (W + 140) + W + 140) % (W + 140) - 70;
        ctx.fillRect(x, GROUND - 60, 100, 60);
        ctx.fillRect(x + 20, GROUND - 84, 60, 24);
      }
      ctx.fillStyle = this.accent;
      ctx.fillRect(0, GROUND, W, 8);
      ctx.fillStyle = C.night0;
      ctx.fillRect(0, GROUND + 8, W, H - GROUND - 8);
      ctx.fillStyle = C.line;
      for (let x = -(this.scroll % 48); x < W; x += 48) ctx.fillRect(x, GROUND + 28, 24, 8);
    }

    // obstacle / requin qui arrive pendant le creux
    if (this.phase === 'lull' && this.t < TRICKS_LIMIT - 0.5) {
      const q = this.left / Math.max(this.phaseLen, 0.01);
      const hz = this.sport.hazard ?? 'obstacle';
      drawSprite(ctx, hz, PLAYER_X + 60 + q * (W - PLAYER_X), GROUND, fitHeight(hz, 64));
    }

    let y = GROUND;
    let rot = 0;
    if (this.anim > 0) {
      const a = 1 - this.anim / 0.8;
      y -= Math.sin(a * Math.PI) * 100;
      rot = a * Math.PI * 2;
    }
    if (this.stumble > 0) rot = Math.sin(this.stumble * 30) * 0.4;
    const pl = this.sport.player ?? 'skater';
    drawSprite(ctx, pl, PLAYER_X, y, fitHeight(pl, 100), { rotate: rot });

    const p = clamp(this.left / Math.max(this.phaseLen, 0.01), 0, 1);
    if (this.phase === 'key') {
      this.drawKey(ctx, this.current[0], W / 2, 124, p);
      // progression dans la combinaison, sans révéler les touches suivantes
      const n = this.comboLen;
      const x0 = W / 2 - (n * 16 + (n - 1) * 8) / 2;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i < this.comboPos ? C.ok : i === this.comboPos ? C.gold : C.line;
        ctx.fillRect(x0 + i * 24, 206, 16, 8);
      }
    } else if (this.phase === 'chord') {
      this.drawKey(ctx, this.current[0], W / 2 - 96, 124, p);
      pixelText(ctx, '+', W / 2, 124, 28, C.gold);
      this.drawKey(ctx, this.current[1], W / 2 + 96, 124, p);
      pixelText(ctx, 'EN MÊME TEMPS !', W / 2, 214, 12, C.gold);
    } else if (this.t < TRICKS_LIMIT - 0.5) {
      pixelText(ctx, this.chordMode ? '2 TOUCHES ENSEMBLE !' : 'PRÊT…', W / 2, 124, 16, C.text2);
    }
    if (this.feedback) pixelText(ctx, this.feedback.text, W / 2, 252, 22, this.feedback.color);
  }
}
