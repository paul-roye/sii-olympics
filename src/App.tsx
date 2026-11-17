import { useEffect, useRef, useState } from 'react';
import { useGamepadMenu } from './useGamepadMenu';
import { MODE_LABEL, MODES, ZONES, zoneById, type Zone } from './game/data';
import type { ActivityResult } from './game/engine';
import { GameCanvas } from './GameCanvas';
import { AttemptRefused, leaderboard, MAX_TRIES, playedZones, saveScore, startAttempt, storageMode } from './scores';
import { Header, MedalCounter, openLeaderboardWindow, Sprite } from './ui';
import { sfx } from './sound';

interface Player {
  pseudo: string;
  email: string;
  played: string[]; // continents déjà joués dans la fenêtre de jeu
}

type Screen =
  | { name: 'signup' }
  | { name: 'zones' }
  | { name: 'play'; zone: Zone; step: number; results: ActivityResult[] }
  | { name: 'result'; zone: Zone; step: number; results: ActivityResult[] }
  | { name: 'final'; zone: Zone; results: ActivityResult[] };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Chrono total des jeux 2 + 3 (activités réussies uniquement). */
function totalTime(results: ActivityResult[]) {
  const timed = results.slice(1).filter((r) => r.won && r.time != null);
  return timed.length ? Math.round(timed.reduce((s, r) => s + (r.time ?? 0), 0) * 10) / 10 : null;
}
const totalScore = (results: ActivityResult[]) => results.reduce((s, r) => s + r.score, 0);
const medalOf = (r?: ActivityResult) => (r ? (r.won ? 'gold' : 'medalEmpty') : 'medalEmpty');

