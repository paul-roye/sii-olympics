// Écran d'épreuve : boucle rAF, clavier, tactile, HUD et boutons de contrôle (style 16-bit).
import { useEffect, useRef, useState } from 'react';
import { bigText, C, H, keyFromEvent, W, Input, type ActivityResult, type HudItem, type Key, type Mode } from './game/engine';
import { MODE_LABEL, type ModeKind, type Sport, type Zone } from './game/data';
import { Tricks } from './game/tricks';
import { Chaser } from './game/chaser';
import { Race } from './game/race';
import { Header, MedalCounter, Sprite } from './ui';
import { sfx } from './sound';
import { BTN_NAMES, GamepadInput, getInputMode, onInputModeChange, rumble, SLOT_BUTTONS, SlotMapper } from './game/gamepad';

const KEYS_HELP: Record<ModeKind, string> = {
  tricks: 'Clavier : tape la LETTRE affichée · à partir de 25 s, 2 touches EN MÊME TEMPS',
  chaser: 'Clavier : flèches · ou touche le terrain pour t’y déplacer',
  race: 'Clavier : alterne ◀ ▶ · saute avec ▲ ou ESPACE',
};
const PAD_HELP: Record<ModeKind, string> = {
  tricks: 'Manette : appuie sur le BOUTON indiqué sous la lettre · après 25 s, 2 boutons ENSEMBLE',
  chaser: 'Manette : stick gauche ou croix',
  race: 'Manette : alterne LB / RB (ou LT / RT) · saute avec A',
};
const SLOT_LABELS = SLOT_BUTTONS.map((b) => BTN_NAMES[b]);

function makeMode(kind: ModeKind, sport: Sport, accent: string): Mode {
  if (kind === 'tricks') return new Tricks(sport, accent);
  if (kind === 'chaser') return new Chaser(sport, accent);
  return new Race(sport, accent);
}

interface Props {
  zone: Zone;
  kind: ModeKind;
  sport: Sport;
  step: number; // 0..2
  medals: number;
  onFinish: (r: ActivityResult) => void;
}

