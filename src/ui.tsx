// Petits composants d'interface 16-bit.
import { useEffect, useState, type ReactNode } from 'react';
import { isMuted, onMuteChange, setMuted } from './sound';
import { isMusicOn, onMusicChange, setMusicOn } from './music';
import { getInputMode, onInputModeChange, readPads, setInputMode, type InputMode } from './game/gamepad';
import { spriteRatio, spriteUrl } from './sprites';

export function Sprite({ name, h, className }: { name: string; h: number; className?: string }) {
  return <img src={spriteUrl(name)} alt="" aria-hidden="true" width={Math.round(h * spriteRatio(name))} height={h} className={'sprite ' + (className ?? '')} />;
}

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="brand">
        <Sprite name="logo" h={40} />
        <span>GLOB’CHALLENGE</span>
      </div>
      <div className="topbar-right">
        {children}
        <InputModeButton />
        <MusicButton />
        <MuteButton />
      </div>
    </header>
  );
}

/** Bascule CLAVIER / MANETTE (mémorisée). En mode manette, indique si la manette est vue par le navigateur. */
export function InputModeButton() {
  const [mode, setMode] = useState<InputMode>(getInputMode());
  const [seen, setSeen] = useState(false);
  useEffect(() => onInputModeChange(setMode), []);
  useEffect(() => {
    if (mode !== 'manette') return;
    const check = () => setSeen(readPads().length > 0);
    check();
    const id = setInterval(check, 500);
    window.addEventListener('gamepadconnected', check);
    window.addEventListener('gamepaddisconnected', check);
    return () => {
      clearInterval(id);
      window.removeEventListener('gamepadconnected', check);
      window.removeEventListener('gamepaddisconnected', check);
    };
  }, [mode]);
  const pad = mode === 'manette';
  return (
    <button
      className={'px-btn input-btn' + (pad ? (seen ? ' pad-ok' : ' pad-wait') : '')}
      onClick={() => setInputMode(pad ? 'clavier' : 'manette')}
      title={pad ? (seen ? 'Manette détectée — cliquer pour passer au clavier' : 'Appuie sur un bouton de la manette pour la réveiller') : 'Passer en mode manette'}
    >
      {pad ? (seen ? 'MANETTE ✓' : 'MANETTE : APPUIE SUR A') : 'CLAVIER'}
    </button>
  );
}

/** Musique 8-bit on/off (mémorisée). */
export function MusicButton() {
  const [on, setOn] = useState(isMusicOn());
  useEffect(() => onMusicChange(setOn), []);
  return (
    <button className="px-btn sound-btn" onClick={() => setMusicOn(!on)} aria-label={on ? 'Couper la musique' : 'Activer la musique'}>
      {on ? 'MUSIQUE : OUI' : 'MUSIQUE : NON'}
    </button>
  );
}

/** Couper / remettre le son (mémorisé dans le navigateur). */
export function MuteButton() {
  const [muted, setM] = useState(isMuted());
  useEffect(() => {
    const off = onMuteChange(setM);
    return () => {
      off();
    };
  }, []);
  return (
    <button className="px-btn sound-btn" onClick={() => setMuted(!muted)} aria-label={muted ? 'Activer le son' : 'Couper le son'} title={muted ? 'Activer le son' : 'Couper le son'}>
      {muted ? 'SON : NON' : 'SON : OUI'}
    </button>
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
