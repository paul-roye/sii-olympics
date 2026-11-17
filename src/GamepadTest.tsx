// Page de test manette : ?view=manette. Vérifie qu'une manette (Xbox + dongle) est vue par le navigateur
// et montre les touches logiques que le jeu recevrait.
import { useEffect, useState } from 'react';
import { Input } from './game/engine';
import { BTN_NAMES, DEADZONE, GamepadInput, isDown, rumble } from './game/gamepad';
import { Header } from './ui';

interface View {
  supported: boolean;
  pad: { id: string; index: number; mapping: string; buttons: boolean[]; values: number[]; axes: number[]; vibration: boolean } | null;
  held: string[];
}

const LOGICAL_LABEL: Record<string, string> = {
  up: 'HAUT',
  down: 'BAS',
  left: 'GAUCHE',
  right: 'DROITE',
  jump: 'SAUT',
  slot0: 'CHOIX 1 (A)',
  slot1: 'CHOIX 2 (B)',
  slot2: 'CHOIX 3 (X)',
  slot3: 'CHOIX 4 (Y)',
  slot4: 'CHOIX 5 (LB)',
  slot5: 'CHOIX 6 (RB)',
};

function Stick({ x, y, label }: { x: number; y: number; label: string }) {
  const active = Math.hypot(x, y) > DEADZONE;
  return (
    <div className="gp-stick-wrap">
      <div className="gp-stick">
        <div className="gp-dead" style={{ width: `${DEADZONE * 100}%`, height: `${DEADZONE * 100}%` }} />
        <div className={'gp-dot' + (active ? ' on' : '')} style={{ left: `${50 + x * 45}%`, top: `${50 + y * 45}%` }} />
      </div>
      <span className="lbl">
        {label} {x.toFixed(2)} / {y.toFixed(2)}
      </span>
    </div>
  );
}

export function GamepadTest() {
  const [view, setView] = useState<View>({ supported: 'getGamepads' in navigator, pad: null, held: [] });
  const [log, setLog] = useState<string[]>([]);
  const [race, setRace] = useState({ steps: 0, last: '' });

  useEffect(() => {
    const input = new Input();
    const gp = new GamepadInput(true);
    let raf = 0;
    let lastSide = '';
    const loop = () => {
      const p = gp.poll(input);
      const pressed = input.consume();
      if (pressed.length) {
        setLog((l) => [...pressed.map((k) => `${new Date().toLocaleTimeString()} · ${LOGICAL_LABEL[k] ?? k}`).reverse(), ...l].slice(0, 12));
        for (const k of pressed) {
          // mini-test « course » : compte les alternances gauche / droite
          if ((k === 'left' || k === 'right') && k !== lastSide) {
            lastSide = k;
            setRace((r) => ({ steps: r.steps + 1, last: k }));
          }
        }
      }
      setView({
        supported: 'getGamepads' in navigator,
        held: [...input.held],
        pad: p && {
          id: p.id,
          index: p.index,
          mapping: p.mapping || '(aucun)',
          buttons: p.buttons.map((_, i) => isDown(p, i)),
          values: p.buttons.map((b) => b.value),
          axes: [...p.axes],
          vibration: 'vibrationActuator' in p && !!(p as { vibrationActuator?: unknown }).vibrationActuator,
        },
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onConn = (e: GamepadEvent) => setLog((l) => [`Connectée : ${e.gamepad.id}`, ...l].slice(0, 12));
    const onDisc = (e: GamepadEvent) => setLog((l) => [`Déconnectée : ${e.gamepad.id}`, ...l].slice(0, 12));
    window.addEventListener('gamepadconnected', onConn);
    window.addEventListener('gamepaddisconnected', onDisc);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('gamepadconnected', onConn);
      window.removeEventListener('gamepaddisconnected', onDisc);
    };
  }, []);

  const { pad } = view;
  const [lx = 0, ly = 0, rx = 0, ry = 0] = pad?.axes ?? [];

  return (
    <div className="screen">
      <Header>
        <span className="chip accent">TEST MANETTE</span>
      </Header>
      <main className="wrap gp-test">
        {!view.supported && <p className="gp-status ko">Ce navigateur ne gère pas la Gamepad API. Utilise Chrome ou Edge.</p>}
        {view.supported && !pad && (
          <div className="gp-status wait">
            <strong>Aucune manette détectée.</strong>
            <ol>
              <li>Branche le dongle Xbox et allume la manette (bouton Xbox fixe, pas clignotant).</li>
              <li>Clique dans cette page pour lui donner le focus.</li>
              <li>
                <b>Appuie sur un bouton (A)</b> : le navigateur ne montre la manette qu’après un premier appui.
              </li>
            </ol>
          </div>
        )}
        {pad && (
          <>
            <div className="gp-status ok">
              <strong>Manette détectée ✓</strong>
              <span>
                #{pad.index} · {pad.id}
              </span>
              <span>
                Mapping : <b>{pad.mapping}</b>
                {pad.mapping !== 'standard' && ' ⚠ non standard : les boutons risquent d’être mal associés'}
              </span>
            </div>

            <section>
              <h2>Boutons</h2>
              <div className="gp-buttons">
                {BTN_NAMES.map((n, i) => (
                  <div key={n} className={'gp-btn' + (pad.buttons[i] ? ' on' : '')}>
                    {n}
                    {(i === 6 || i === 7) && <small>{Math.round((pad.values[i] ?? 0) * 100)}%</small>}
                  </div>
                ))}
              </div>
            </section>

            <section className="gp-sticks">
              <Stick x={lx} y={ly} label="Stick G" />
              <Stick x={rx} y={ry} label="Stick D" />
            </section>

            <section>
              <h2>Ce que le jeu reçoit</h2>
              <div className="gp-buttons">
                {Object.entries(LOGICAL_LABEL).map(([k, l]) => (
                  <div key={k} className={'gp-btn wide' + (view.held.includes(k) ? ' on' : '')}>
                    {l}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2>Mini-test course</h2>
              <p>
                Alterne LB / RB (ou ◀ ▶) : <strong className="gp-big">{race.steps}</strong> foulées{' '}
                <button onClick={() => setRace({ steps: 0, last: '' })}>Remettre à 0</button>
              </p>
            </section>

            <section>
              <h2>Vibration</h2>
              <button disabled={!pad.vibration} onClick={() => rumble(navigator.getGamepads()[pad.index], 400)}>
                {pad.vibration ? 'Tester la vibration' : 'Vibration non supportée par ce navigateur'}
              </button>
            </section>
          </>
        )}
        <section>
          <h2>Journal</h2>
          <ul className="gp-log">
            {log.length ? log.map((l, i) => <li key={i}>{l}</li>) : <li>—</li>}
          </ul>
        </section>
        <a href="/">← Retour au jeu</a>
      </main>
    </div>
  );
}
