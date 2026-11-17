// Accès aux sprites pixel-art : images pour le canvas, URLs pour le DOM.
import { SPRITES as BASE } from './spriteData';
import { ZONE_SPRITES } from './zoneAssets';

const SPRITES: Record<string, string> = { ...BASE, ...ZONE_SPRITES };

const urls: Record<string, string> = {};
const images: Record<string, HTMLImageElement> = {};

export function spriteUrl(name: string): string {
  if (!urls[name]) urls[name] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SPRITES[name] ?? '');
  return urls[name];
}

/** Rapport largeur / hauteur du sprite (d'après son viewBox). */
export function spriteRatio(name: string): number {
  const m = /viewBox="0 0 (\d+) (\d+)"/.exec(SPRITES[name] ?? '');
  return m ? Number(m[1]) / Number(m[2]) : 1;
}

function image(name: string): HTMLImageElement {
  if (!images[name]) {
    const img = new Image();
    img.src = spriteUrl(name);
    images[name] = img;
  }
  return images[name];
}

/** Précharge tous les sprites (à appeler au démarrage). */
export function preloadSprites() {
  Object.keys(SPRITES).forEach(image);
}

/** Dessine un sprite centré horizontalement, posé sur `bottom`, de hauteur `h`. */
export function drawSprite(ctx: CanvasRenderingContext2D, name: string, cx: number, bottom: number, h: number, opts: { flip?: boolean; rotate?: number; alpha?: number } = {}) {
  const img = image(name);
  if (!img.complete) return;
  const w = h * spriteRatio(name);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.translate(cx, bottom - h / 2);
  if (opts.rotate) ctx.rotate(opts.rotate);
  if (opts.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** Dessine un fond plein cadre (sprite 800×450 du design). Renvoie false s'il n'est pas encore chargé. */
export function drawBackground(ctx: CanvasRenderingContext2D, name: string, w: number, h: number): boolean {
  const img = image(name);
  if (!img.complete || !img.naturalWidth) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
  return true;
}

/** Hauteur de dessin pour qu'un sprite tienne dans une boîte carrée de `box` px. */
export function fitHeight(name: string, box: number) {
  const r = spriteRatio(name);
  return r > 1 ? box / r : box;
}
