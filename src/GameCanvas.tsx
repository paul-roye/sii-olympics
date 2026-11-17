// Canvas de jeu : boucle rAF, clavier, tactile, HUD et boutons de contrôle.
import { useEffect, useRef, useState } from 'react';
import { H, HudItem, Input, Key, KEYMAP, Mode, W, ActivityResult, bigText } from './game/engine';
import type { ModeKind, Sport, Zone } from './game/data';
import { Runner } from './game/runner';
import { Chaser } from './game/chaser';
import { Qte } from './game/qte';

const CONTROLS: Record<ModeKind, { key: Key; label: string; wide?: boolean }[]> = {
  runner: [{ key: 'jump', label: 'Sauter ⤒', wide: true }],
  chaser: [
    { key: 'left', label: '◀' },
    { key: 'up', label: '▲' },
    { key: 'down', label: '▼' },
    { key: 'right', label: '▶' },
  ],
  qte: [
    { key: 'left', label: '◀' },
    { key: 'up', label: '▲' },
    { key: 'down', label: '▼' },
    { key: 'right', label: '▶' },
  ],
};

function makeMode(kind: ModeKind, sport: Sport, accent: string): Mode {
  if (kind === 'runner') return new Runner(sport, accent);
  if (kind === 'chaser') return new Chaser(sport, accent);
  return new Qte(sport, accent);
}

interface Props {
  zone: Zone;
  kind: ModeKind;
  sport: Sport;
  step: number;
  onFinish: (r: ActivityResult) => void;
}

export function GameCanvas({ zone, kind, sport, step, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef(new Input());
  const modeRef = useRef<Mode | null>(null);
  const [hud, setHud] = useState<HudItem[]>([]);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const input = new Input();
    inputRef.current = input;
    const mode = makeMode(kind, sport, zone.accent);
    modeRef.current = mode;

    let countdown = 3; // décompte avant départ
    let endTimer = -1; // pause sur "Gagné / Perdu" avant l'écran de résultat
    let last = performance.now();
    let hudAcc = 0;
    let raf = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (countdown > 0) {
        countdown -= dt;
        input.consume();
      } else if (!mode.result) mode.update(dt, input);

      mode.draw(ctx);
      if (countdown > 0) bigText(ctx, String(Math.ceil(countdown)));
      else if (countdown > -0.6) {
        countdown -= dt;
        bigText(ctx, 'Partez !', zone.accent);
      }

      if (mode.result) {
        if (endTimer < 0) endTimer = 1.4;
        bigText(ctx, mode.result.won ? 'Gagné !' : 'Perdu...', mode.result.won ? '#3ccf6e' : '#e05050');
        endTimer -= dt;
        if (endTimer <= 0) {
          onFinish(mode.result);
          return;
        }
      }

      hudAcc += dt;
      if (hudAcc > 0.1) {
        hudAcc = 0;
        setHud(mode.hud());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const kd = (e: KeyboardEvent) => {
      const k = KEYMAP[e.key];
      if (k) {
        e.preventDefault();
        if (!e.repeat) input.down(k);
      }
    };
    const ku = (e: KeyboardEvent) => {
      const k = KEYMAP[e.key];
      if (k) input.up(k);
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, sport, zone, runId]);

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    modeRef.current?.tap?.(x, y, inputRef.current);
  };

  const btn = (k: Key) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      inputRef.current.down(k);
    },
    onPointerUp: () => inputRef.current.up(k),
    onPointerLeave: () => inputRef.current.up(k),
    onPointerCancel: () => inputRef.current.up(k),
  });

  return (
    <div className="game" style={{ ['--accent' as string]: zone.accent }}>
      <div className="game-top">
        <div className="game-title">
          <span className="step">Étape {step}/3</span>
          <strong>
            {sport.emoji} {sport.name}
          </strong>
          <span className="muted">
            {sport.flag} {sport.country}
          </span>
        </div>
        <div className="hud">
          {hud.map((h) => (
            <div key={h.label} className="hud-item">
              <span>{h.label}</span>
              <strong>{h.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <canvas ref={canvasRef} width={W} height={H} onPointerDown={onPointer} />
      <div className="game-bottom">
        <p className="rule">{sport.rule}</p>
        <div className="controls">
          {CONTROLS[kind].map((c) => (
            <button key={c.key} className={c.wide ? 'ctl wide' : 'ctl'} {...btn(c.key)}>
              {c.label}
            </button>
          ))}
          <button className="ctl reset" title="Recommencer l'épreuve" onClick={() => setRunId((n) => n + 1)}>
            ↺
          </button>
        </div>
      </div>
    </div>
  );
}
