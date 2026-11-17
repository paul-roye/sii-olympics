// Petits composants d'interface 16-bit.
import type { ReactNode } from 'react';
import { spriteRatio, spriteUrl } from './sprites';

export function Sprite({ name, h, className }: { name: string; h: number; className?: string }) {
  return <img src={spriteUrl(name)} alt="" aria-hidden="true" width={Math.round(h * spriteRatio(name))} height={h} className={'sprite ' + (className ?? '')} />;
}

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="brand">
        <Sprite name="logo" h={40} />
        <span>
          TOUR DU MONDE
          <br />
          DES SPORTS
        </span>
      </div>
      <div className="topbar-right">{children}</div>
    </header>
  );
}

export function MedalCounter({ value, total }: { value: number; total: number }) {
  return (
    <div className="medal-counter">
      <Sprite name="gold" h={28} />
      <span className="lbl">MÉDAILLES</span>
      <span className="val">
        {String(value).padStart(2, '0')}/{total}
      </span>
    </div>
  );
}

export function openLeaderboardWindow() {
  window.open(`${location.pathname}?view=classement`, 'classement', 'popup,width=900,height=760');
}
