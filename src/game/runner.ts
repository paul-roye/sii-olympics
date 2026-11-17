// Mode "runner" : vue de côté, avance auto, sauter les obstacles, 1000 m.
import { emoji, H, type Input, type Mode, type HudItem, type ActivityResult, rand, W } from './engine';
import type { Sport } from './data';

const PX_PER_M = 10; // 1000 m = 10 000 px ≈ 25 s de course
const GOAL_M = 1000;
const GROUND = H - 80;
const PLAYER_X = 140;
const JUMP_V = 620;
const GRAVITY = 1700;

interface Thing { x: number; y: number; e: string; hit?: boolean; size: number }

export class Runner implements Mode {
  result: ActivityResult | null = null;
  private dist = 0; // px parcourus
  private t = 0;
  private y = GROUND; // pieds du joueur
  private vy = 0;
  private lives = 2;
  private invul = 0;
  private points = 0;
  private collected = 0;
  private obstacles: Thing[] = [];
  private items: Thing[] = [];
  private nextObstacle = 600;
  private nextItem = 400;

  private sport: Sport;
  private accent: string;

  constructor(sport: Sport, accent: string) {
    this.sport = sport;
    this.accent = accent;
  }

  private get speed() {
    return 300 + 220 * Math.min(1, this.dist / (GOAL_M * PX_PER_M));
  }

  private jump() {
    if (this.y >= GROUND) this.vy = -JUMP_V;
  }

  tap(_x: number, _y: number) {
    this.jump();
  }

  update(dt: number, input: Input) {
    if (this.result) return;
    for (const k of input.consume()) if (k === 'jump' || k === 'up') this.jump();

    this.t += dt;
    const dx = this.speed * dt;
    this.dist += dx;

    // physique du saut
    this.vy += GRAVITY * dt;
    this.y = Math.min(GROUND, this.y + this.vy * dt);
    if (this.y >= GROUND) this.vy = 0;
    this.invul = Math.max(0, this.invul - dt);

    // génération (en coordonnées écran, à droite)
    this.nextObstacle -= dx;
    if (this.nextObstacle <= 0 && this.dist < (GOAL_M - 40) * PX_PER_M) {
      const obs = this.sport.props.obstacles ?? ['🪨'];
      this.obstacles.push({ x: W + 40, y: GROUND - 22, e: obs[Math.floor(Math.random() * obs.length)], size: 44 });
      this.nextObstacle = rand(0.75, 1.5) * this.speed + 120;
    }
    this.nextItem -= dx;
    if (this.nextItem <= 0) {
      this.items.push({ x: W + 40, y: GROUND - rand(90, 170), e: this.sport.props.collectible ?? '⭐', size: 30 });
      this.nextItem = rand(250, 600);
    }

    for (const o of this.obstacles) o.x -= dx;
    for (const i of this.items) i.x -= dx;
    this.obstacles = this.obstacles.filter((o) => o.x > -60);
    this.items = this.items.filter((i) => i.x > -60 && !i.hit);

    // collisions (boîtes simples)
    const py = this.y - 28;
    for (const o of this.obstacles) {
      if (!o.hit && this.invul === 0 && Math.abs(o.x - PLAYER_X) < 32 && Math.abs(o.y - py) < 36) {
        o.hit = true;
        this.lives--;
        this.invul = 1.2;
      }
    }
    for (const i of this.items) {
      if (Math.abs(i.x - PLAYER_X) < 30 && Math.abs(i.y - py) < 36) {
        i.hit = true;
        this.points += 5;
        this.collected++;
      }
    }

    if (this.lives <= 0) this.finish(false);
    else if (this.dist >= GOAL_M * PX_PER_M) this.finish(true);
  }

  private finish(won: boolean) {
    const lost = 2 - this.lives;
    const score = Math.max(0, this.points + (won ? 50 : 0) - lost * 10);
    this.result = {
      won,
      score,
      details: `${Math.floor(this.meters)} m · ${this.collected} bonus · ${score} pts`,
      stats: { meters: Math.floor(this.meters), collected: this.collected, livesLost: lost },
    };
  }

  private get meters() {
    return Math.min(GOAL_M, this.dist / PX_PER_M);
  }

  hud(): HudItem[] {
    return [
      { label: 'Distance', value: `${Math.floor(this.meters)} / ${GOAL_M} m` },
      { label: 'Score', value: String(this.points) },
      { label: 'Vies', value: '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(2 - Math.max(0, this.lives)) },
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    // ciel
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d1b3d');
    g.addColorStop(1, '#1d3a6e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // décor parallaxe
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let i = 0; i < 6; i++) {
      const x = ((i * 180 - this.dist * 0.2) % (W + 200) + W + 200) % (W + 200) - 100;
      ctx.beginPath();
      ctx.arc(x, GROUND - 10, 90, Math.PI, 0);
      ctx.fill();
    }
    // sol
    ctx.fillStyle = this.accent;
    ctx.fillRect(0, GROUND, W, 4);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, GROUND + 4, W, H - GROUND);
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    for (let x = -(this.dist % 60); x < W; x += 60) ctx.fillRect(x, GROUND + 20, 30, 3);

    // ligne d'arrivée
    const finishX = PLAYER_X + (GOAL_M * PX_PER_M - this.dist);
    if (finishX < W + 20) {
      for (let y = 0; y < 8; y++) {
        ctx.fillStyle = y % 2 ? '#fff' : '#111';
        ctx.fillRect(finishX, GROUND - 160 + y * 20, 12, 20);
      }
    }

    for (const i of this.items) emoji(ctx, i.e, i.x, i.y, i.size);
    for (const o of this.obstacles) if (!o.hit) emoji(ctx, o.e, o.x, o.y, o.size);

    const blink = this.invul > 0 && Math.floor(this.invul * 10) % 2 === 0;
    if (!blink) emoji(ctx, this.sport.emoji, PLAYER_X, this.y - 28, 54, true);
  }
}
