// Aperçu des 12 épreuves (?view=apercu) : première image de chaque épreuve, pour chaque continent.
// Utile pour vérifier les assets du design sans jouer.
import { useEffect, useRef } from 'react';
import { MODE_LABEL, MODES, ZONES, type ModeKind, type Sport } from './game/data';
import { H, Input, W, type Mode } from './game/engine';
import { Tricks } from './game/tricks';
import { Chaser } from './game/chaser';
import { Race } from './game/race';
import { Header } from './ui';

function make(kind: ModeKind, sport: Sport, accent: string): Mode {
  if (kind === 'tricks') return new Tricks(sport, accent);
  if (kind === 'chaser') return new Chaser(sport, accent);
  return new Race(sport, accent);
}

function Frame({ kind, sport, accent }: { kind: ModeKind; sport: Sport; accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    const mode = make(kind, sport, accent);
    const input = new Input();
    // avance un peu pour montrer l'action (obstacle en approche, lettre affichée…)
    for (let i = 0; i < 90; i++) mode.update(1 / 60, input);
    const draw = () => mode.draw(ctx);
    draw();
    const t = setTimeout(draw, 300); // une fois les sprites chargés
    return () => clearTimeout(t);
  }, [kind, sport, accent]);
  return <canvas ref={ref} width={W} height={H} style={{ width: '100%', height: 'auto', display: 'block', imageRendering: 'pixelated' }} />;
}

export function PreviewWall() {
  return (
    <div className="screen">
      <Header />
      <main className="wrap" style={{ maxWidth: 1600 }}>
        {ZONES.map((z) => (
          <section key={z.id} style={{ ['--accent' as string]: z.accent }}>
            <h2 className="kicker gold" style={{ fontSize: 14, margin: '0 0 12px' }}>
              {z.name.toUpperCase()}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {MODES.map((m, i) => (
                <figure key={m} style={{ margin: 0 }}>
                  <Frame kind={m} sport={z.sports[i]} accent={z.accent} />
                  <figcaption className="vt small">
                    {MODE_LABEL[m]} · {z.sports[i].name} · {z.sports[i].country}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