export default function App() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'signup' });
  useGamepadMenu(screen.name !== 'play');

  const reset = () => {
    setPlayer(null);
    setScreen({ name: 'signup' });
  };

  if (screen.name === 'signup' || !player)
    return (
      <Signup
        onDone={(p) => {
          setPlayer(p);
          setScreen({ name: 'zones' });
        }}
      />
    );

  if (screen.name === 'zones')
    return (
      <ZoneSelect
        player={player}
        onPlayed={(played) => setPlayer({ ...player, played })}
        onStart={(zone) => {
          setPlayer({ ...player, played: [...player.played, zone.id] });
          setScreen({ name: 'play', zone, step: 0, results: [] });
        }}
        onQuit={reset}
      />
    );

  if (screen.name === 'play') {
    const { zone, step, results } = screen;
    return (
      <GameCanvas
        key={`${zone.id}-${step}`}
        zone={zone}
        kind={MODES[step]}
        sport={zone.sports[step]}
        step={step}
        medals={results.filter((r) => r.won).length}
        onFinish={(r) => setScreen({ name: 'result', zone, step, results: [...results, r] })}
      />
    );
  }

  if (screen.name === 'result') {
    const { zone, step, results } = screen;
    const r = results[step];
    const sport = zone.sports[step];
    const last = step === 2;
    return (
      <div className="screen" style={{ ['--accent' as string]: zone.accent }}>
        <Header>
          <span className="chip accent">{zone.name.toUpperCase()}</span>
          <MedalCounter value={results.filter((x) => x.won).length} total={3} />
        </Header>
        <main className="wrap narrow">
          <section className="panel result-panel">
            <div className="result-head">
              <Sprite name={r.won ? 'gold' : 'medalEmpty'} h={96} />
              <div>
                <p className={'big-word ' + (r.won ? 'ok' : 'ko')}>{r.won ? 'GAGNÉ !' : 'PERDU...'}</p>
                <p className="vt">
                  {r.won ? 'Médaille d’or' : 'Pas de médaille'} — {sport.name}, {sport.country}.
                </p>
              </div>
            </div>
            <div className="stats">
              <Stat label="RÉSULTAT" value={r.details} />
              <Stat label="SCORE" value={`+${r.score}`} gold />
            </div>
            <div className="actions">
              <EnterButton
                className="px-btn big accent"
                onClick={() => setScreen(last ? { name: 'final', zone, results } : { name: 'play', zone, step: step + 1, results })}
              >
                <Sprite name="next" h={16} />
                {last ? 'ARRIVÉE' : `ÉPREUVE ${step + 2} : ${MODE_LABEL[MODES[step + 1]]}`}
              </EnterButton>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return <Final player={player} zone={screen.zone} results={screen.results} onDone={reset} />;
}

function Stat({ label, value, gold, color }: { label: string; value: string; gold?: boolean; color?: string }) {
  return (
    <div className="stat">
      <span className="lbl">{label}</span>
      <span className="val" style={{ color: color ?? (gold ? 'var(--gold)' : undefined) }}>
        {value}
      </span>
    </div>
  );
}

/** Bouton déclenché aussi par la touche Entrée. */
function EnterButton({ onClick, className, children }: { onClick: () => void; className: string; children: React.ReactNode }) {
  const ref = useRef(onClick);
  ref.current = onClick;
  useEffect(() => {
    const born = performance.now();
    let done = false;
    // Entrée = un seul déclenchement (on annule l'activation native du bouton qui a le focus),
    // ignorée pendant 400 ms pour qu'une touche encore enfoncée ne valide pas tout de suite.
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (done || e.repeat || performance.now() - born < 400) return;
      done = true;
      ref.current();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <button className={className} onClick={onClick} autoFocus>
      {children}
    </button>
  );
}

function Signup({ onDone }: { onDone: (p: Player) => void }) {
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = pseudo.trim().length > 0 && pseudo.trim().length <= 24 && EMAIL_RE.test(email.trim()) && consent;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const played = await playedZones(pseudo);
      if (played.length >= MAX_TRIES) {
        setError(`${pseudo.trim()} a déjà utilisé ses ${MAX_TRIES} essais aujourd’hui. Reviens demain !`);
        return;
      }
      onDone({ pseudo: pseudo.trim(), email: email.trim().toLowerCase(), played });
    } catch {
      setError('Impossible de joindre le serveur. Réessaie dans un instant.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <Header>
        <button className="px-btn" onClick={openLeaderboardWindow}>
          CLASSEMENT
        </button>
      </Header>
      <main className="wrap narrow">
        <section className="hero">
          <p className="kicker gold">4 ZONES · 12 ÉPREUVES · 1 CHAMPION</p>
          <h1 className="title-xl">
            TOUR DU MONDE
            <br />
            DES SPORTS
          </h1>
          <p className="vt lead">Choisis un continent, enchaîne 3 épreuves — figures, ballon, course — et bats le rival !</p>
        </section>
        <form className="panel form" onSubmit={submit}>
          <label>
            <span className="lbl">PSEUDO</span>
            <input value={pseudo} maxLength={24} onChange={(e) => setPseudo(e.target.value)} autoFocus required autoComplete="off" />
          </label>
          <label>
            <span className="lbl">EMAIL</span>
            <input type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
          </label>
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>J’accepte que mon pseudo, mon email et mon score soient enregistrés pour le classement de l’événement. Seul le pseudo est affiché.</span>
          </label>
          {error && <p className="error">{error}</p>}
          <button className="px-btn big accent" disabled={!valid || busy}>
            <Sprite name="play" h={16} /> {busy ? '…' : 'JOUER'}
          </button>
        </form>
      </main>
    </div>
  );
}

function ZoneSelect({ player, onStart, onPlayed, onQuit }: { player: Player; onStart: (z: Zone) => void; onPlayed: (p: string[]) => void; onQuit: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const triesLeft = MAX_TRIES - player.played.length;
  const firstFree = ZONES.find((z) => !player.played.includes(z.id))?.id;

  const choose = async (z: Zone) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await startAttempt(player.pseudo, z.id);
      onStart(z);
    } catch (e) {
      if (e instanceof AttemptRefused) {
        setError('Ce continent n’est plus disponible pour toi. Choisis-en un autre.');
        playedZones(player.pseudo).then(onPlayed).catch(() => {});
      } else setError('Impossible de joindre le serveur. Réessaie dans un instant.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <Header>
        <span className="chip">{player.pseudo}</span>
        <span className="chip">
          ESSAIS {triesLeft}/{MAX_TRIES}
        </span>
        <button className="px-btn" onClick={onQuit}>
          QUITTER
        </button>
      </Header>
      <main className="wrap">
        <div className="section-head">
          <div>
            <span className="kicker gold">SÉLECTION</span>
            <h2>CHOISIS TON CONTINENT</h2>
          </div>
          {player.played.length > 0 && (
            <p className="vt notice">
              Re-bonjour {player.pseudo} ! Tu as déjà joué {player.played.map((id) => zoneById(id)?.name).join(', ')}. Choisis un autre continent.
            </p>
          )}
        </div>
        {error && <p className="error">{error}</p>}
        <div className="zones">
          {ZONES.map((z, zi) => {
            const done = player.played.includes(z.id);
            return (
              <article key={z.id} className={'zone-card' + (done ? ' done' : '')} style={{ ['--accent' as string]: z.accent }}>
                <div className="zone-top">
                  <h3>{z.name.toUpperCase()}</h3>
                  <span>ZONE {zi + 1}</span>
                </div>
                <ol>
                  {z.sports.map((s, i) => (
                    <li key={s.name}>
                      <span className="num">{i + 1}</span>
                      <Sprite name={s.flag} h={20} />
                      <div>
                        <span className="kicker">{MODE_LABEL[MODES[i]]}</span>
                        <span className="sport">{s.name}</span>
                        <span className="country">{s.country}</span>
                      </div>
                    </li>
                  ))}
                </ol>
                <button className="px-btn big accent" disabled={done || busy} onClick={() => choose(z)} autoFocus={z.id === firstFree}>
                  {done ? 'DÉJÀ JOUÉ' : (
                    <>
                      <Sprite name="play" h={14} /> JOUER
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function Final({ player, zone, results, onDone }: { player: Player; zone: Zone; results: ActivityResult[]; onDone: () => void }) {
  const score = totalScore(results);
  const time = totalTime(results);
  const medals = results.filter((r) => r.won).length;
  const [status, setStatus] = useState<'saving' | 'saved' | 'error'>('saving');
  const [rank, setRank] = useState<number | null>(null);
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current) return; // un seul enregistrement (StrictMode)
    saved.current = true;
    sfx.finish();
    saveScore({
      pseudo: player.pseudo,
      email: player.email,
      zone: zone.id,
      score,
      total_time: time,
      medals,
      details: Object.fromEntries(results.map((r, i) => [MODES[i], { won: r.won, score: r.score, ...r.stats }])),
    })
      .then(async () => {
        setStatus('saved');
        const rows = await leaderboard(1000);
        const i = rows.findIndex((r) => r.pseudo.toLowerCase() === player.pseudo.toLowerCase());
        if (i >= 0) setRank(i + 1);
      })
      .catch(() => setStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const left = MAX_TRIES - player.played.length;
  return (
    <div className="screen" style={{ ['--accent' as string]: zone.accent }}>
      <Header>
        <MedalCounter value={medals} total={3} />
      </Header>
      <main className="wrap narrow">
        <div className="finish-banner">
          <Sprite name="flame" h={40} />
          <h1>ARRIVÉE</h1>
          <Sprite name="flame" h={40} />
        </div>
        <section className="panel result-panel">
          <div className="stats">
            <Stat label="SCORE TOTAL" value={String(score).padStart(4, '0')} gold />
            <Stat label="CHRONO JEUX 2+3" value={time != null ? `${time.toFixed(1)} s` : '—'} />
            <Stat label="MÉDAILLES" value={`${medals}/3`} />
            <Stat label="CLASSEMENT" value={rank ? `${rank}e` : '…'} />
          </div>
          <h2 className="kicker gold">PARCOURS {zone.name.toUpperCase()}</h2>
          <ol className="recap">
            {results.map((r, i) => (
              <li key={i}>
                <span className="num">{i + 1}</span>
                <Sprite name={zone.sports[i].flag} h={20} />
                <div className="grow">
                  <span className="kicker">{MODE_LABEL[MODES[i]]}</span>
                  <span className="sport">{zone.sports[i].name}</span>
                  <span className="country">{r.details}</span>
                </div>
                <strong>+{r.score}</strong>
                <Sprite name={medalOf(r)} h={36} />
              </li>
            ))}
          </ol>
          <p className="vt small">
            {status === 'saving' && 'Enregistrement du score…'}
            {status === 'saved' && `Score enregistré${storageMode === 'local' ? ' (mode local)' : ''}. `}
            {status === 'error' && '⚠ Le score n’a pas pu être enregistré. Préviens l’équipe sur le stand.'}
            {status === 'saved' && (left > 0 ? `Il te reste ${left} essai${left > 1 ? 's' : ''} aujourd’hui, sur un autre continent.` : 'Tu as utilisé tous tes essais du jour.')}
          </p>
          <div className="actions">
            <EnterButton className="px-btn big accent" onClick={onDone}>
              <Sprite name="next" h={16} /> TERMINER
            </EnterButton>
            <button className="px-btn" onClick={openLeaderboardWindow}>
              CLASSEMENT
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
