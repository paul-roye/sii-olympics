// Mode "chaser" : vue de dessus, toucher le ballon 8 fois en 30 s.
import { clamp, emoji, H, type Input, type Mode, type HudItem, type ActivityResult, rand, W } from './engine';
import type { Sport } from './data';

const GOAL = 8;
const LIMIT = 30;
const PAD = 30;
const PLAYER_SPEED = 330;
const PR = 22; // rayon joueur
const BR = 16; // rayon ballon

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

    if (Math.hypot(this.bx - this.px, this.by - this.py) < PR + BR) {
      this.hits++;
      this.flash = 0.25;
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
      { label: 'Touches', value: `${this.hits} / ${GOAL}` },
      { label: 'Temps', value: `${Math.max(0, LIMIT - this.t).toFixed(1)} s` },
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#123524';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#15402b' : '#123524';
      ctx.fillRect(PAD + (i * (W - 2 * PAD)) / 10, PAD, (W - 2 * PAD) / 10, H - 2 * PAD);
    }
    ctx.strokeStyle = this.flash > 0 ? '#fff' : this.accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(PAD, PAD, W - 2 * PAD, H - 2 * PAD);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.moveTo(W / 2, PAD);
    ctx.lineTo(W / 2, H - PAD);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    if (this.target) {
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      ctx.beginPath();
      ctx.arc(this.target.x, this.target.y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    emoji(ctx, this.sport.props.ball ?? '⚽', this.bx, this.by, BR * 2.2);
    emoji(ctx, '🏃', this.px, this.py, PR * 2.4);
  }
}
