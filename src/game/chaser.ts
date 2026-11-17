// Mode "chaser" : vue de dessus, toucher le ballon 8 fois en 30 s.
import { C, clamp, H, type Input, type Mode, type HudItem, type ActivityResult, rand, W } from './engine';
import { drawSprite } from '../sprites';
import { sfx } from '../sound';
import type { Sport } from './data';

const GOAL = 8;
const LIMIT = 30;
const PAD = 30;
const PLAYER_SPEED = 330;
// Rayons de collision = taille réelle des sprites dessinés (voir draw)
const PR = 26; // rayon joueur (sprite 10×9 dessiné en 58×52)
const BR = 18; // rayon ballon (sprite 8×8 dessiné en 36×36)

export class Chaser implements Mode {
  result: ActivityResult | null = null;
  private t = 0;
  private hits = 0;
  private px = W / 2;
  private py = H / 2;
  private bx = 0;
  private by = 0;
  private vx = 0;
  private vy = 0;
  private flash = 0;
  private target: { x: number; y: number } | null = null; // déplacement au tap

  private sport: Sport;
  private accent: string;

  constructor(sport: Sport, accent: string) {
    this.sport = sport;
    this.accent = accent;
    this.respawn();
  }

  private respawn() {
    // loin du joueur
    do {
      this.bx = rand(PAD + BR, W - PAD - BR);
      this.by = rand(PAD + BR, H - PAD - BR);
    } while (Math.hypot(this.bx - this.px, this.by - this.py) < 200);
    const speed = Math.min(520, 240 + this.hits * 18);
    const a = rand(0, Math.PI * 2);
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
  }

  tap(x: number, y: number) {
    this.target = { x, y };
  }

  update(dt: number, input: Input) {
    if (this.result) return;
    input.consume();
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);

    let dx = 0;
    let dy = 0;
    if (input.held.has('left')) dx -= 1;
    if (input.held.has('right')) dx += 1;
    if (input.held.has('up')) dy -= 1;
    if (input.held.has('down')) dy += 1;
    if (dx || dy) this.target = null;
    else if (this.target) {
      const tx = this.target.x - this.px;
      const ty = this.target.y - this.py;
      if (Math.hypot(tx, ty) < 6) this.target = null;
      else {
        dx = tx;
        dy = ty;
      }
    }
    const len = Math.hypot(dx, dy) || 1;
    this.px = clamp(this.px + (dx / len) * PLAYER_SPEED * dt, PAD + PR, W - PAD - PR);
    this.py = clamp(this.py + (dy / len) * PLAYER_SPEED * dt, PAD + PR, H - PAD - PR);

    // ballon + rebonds
    this.bx += this.vx * dt;
    this.by += this.vy * dt;
    if (this.bx < PAD + BR || this.bx > W - PAD - BR) {
      this.vx *= -1;
      this.bx = clamp(this.bx, PAD + BR, W - PAD - BR);
    }
    if (this.by < PAD + BR || this.by > H - PAD - BR) {
      this.vy *= -1;
      this.by = clamp(this.by, PAD + BR, H - PAD - BR);
    }

    if (Math.hypot(this.bx - this.px, this.by - this.py) < PR + BR - 2) {
      this.hits++;
      this.flash = 0.25;
      sfx.kick();
      if (this.hits >= GOAL) return this.finish(true);
      this.respawn();
    }
    if (this.t >= LIMIT) this.finish(false);
  }

  private finish(won: boolean) {
    const time = won ? this.t : LIMIT;
    // Score : 10 pts par touche + bonus de rapidité si réussi
    const score = this.hits * 10 + (won ? Math.round((LIMIT - time) * 5) : 0);
    this.result = {
      won,
      score,
      time,
      details: `⏱ Temps : ${time.toFixed(1)} s · Touches : ${this.hits}/${GOAL}`,
      stats: { hits: this.hits, time: Math.round(time * 10) / 10 },
    };
  }

  hud(): HudItem[] {
    return [
      { label: 'TOUCHES', value: `${this.hits}/${GOAL}`, progress: this.hits / GOAL },
      { label: 'TEMPS', value: `${Math.max(0, LIMIT - this.t).toFixed(1)} s`, progress: Math.max(0, 1 - this.t / LIMIT) },
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = C.night0;
    ctx.fillRect(0, 0, W, H);
    // terrain en bandes crantées
    const fw = W - 2 * PAD;
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? C.night2 : C.night3;
      ctx.fillRect(PAD + Math.floor((i * fw) / 10), PAD, Math.ceil(fw / 10), H - 2 * PAD);
    }
    const line = this.flash > 0 ? C.cream : this.accent;
    ctx.fillStyle = line;
    ctx.fillRect(PAD - 4, PAD - 4, fw + 8, 4);
    ctx.fillRect(PAD - 4, H - PAD, fw + 8, 4);
    ctx.fillRect(PAD - 4, PAD - 4, 4, H - 2 * PAD + 8);
    ctx.fillRect(W - PAD, PAD - 4, 4, H - 2 * PAD + 8);
    ctx.fillStyle = C.line;
    ctx.fillRect(W / 2 - 2, PAD, 4, H - 2 * PAD);
    for (let a = 0; a < 32; a++) {
      const ang = (a / 32) * Math.PI * 2;
      ctx.fillRect(Math.round(W / 2 + Math.cos(ang) * 60) - 2, Math.round(H / 2 + Math.sin(ang) * 60) - 2, 4, 4);
    }
    if (this.target) {
      ctx.fillStyle = C.text2;
      ctx.fillRect(this.target.x - 8, this.target.y - 2, 16, 4);
      ctx.fillRect(this.target.x - 2, this.target.y - 8, 4, 16);
    }
    drawSprite(ctx, 'ball', this.bx, this.by + BR, BR * 2);
    drawSprite(ctx, 'playerTop', this.px, this.py + PR, PR * 2);
  }
}
