// Moteur commun : entrées clavier/tactile + interface des modes.

export const W = 800;
export const H = 450;

export type Key = 'up' | 'down' | 'left' | 'right' | 'jump';

/** État des entrées, alimenté par le clavier et les boutons tactiles. */
export class Input {
  held = new Set<Key>();
  pressed: Key[] = []; // appuis non encore consommés (pour QTE / saut)

  down(k: Key) {
    if (!this.held.has(k)) this.pressed.push(k);
    this.held.add(k);
  }
  up(k: Key) {
    this.held.delete(k);
  }
  consume(): Key[] {
    const p = this.pressed;
    this.pressed = [];
    return p;
  }
}

export const KEYMAP: Record<string, Key> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ' ': 'jump',
  Spacebar: 'jump',
};

export interface HudItem {
  label: string;
  value: string;
}

export interface ActivityResult {
  won: boolean;
  score: number; // points de l'activité, comptés dans le score total
  time?: number; // secondes (chaser / qte)
  details: string; // ligne de résultat affichée
  stats: Record<string, number>;
}

export interface Mode {
  update(dt: number, input: Input): void;
  draw(ctx: CanvasRenderingContext2D): void;
  hud(): HudItem[];
  /** Non nul dès que la partie est terminée. */
  result: ActivityResult | null;
  /** Tap sur le canvas (coordonnées canvas). */
  tap?(x: number, y: number, input: Input): void;
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function emoji(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number, flip = false) {
  ctx.save();
  ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillText(e, 0, 0);
  ctx.restore();
}

export function bigText(ctx: CanvasRenderingContext2D, text: string, color = '#fff') {
  ctx.save();
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.strokeText(text, W / 2, H / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, H / 2);
  ctx.restore();
}
