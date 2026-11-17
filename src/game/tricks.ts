// Épreuve 1 "figures" : Quick Time Event au clavier (lettres A-Z), 60 s max.
// Rythme : un creux, puis 1 lettre ; un creux, puis 2 lettres ; etc.
// Une réussite raccourcit le creux et allonge la séquence suivante ; un raté ralentit (creux plus long).
import { C, clamp, H, notchedBox, pixelText, steppedSky, W, type ActivityResult, type HudItem, type Input, type Mode } from './engine';
import type { Sport } from './data';
import { drawSprite } from '../sprites';

export const TRICKS_LIMIT = 60;
const LULL_START = 3.0;
const LULL_MIN = 1.0;
const LULL_MAX = 4.2;
const MAX_LEN = 6;
const GOAL = 5; // figures à réussir pour la médaille
const GROUND = H - 90;
const PLAYER_X = 220;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

type Phase = 'lull' | 'seq';

export class Tricks implements Mode {
  result: ActivityResult | null = null;
  private sport: Sport;
  private accent: string;
  private t = 0;
  private phase: Phase = 'lull';
  private lull = LULL_START;
  private phaseLeft = LULL_START;
  private len = 1;
  private seq: string[] = [];
  private typed = 0;
  private window = 0;
  private points = 0;
  private success = 0;
  private fails = 0;
  private lettersOk = 0;
  private scroll = 0;
  private speed = 220; // px/s, visuel
  private anim = 0; // > 0 : figure en cours (saut + rotation)
  private stumble = 0; // > 0 : chute
  private feedback: { text: string; color: string; t: number } | null = null;
  private decoys: string[] = [];

  constructor(sport: Sport, accent: string) {
    this.sport = sport;
    this.accent = accent;
  }

  private get word() {
    return this.sport.trickWord ?? 'figure';
  }

  private startSeq() {
    const pool = ALPHABET.split('');
    this.seq = [];
    for (let i = 0; i < this.len; i++) this.seq.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    this.typed = 0;
    this.window = 1.2 + 0.8 * this.len;
    this.phase = 'seq';
    this.phaseLeft = this.window;
    // boutons tactiles : lettres utiles + leurres, mélangés
    const extra = pool.sort(() => Math.random() - 0.5).slice(0, Math.max(0, 6 - this.len));
    this.decoys = [...this.seq, ...extra].sort(() => Math.random() - 0.5);
  }

  private endSeq(ok: boolean) {
    if (ok) {
      this.success++;
      this.points += 5 * this.len;
      this.len = Math.min(MAX_LEN, this.len + 1);
      this.lull = Math.max(LULL_MIN, this.lull - 0.35);
      this.speed = Math.min(420, this.speed + 30);
      this.anim = 0.8;
      this.feedback = { text: this.word === 'esquive' ? 'ESQUIVÉ !' : 'FIGURE !', color: C.ok, t: 0.9 };
    } else {
      this.fails++;
      this.lull = Math.min(LULL_MAX, this.lull + 0.6);
      this.speed = Math.max(140, this.speed - 60);
      this.stumble = 0.7;
      this.feedback = { text: 'RATÉ !', color: C.alert, t: 0.9 };
    }
    this.phase = 'lull';
    this.phaseLeft = this.lull;
    this.seq = [];
  }

  touchLetters() {
    return this.phase === 'seq' ? this.decoys : [];
  }

  update(dt: number, input: Input) {
    if (this.result) return;
    this.t += dt;
    this.scroll += this.speed * dt;
    this.anim = Math.max(0, this.anim - dt);
    this.stumble = Math.max(0, this.stumble - dt);
    if (this.feedback && (this.feedback.t -= dt) <= 0) this.feedback = null;
    const presses = input.consume().filter((k) => k.length === 1);

    if (this.phase === 'lull') {
      this.phaseLeft -= dt;
      if (this.phaseLeft <= 0) {
        if (this.t >= TRICKS_LIMIT - 1) return this.finish();
        this.startSeq();
      }
    } else {
      for (const k of presses) {
        if (k === this.seq[this.typed]) {
          this.typed++;
          this.lettersOk++;
          this.points += 10;
          if (this.typed === this.seq.length) return this.endSeqThenCheck(true);
        } else return this.endSeqThenCheck(false);
      }
      this.phaseLeft -= dt;
      if (this.phaseLeft <= 0) this.endSeqThenCheck(false);
    }
    if (this.t >= TRICKS_LIMIT && this.phase === 'lull') this.finish();
  }

