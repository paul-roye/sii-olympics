// Moteur commun : entrées clavier/tactile, interface des modes, helpers de dessin 16-bit.

export const W = 800;
export const H = 450;

/** Touches logiques : directions, saut, ou une lettre 'a'..'z'. */
export type Key = 'up' | 'down' | 'left' | 'right' | 'jump' | string;

/** État des entrées, alimenté par le clavier et les boutons tactiles. */
export class Input {
  held = new Set<Key>();
  pressed: Key[] = []; // appuis non encore consommés
  /** Direction analogique du stick gauche (null si au repos ou pas de manette). */
  analog: { x: number; y: number } | null = null;

  down(k: Key) {
    if (!this.held.has(k)) this.pressed.push(k);
    this.held.add(k);
  }
  up(k: Key) {
    this.held.delete(k);
  }
  /** Appui ponctuel (bouton tactile ou bot). */
  tap(k: Key) {
    this.pressed.push(k);
  }
  consume(): Key[] {
    const p = this.pressed;
    this.pressed = [];
    return p;
  }
}

export function keyFromEvent(e: KeyboardEvent): Key | null {
  switch (e.key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    case ' ':
    case 'Spacebar':
      return 'jump';
  }
  if (/^[a-z]$/i.test(e.key)) return e.key.toLowerCase();
  return null;
}

export interface HudItem {
  label: string;
  value: string;
  /** 0..1 : affiche une barre de progression sous la valeur. */
  progress?: number;
  color?: string;
}

export interface ActivityResult {
  won: boolean;
  score: number; // points de l'activité, comptés dans le score total
  time?: number; // secondes (ballon / course), compte dans le chrono jeux 2 + 3 si réussi
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
  /** Lettres à proposer en boutons tactiles (épreuve figures). */
  touchLetters?(): string[];
  /** Texte affiché pour une lettre (ex. nom du bouton de manette), null = la lettre. */
  setLabeler?(f: ((letter: string) => string) | null): void;
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const C = {
  night0: '#070A24',
  night1: '#0A0F33',
  night2: '#0E1542',
  night3: '#121B52',
  panel: '#121A4D',
  panel2: '#1C2768',
  line: '#2A3680',
  ink: '#0A0A1A',
  cream: '#F7F3E8',
  text2: '#B4BDEB',
  gold: '#FFD23F',
  ok: '#3CC84B',
  alert: '#F0414A',
};

export const PIXEL_FONT = '"Press Start 2P", monospace';

/** Fond nocturne en paliers (dégradé 16 couleurs). */
export function steppedSky(ctx: CanvasRenderingContext2D, bottom = H) {
  const bands = [C.night0, C.night1, C.night2, C.night3];
  const stops = [0, 0.14, 0.38, 0.66, 1];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = bands[i];
    ctx.fillRect(0, Math.floor(stops[i] * bottom), W, Math.ceil((stops[i + 1] - stops[i]) * bottom));
  }
}

/** Texte pixel avec ombre portée crantée. */
export function pixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color = C.cream, align: CanvasTextAlign = 'center') {
  ctx.save();
  ctx.font = `${size}px ${PIXEL_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (color !== C.ink) {
    ctx.fillStyle = C.ink;
    ctx.fillText(text, x + size / 8 + 2, y + size / 8 + 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function bigText(ctx: CanvasRenderingContext2D, text: string, color: string = C.cream) {
  pixelText(ctx, text, W / 2, H / 2, 40, color);
}

/** Boîte à bordure crantée (coins mordus de 4 px). */
export function notchedBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, border: string = C.ink) {
  ctx.fillStyle = border;
  ctx.fillRect(x, y - 4, w, h + 8);
  ctx.fillRect(x - 4, y, w + 8, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.fillRect(x, y, w, 4);
  ctx.fillRect(x, y, 4, h);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x, y + h - 4, w, 4);
  ctx.fillRect(x + w - 4, y, 4, h);
}
