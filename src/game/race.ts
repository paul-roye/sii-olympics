// Épreuve 3 "course" à dos d'animal : alterner ◀ ▶ pour accélérer, ▲/ESPACE pour sauter.
// Toucher un obstacle fait perdre de la vitesse. Rival IA à vitesse quasi constante.
import { C, H, pixelText, rand, steppedSky, W, type ActivityResult, type HudItem, type Input, type Mode } from './engine';
import type { Sport } from './data';
import { drawSprite } from '../sprites';

export const RACE_M = 600;
const PX_PER_M = 9;
const GROUND = H - 90;
const PLAYER_X = 200;
const BOOST = 1.15; // m/s gagnés par appui alterné
const DRAG = 0.34; // freinage proportionnel à la vitesse (/s)
const MAX_V = 26;
const HIT_FACTOR = 0.45; // vitesse conservée après un choc
const JUMP_TIME = 0.62;
const RIVAL_V = 14.5;

export class Race implements Mode {
  result: ActivityResult | null = null;
  private sport: Sport;
  private accent: string;
  private t = 0;
  private pos = 0;
  private v = 0;
  private rival = 0;
  private lastMash: string | null = null;
  private air = 0; // > 0 : en l'air
  private obstacles: { m: number; hit?: boolean; cleared?: boolean }[] = [];
  private hits = 0;
  private cleared = 0;
  private flash = 0;

  constructor(sport: Sport, accent: string) {
    this.sport = sport;
    this.accent = accent;
    for (let m = 70; m < RACE_M - 30; m += rand(55, 95)) this.obstacles.push({ m });
  }

  tap() {
    this.jump();
  }

  private jump() {
    if (this.air <= 0) this.air = JUMP_TIME;
  }

  update(dt: number, input: Input) {
    if (this.result) return;
    this.t += dt;
    for (const k of input.consume()) {
      if (k === 'left' || k === 'right') {
        if (k !== this.lastMash) this.v = Math.min(MAX_V, this.v + BOOST);
        this.lastMash = k;
      } else if (k === 'up' || k === 'jump') this.jump();
    }
    this.v = Math.max(0, this.v - DRAG * this.v * dt);
    this.air = Math.max(0, this.air - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.pos += this.v * dt;
    // rival IA : vitesse de croisière avec légères variations
    this.rival += (RIVAL_V + Math.sin(this.t * 0.7) * 1.2) * dt;

    for (const o of this.obstacles) {
      if (o.hit || o.cleared) continue;
      if (Math.abs(o.m - this.pos) < 1.6) {
        if (this.air > 0) {
          o.cleared = true;
          this.cleared++;
        } else {
          o.hit = true;
          this.hits++;
          this.v *= HIT_FACTOR;
          this.flash = 0.35;
        }
      } else if (o.m < this.pos - 2) o.cleared = true; // franchi en l'air entre deux frames
    }

    if (this.pos >= RACE_M) this.finish(true);
    else if (this.rival >= RACE_M) this.finish(false);
  }

  private finish(won: boolean) {
    const time = this.t;
    const score = this.cleared * 10 + (won ? 100 + Math.max(0, Math.round((60 - time) * 3)) : Math.round((this.pos / RACE_M) * 50));
    this.result = {
      won,
      score,
      time,
      details: `⏱ ${time.toFixed(1)} s · ${this.cleared} sauts réussis · ${this.hits} chocs`,
      stats: { time: Math.round(time * 10) / 10, cleared: this.cleared, hits: this.hits, meters: Math.floor(Math.min(this.pos, RACE_M)) },
    };
  }

  hud(): HudItem[] {
    return [
      { label: 'TOI', value: `${Math.floor(Math.min(this.pos, RACE_M))} m`, progress: Math.min(1, this.pos / RACE_M), color: this.accent },
      { label: 'RIVAL IA', value: `${Math.floor(Math.min(this.rival, RACE_M))} m`, progress: Math.min(1, this.rival / RACE_M), color: C.alert },
      { label: 'VITESSE', value: `${Math.round(this.v * 3.6)} km/h` },
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    steppedSky(ctx, GROUND);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(240,65,74,${this.flash})`;
      ctx.fillRect(0, 0, W, GROUND);
    }
    const cam = this.pos;
    const sx = (m: number) => PLAYER_X + (m - cam) * PX_PER_M;
    // décor
    ctx.fillStyle = C.night3;
    for (let i = 0; i < 8; i++) {
      const x = ((i * 150 - cam * PX_PER_M * 0.3) % (W + 150) + W + 150) % (W + 150) - 75;
      ctx.fillRect(x, GROUND - 50, 90, 50);
    }
    ctx.fillStyle = this.accent;
    ctx.fillRect(0, GROUND, W, 8);
    ctx.fillStyle = C.night0;
    ctx.fillRect(0, GROUND + 8, W, H - GROUND - 8);
    ctx.fillStyle = C.line;
    for (let m = Math.floor((cam - 30) / 5) * 5; m < cam + 80; m += 5) ctx.fillRect(sx(m), GROUND + 28, 16, 8);

    // ligne d'arrivée en damier
    const fx = sx(RACE_M);
    if (fx < W + 20) {
      for (let y = 0; y < 10; y++) for (let c = 0; c < 2; c++) {
        ctx.fillStyle = (y + c) % 2 ? C.cream : C.ink;
        ctx.fillRect(fx + c * 8, GROUND - 160 + y * 16, 8, 16);
      }
    }
    for (const o of this.obstacles) {
      const x = sx(o.m);
      if (x > -40 && x < W + 40) drawSprite(ctx, 'obstacle', x, GROUND, 44, { alpha: o.hit ? 0.35 : 1 });
    }

    // rival (toujours au sol : il saute sans effort)
    const rx = sx(this.rival);
    if (rx > -60 && rx < W + 60) drawSprite(ctx, 'rival', rx, GROUND - 2 - Math.abs(Math.sin(this.t * 10)) * 4, 84);
    else pixelText(ctx, rx < 0 ? '◀ RIVAL' : 'RIVAL ▶', rx < 0 ? 16 : W - 16, GROUND - 40, 12, C.alert, rx < 0 ? 'left' : 'right');

    // joueur
    const jy = this.air > 0 ? Math.sin((1 - this.air / JUMP_TIME) * Math.PI) * 90 : Math.abs(Math.sin(this.t * (4 + this.v / 2))) * 4;
    drawSprite(ctx, 'rider', PLAYER_X, GROUND - jy, 84);

    // jauge de vitesse
    ctx.fillStyle = C.ink;
    ctx.fillRect(16, 16, 20, 188);
    ctx.fillStyle = C.night1;
    ctx.fillRect(20, 20, 12, 180);
    const p = this.v / MAX_V;
    ctx.fillStyle = p > 0.6 ? C.ok : p > 0.3 ? C.gold : C.alert;
    ctx.fillRect(20, 20 + 180 * (1 - p), 12, 180 * p);
    if (this.t < 2.5) pixelText(ctx, '◀ ▶ ◀ ▶ !', W / 2, 90, 20, C.gold);
  }
}