  private endSeqThenCheck(ok: boolean) {
    this.endSeq(ok);
    if (this.t >= TRICKS_LIMIT) this.finish();
  }

  private finish() {
    const won = this.success >= GOAL;
    const score = this.points + (won ? 50 : 0);
    const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
    this.result = {
      won,
      score,
      details: `${plural(this.success, this.word)} réussie${this.success > 1 ? 's' : ''} · ${this.fails} ratée${this.fails > 1 ? 's' : ''}`,
      stats: { success: this.success, fails: this.fails, letters: this.lettersOk },
    };
  }

  hud(): HudItem[] {
    return [
      { label: 'TEMPS', value: `${Math.max(0, Math.ceil(TRICKS_LIMIT - this.t))} s`, progress: 1 - clamp(this.t / TRICKS_LIMIT, 0, 1) },
      { label: this.word === 'esquive' ? 'ESQUIVES' : 'FIGURES', value: `${this.success}/${GOAL}`, progress: Math.min(1, this.success / GOAL) },
      { label: 'SCORE', value: String(this.points).padStart(4, '0') },
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    steppedSky(ctx, GROUND);
    // décor : collines crantées en parallaxe
    ctx.fillStyle = C.night3;
    for (let i = 0; i < 8; i++) {
      const x = ((i * 140 - this.scroll * 0.25) % (W + 140) + W + 140) % (W + 140) - 70;
      ctx.fillRect(x, GROUND - 60, 100, 60);
      ctx.fillRect(x + 20, GROUND - 84, 60, 24);
    }
    // sol
    ctx.fillStyle = this.accent;
    ctx.fillRect(0, GROUND, W, 8);
    ctx.fillStyle = C.night0;
    ctx.fillRect(0, GROUND + 8, W, H - GROUND - 8);
    ctx.fillStyle = C.line;
    for (let x = -(this.scroll % 48); x < W; x += 48) ctx.fillRect(x, GROUND + 28, 24, 8);

    // obstacle / tremplin qui arrive pendant le creux, au joueur au début de la séquence
    if (this.phase === 'lull' && this.phaseLeft < 2.2 && this.t < TRICKS_LIMIT - 1) {
      const x = PLAYER_X + 40 + (this.phaseLeft / 2.2) * (W - PLAYER_X);
      drawSprite(ctx, this.sport.hazard ?? 'obstacle', x, GROUND, 48);
    }

    // joueur
    let y = GROUND;
    let rot = 0;
    if (this.anim > 0) {
      const p = 1 - this.anim / 0.8;
      y -= Math.sin(p * Math.PI) * 110;
      rot = p * Math.PI * 2;
    }
    if (this.stumble > 0) rot = Math.sin(this.stumble * 30) * 0.4;
    drawSprite(ctx, 'skater', PLAYER_X, y, 96, { rotate: rot });

    // séquence de lettres
    if (this.phase === 'seq') {
      const size = 64;
      const gap = 14;
      const total = this.seq.length * size + (this.seq.length - 1) * gap;
      let x = W / 2 - total / 2;
      for (let i = 0; i < this.seq.length; i++) {
        const done = i < this.typed;
        notchedBox(ctx, x, 70, size, size, done ? C.ok : i === this.typed ? this.accent : C.panel2);
        pixelText(ctx, this.seq[i].toUpperCase(), x + size / 2, 70 + size / 2 + 2, 28, done || i === this.typed ? C.ink : C.cream);
        x += size + gap;
      }
      // jauge de temps
      const bw = Math.max(total, 240);
      ctx.fillStyle = C.ink;
      ctx.fillRect(W / 2 - bw / 2 - 4, 154, bw + 8, 16);
      ctx.fillStyle = C.night1;
      ctx.fillRect(W / 2 - bw / 2, 158, bw, 8);
      const p = this.phaseLeft / this.window;
      ctx.fillStyle = p > 0.5 ? C.ok : p > 0.25 ? C.gold : C.alert;
      ctx.fillRect(W / 2 - bw / 2, 158, bw * p, 8);
    } else if (this.t < TRICKS_LIMIT - 1) {
      pixelText(ctx, 'PRÊT…', W / 2, 100, 16, C.text2);
    }
    if (this.feedback) pixelText(ctx, this.feedback.text, W / 2, 210, 24, this.feedback.color);
  }
}