export function GameCanvas({ zone, kind, sport, step, medals, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef(new Input());
  const modeRef = useRef<Mode | null>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const [hud, setHud] = useState<HudItem[]>([]);
  const [letters, setLetters] = useState<string[]>([]);
  const [padOn, setPadOn] = useState(() => getInputMode() === 'manette');
  useEffect(() => onInputModeChange((m) => setPadOn(m === 'manette')), []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const input = new Input();
    inputRef.current = input;
    const mode = makeMode(kind, sport, zone.accent);
    modeRef.current = mode;

    let countdown = 3;
    sfx.count();
    let endTimer = -1;
    let last = performance.now();
    let hudAcc = 1;
    let raf = 0;
    const gp = new GamepadInput();
    gp.prime();
    const slots = new SlotMapper();
    let pad: Gamepad | null = null;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      pad = gp.poll(input);
      const shown = mode.touchLetters?.() ?? [];
      slots.apply(input, shown);
      // manette branchée : l'épreuve figures affiche le bouton à presser plutôt que la lettre
      mode.setLabeler?.(getInputMode() === 'manette' ? (l) => SLOT_LABELS[shown.indexOf(l)] ?? l.toUpperCase() : null);
      if (countdown > 0) {
        const before = Math.ceil(countdown);
        countdown -= dt;
        if (countdown <= 0) sfx.go();
        else if (Math.ceil(countdown) !== before) sfx.count();
        input.consume();
      } else if (!mode.result) mode.update(dt, input);

      mode.draw(ctx);
      if (countdown > 0) bigText(ctx, String(Math.ceil(countdown)), C.gold);
      else if (countdown > -0.6) {
        countdown -= dt;
        bigText(ctx, 'PARTEZ !', zone.accent);
      }
      if (mode.result) {
        if (endTimer < 0) {
          endTimer = 1.4;
          if (mode.result.won) sfx.win();
          else sfx.lose();
          rumble(pad, mode.result.won ? 150 : 400, mode.result.won ? 0.3 : 1);
        }
        bigText(ctx, mode.result.won ? 'GAGNÉ !' : 'PERDU...', mode.result.won ? C.ok : C.alert);
        endTimer -= dt;
        if (endTimer <= 0) {
          finishRef.current(mode.result);
          return;
        }
      }
      hudAcc += dt;
      if (hudAcc > 0.1) {
        hudAcc = 0;
        setHud(mode.hud());
        setLetters(mode.touchLetters?.() ?? []);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const kd = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = keyFromEvent(e);
      if (k) {
        e.preventDefault();
        if (!e.repeat) input.down(k);
      }
    };
    const ku = (e: KeyboardEvent) => {
      const k = keyFromEvent(e);
      if (k) input.up(k);
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [kind, sport, zone]);

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    modeRef.current?.tap?.(((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * H, inputRef.current);
  };

  /** Bouton maintenu (déplacements du ballon). */
  const hold = (k: Key) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      inputRef.current.down(k);
    },
    onPointerUp: () => inputRef.current.up(k),
    onPointerLeave: () => inputRef.current.up(k),
    onPointerCancel: () => inputRef.current.up(k),
  });
  /** Bouton à appui unique (course, lettres). */
  const tap = (k: Key) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      inputRef.current.tap(k);
    },
  });

  return (
    <div className="screen" style={{ ['--accent' as string]: zone.accent }}>
      <Header>
        <span className="chip accent">{zone.name.toUpperCase()}</span>
        <div className="steps">
          <span className="lbl">ÉTAPE {step + 1}/3</span>
          {[0, 1, 2].map((i) => (
            <span key={i} className={'step-dot' + (i <= step ? ' on' : '')}>
              {i + 1}
            </span>
          ))}
        </div>
        <MedalCounter value={medals} total={3} />
      </Header>
      <main className="wrap game">
        <div className="game-head">
          <div className="title">
            <Sprite name={sport.flag} h={40} className="flag" />
            <div>
              <span className="kicker">{MODE_LABEL[kind]}</span>
              <h1>{sport.name.toUpperCase()}</h1>
              <span className="country">{sport.country}</span>
            </div>
          </div>
          <div className="hud">
            {hud.map((h) => (
              <div key={h.label} className="hud-item">
                <span className="lbl">{h.label}</span>
                <strong>{h.value}</strong>
                {h.progress != null && (
                  <div className="bar">
                    <div style={{ width: `${Math.round(h.progress * 100)}%`, background: h.color ?? 'var(--accent)' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="screen-frame">
          <div className="crt">
            <canvas ref={canvasRef} width={W} height={H} onPointerDown={onPointer} />
            <div className="scanlines" aria-hidden="true" />
          </div>
        </div>
        <div className="rule-box">
          <span className="chip accent">RÈGLE</span>
          <p>{sport.rule}</p>
        </div>
        <div className="controls">
          <div className="pad">
            {kind === 'race' && (
              <>
                <button className="px-btn big" {...tap('left')} aria-label="Gauche">◀</button>
                <button className="px-btn big" {...tap('right')} aria-label="Droite">▶</button>
                <button className="px-btn big accent" {...tap('jump')}>
                  <Sprite name="jump" h={18} /> SAUTER
                </button>
              </>
            )}
            {kind === 'chaser' &&
              (['left', 'up', 'down', 'right'] as const).map((k) => (
                <button key={k} className="px-btn big" {...hold(k)} aria-label={k}>
                  {{ left: '◀', up: '▲', down: '▼', right: '▶' }[k]}
                </button>
              ))}
            {kind === 'tricks' &&
              (letters.length ? letters : ['·', '·', '·', '·', '·', '·']).map((l, i) => (
                <button key={i + l} className="px-btn letter" disabled={l === '·'} {...(l !== '·' ? hold(l) : {})}>
                  {l.toUpperCase()}
                  {padOn && <span className="pad-hint">{SLOT_LABELS[i]}</span>}
                </button>
              ))}
          </div>
          <span className="help">{padOn ? PAD_HELP[kind] : KEYS_HELP[kind]}</span>
        </div>
      </main>
    </div>
  );
}
