// Manette (Gamepad API, mapping « standard » : Xbox via dongle sans fil, câble ou Bluetooth).
// L'API ne fournit pas d'événements d'appui : on lit l'état à chaque frame (poll) et on compare
// avec la frame précédente pour alimenter Input en touches logiques, comme le clavier.
import type { Input, Key } from './engine';

/** Indices des boutons du mapping « standard » (disposition Xbox). */
export const BTN = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  VIEW: 8,
  MENU: 9,
  LS: 10,
  RS: 11,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
  HOME: 16,
} as const;

export const BTN_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', '▲', '▼', '◀', '▶', 'Xbox'];

/** Boutons associés aux 6 choix de l'épreuve « figures » (lettres proposées à l'écran). */
export const SLOT_BUTTONS = [BTN.A, BTN.B, BTN.X, BTN.Y, BTN.LB, BTN.RB];

export const DEADZONE = 0.35;
const TRIGGER = 0.5; // seuil des gâchettes analogiques LT / RT

/** Première manette connectée (la plus récente lecture, à refaire à chaque frame). */
export function readPad(): Gamepad | null {
  if (!('getGamepads' in navigator)) return null;
  for (const p of navigator.getGamepads()) if (p && p.connected) return p;
  return null;
}

export function isDown(p: Gamepad, i: number): boolean {
  const b = p.buttons[i];
  if (!b) return false;
  return i === BTN.LT || i === BTN.RT ? b.value > TRIGGER : b.pressed;
}

/**
 * Touches logiques maintenues :
 * - croix ou stick gauche → up / down / left / right
 * - A → jump ; LB/LT → left, RB/RT → right (alternance de la course)
 * - 'slot0'..'slot5' → A, B, X, Y, LB, RB (choix des figures)
 */
export function logicalKeys(p: Gamepad): Set<Key> {
  const k = new Set<Key>();
  const [ax = 0, ay = 0] = p.axes;
  if (isDown(p, BTN.UP) || ay < -DEADZONE) k.add('up');
  if (isDown(p, BTN.DOWN) || ay > DEADZONE) k.add('down');
  if (isDown(p, BTN.LEFT) || ax < -DEADZONE || isDown(p, BTN.LB) || isDown(p, BTN.LT)) k.add('left');
  if (isDown(p, BTN.RIGHT) || ax > DEADZONE || isDown(p, BTN.RB) || isDown(p, BTN.RT)) k.add('right');
  if (isDown(p, BTN.A)) k.add('jump');
  SLOT_BUTTONS.forEach((b, i) => isDown(p, b) && k.add(`slot${i}`));
  return k;
}

/** Transforme l'état de la manette en appuis / relâchements sur un Input. */
export class GamepadInput {
  private prev = new Set<Key>();

  /** À appeler une fois par frame. Renvoie la manette lue (ou null). */
  poll(input: Input): Gamepad | null {
    const p = readPad();
    const now = p ? logicalKeys(p) : new Set<Key>();
    for (const k of now) if (!this.prev.has(k)) input.down(k);
    for (const k of this.prev) if (!now.has(k)) input.up(k);
    this.prev = now;
    return p;
  }
}

/** Vibration (Chrome / Edge). Sans effet si non supportée. */
export function rumble(p: Gamepad | null, ms = 200, strong = 0.8, weak = 0.4) {
  const act = (p as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } }) | null)
    ?.vibrationActuator;
  act?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
}

/**
 * Épreuve « figures » : traduit 'slotN' en la lettre affichée en position N,
 * pour les appuis (séquences) comme pour les touches maintenues (accords).
 */
export class SlotMapper {
  private added = new Set<Key>();

  apply(input: Input, letters: string[]) {
    const letterOf = (k: Key) => (k.startsWith('slot') ? letters[Number(k.slice(4))] : undefined);
    for (const l of this.added) input.held.delete(l);
    this.added.clear();
    for (const k of input.held) {
      const l = letterOf(k);
      if (l && !input.held.has(l)) {
        input.held.add(l);
        this.added.add(l);
      }
    }
    input.pressed = input.pressed.map((k) => letterOf(k) ?? k);
  }
}
