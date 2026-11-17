// Navigation des menus à la manette : croix / stick = élément focusable précédent / suivant, A = valider.
// Désactivée pendant une épreuve (GameCanvas lit la manette lui-même).
import { useEffect } from 'react';
import { Input } from './game/engine';
import { GamepadInput } from './game/gamepad';
import { sfx } from './sound';

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select, textarea';

export function useGamepadMenu(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const input = new Input();
    const gp = new GamepadInput();
    gp.prime();
    let raf = 0;
    const loop = () => {
      gp.poll(input);
      for (const k of input.consume()) {
        const active = document.activeElement as HTMLElement | null;
        if (!active || active === document.body) {
          // rien de sélectionné : on se place sur l'action principale, sans la déclencher
          const primary = document.querySelector<HTMLElement>('.px-btn.accent:not(:disabled)') ?? document.querySelector<HTMLElement>(FOCUSABLE);
          primary?.focus();
          sfx.move();
          continue;
        }
        if (k === 'jump') {
          const el = document.activeElement as HTMLElement | null;
          if (el && el !== document.body) el.click(); // le clic joue déjà le son de validation
          else document.querySelector<HTMLElement>(FOCUSABLE)?.focus();
        } else if (k === 'up' || k === 'down' || k === 'left' || k === 'right') {
          const list = [...document.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((e) => e.offsetParent !== null);
          if (!list.length) continue;
          const i = list.indexOf(document.activeElement as HTMLElement);
          const dir = k === 'up' || k === 'left' ? -1 : 1;
          const next = list[i < 0 ? 0 : (i + dir + list.length) % list.length];
          next.focus();
          sfx.move();
          next.scrollIntoView({ block: 'nearest' });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
}
