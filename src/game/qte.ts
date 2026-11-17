// Mode "qte" : course à dos d'animal contre un rival IA, piloté par Quick Time Events.
import { emoji, H, type Input, type Key, type Mode, type HudItem, type ActivityResult, W } from './engine';
import type { Sport } from './data';

const GOAL_M = 1000;
const RIVAL_SPEED = 17; // m/s
const DECAY = 0.32; // élan perdu par seconde
const ARROWS: { key: Key; label: string }[] = [
  { key: 'left', label: '◀' },
  { key: 'up', label: '▲' },
  { key: 'right', label: '▶' },
  { key: 'down', label: '▼' },
];

export class Qte implements Mode {
  result: ActivityResult | null = null;
  private t = 0;
  private pos = 0; // m
  private rival = 0; // m
  private elan = 0.6;
  private points = 0;
  private streak = 0;
  private ok = 0;
  private ko = 0;
  private prompt = ARROWS[0];
  private window = 1.15;
  private left = 1.15;
  private gap = 0.6; // pause avant la première flèche
  private redFlash = 0;
  private greenFlash = 0;

  private sport: Sport;
  private accent: string;

  constructor(sport: Sport, accent: string) {
    this.sport = sport;
    this.accent = accent;
  }

  private newPrompt() {
    let next = this.prompt;
    while (next === this.prompt) next = ARROWS[Math.floor(Math.random() * 4)];
    this.prompt = next;
    this.window = 1.15 - 0.6 * Math.min(1, this.pos / GOAL_M);
    this.left = this.window;
  }

  private miss() {
    this.ko++;
    this.streak = 0;
    this.elan /= 2.4;
    this.redFlash = 0.3;
    this.gap = 0.15;
  }

  update(dt: number, input: Input) {
    if (this.result) return;
    this.t += dt;
    this.redFlash = Math.max(0, this.redFlash - dt);
    this.greenFlash = Math.max(0, this.greenFlash - dt);
    const presses = input.consume().filter((k) => k !== 'jump');

    if (this.gap > 0) {
      this.gap -= dt;
      if (this.gap <= 0) this.newPrompt();
    } else {
      if (presses.length) {
        if (presses[0] === this.prompt.key) {
          this.ok++;
          this.streak++;
          this.elan = 1;
          this.points += 10 + 2 * Math.min(5, this.streak - 1); // bonus de série plafonné à +10
          this.greenFlash = 0.15;
          this.gap = 0.12;
        } else this.miss();
      } else {
        this.left -= dt;
        if (this.left <= 0) this.miss();
      }
    }

    this.elan = Math.max(0, this.elan - DECAY * dt);
    this.pos += (4 + 26 * this.elan) * dt;
    this.rival += RIVAL_SPEED * dt;

    if (this.pos >= GOAL_M) this.finish(true);
    else if (this.rival >= GOAL_M) this.finish(false);
  }

  private finish(won: boolean) {
    const score = this.points + (won ? 50 : 0);
    this.result = {
      won,
      score,
      time: this.t,
      details: `⏱ ${this.t.toFixed(1)} s · QTE réussis : ${this.ok} · ratés : ${this.ko}`,
      stats: { time: Math.round(this.t * 10) / 10, qteOk: this.ok, qteKo: this.ko },
    };
  }

  hud(): HudItem[] {
    return [
      { label: 'Toi', value: `${Math.floor(Math.min(this.pos, GOAL_M))} m` },
      { label: 'Rival', value: `${Math.floor(Math.min(this.rival, GOAL_M))} m` },
      { label: 'Score', value: String(this.points) },
      { label: 'Série', value: this.streak > 1 ? `🔥 x${this.streak}` : '—' },
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d1b3d');
    g.addColorStop(1, '#3a2a1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (this.redFlash > 0) {
      ctx.fillStyle = `rgba(255,40,40,${this.redFlash})`;
      ctx.fillRect(0, 0, W, H);
    }

    // barres de progression
    const bar = (y: number, v: number, color: string, label: string) => {
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.fillRect(120, y, W - 160, 10);
      ctx.fillStyle = color;
      ctx.fillRect(120, y, (W - 160) * Math.min(1, v / GOAL_M), 10);
      ctx.fillStyle = '#fff';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 110, y + 5);
    };
    bar(20, this.pos, this.accent, 'Toi');
    bar(40, this.rival, '#c33', 'Rival IA');

    // piste (caméra centrée sur le joueur)
    const trackY = H - 90;
    const pxPerM = 8;
    const cam = this.pos;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, trackY, W, H - trackY);
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    for (let m = Math.floor((cam - 40) / 10) * 10; m < cam + 80; m += 10) {
      const x = 200 + (m - cam) * pxPerM;
      ctx.fillRect(x, trackY + 40, 3, 20);
    }
    const finishX = 200 + (GOAL_M - cam) * pxPerM;
    if (finishX < W) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(finishX, trackY - 120, 6, 160);
    }
    const bob = (t: number) => Math.abs(Math.sin(t * 12)) * 8;
    const rivalX = 200 + (this.rival - cam) * pxPerM;
    if (rivalX > -50 && rivalX < W + 50) emoji(ctx, this.sport.props.rival ?? this.sport.emoji, rivalX, trackY - 20 - bob(this.t + 1), 56, true);
    else {
      ctx.fillStyle = '#c33';
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = rivalX < 0 ? 'left' : 'right';
      ctx.fillText(rivalX < 0 ? '◀ rival' : 'rival ▶', rivalX < 0 ? 10 : W - 10, trackY - 20);
    }
    emoji(ctx, this.sport.emoji, 200, trackY + 10 - bob(this.t), 64, true);

    // jauge d'élan
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(20, 70, 14, 180);
    ctx.fillStyle = this.elan > 0.5 ? '#3ccf6e' : this.elan > 0.25 ? '#f2c94c' : '#e05050';
    ctx.fillRect(20, 70 + 180 * (1 - this.elan), 14, 180 * this.elan);
    ctx.fillStyle = '#fff';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('élan', 27, 262);

    // flèche QTE
    if (this.gap <= 0) {
      const cx = W / 2;
      const cy = 160;
      ctx.fillStyle = this.greenFlash > 0 ? '#3ccf6e' : 'rgba(0,0,0,.5)';
      ctx.beginPath();
      ctx.roundRect(cx - 55, cy - 55, 110, 110, 18);
      ctx.fill();
      ctx.strokeStyle = this.accent;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (this.left / this.window));
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 64px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.prompt.label, cx, cy + 4);
    }
    if (this.streak > 1) {
      ctx.fillStyle = '#ffb347';
      ctx.font = 'bold 22px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`🔥 x${this.streak}`, W / 2, 255);
    }
  }
}
