import { useEffect, useRef, useState } from 'react';
import { MODES, ZONES, Zone } from './game/data';
import type { ActivityResult } from './game/engine';
import { GameCanvas } from './GameCanvas';
import { LeaderRow, saveScore, storageMode, topScores } from './scores';

interface Player {
  pseudo: string;
  email: string;
}

type Screen =
  | { name: 'signup' }
  | { name: 'home' }
  | { name: 'play'; zone: Zone; step: number; results: ActivityResult[] }
  | { name: 'result'; zone: Zone; step: number; results: ActivityResult[] }
  | { name: 'final'; zone: Zone; results: ActivityResult[] };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const zoneName = (id: string) => ZONES.find((z) => z.id === id)?.name ?? id;

/** Chrono total des jeux 2 + 3 (activités réussies uniquement). */
function totalTime(results: ActivityResult[]) {
  const timed = results.slice(1).filter((r) => r.won && r.time != null);
  return timed.length ? Math.round(timed.reduce((s, r) => s + (r.time ?? 0), 0) * 10) / 10 : null;
}
const totalScore = (results: ActivityResult[]) => results.reduce((s, r) => s + r.score, 0);

export default function App() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'signup' });
  const [medals, setMedals] = useState<Record<string, boolean[]>>({});

  const newPlayer = () => {
    setPlayer(null);
    setMedals({});
    setScreen({ name: 'signup' });
  };

  if (screen.name === 'signup' || !player)
    return (
      <Signup
        onDone={(p) => {
          setPlayer(p);
          setScreen({ name: 'home' });
        }}
      />
    );

  if (screen.name === 'home') {
    const total = Object.values(medals).flat().filter(Boolean).length;
    return (
      <div className="page">
        <header className="header">
          <h1>🏟️ Tour du Monde des Sports</h1>
          <p className="muted">
            Salut <strong>{player.pseudo}</strong> ! Choisis ta zone · 🏅 {total}/12 médailles
          </p>
        </header>
        <div className="zones">
          {ZONES.map((z) => {
            const m = medals[z.id] ?? [];
            return (
              <button
                key={z.id}
                className="zone-card"
                style={{ ['--accent' as string]: z.accent }}
                onClick={() => setScreen({ name: 'play', zone: z, step: 0, results: [] })}
              >
                <div className="zone-head">
                  <span className="zone-emoji">{z.emoji}</span>
                  <strong>{z.name}</strong>
                  <span className="muted">{m.filter(Boolean).length}/3</span>
                </div>
                <ol>
                  {z.sports.map((s, i) => (
                    <li key={s.name}>
                      {m[i] ? '🏅' : s.emoji} {s.name} <span className="muted">{s.flag}</span>
                    </li>
                  ))}
                </ol>
              </button>
            );
          })}
        </div>
        <Leaderboard />
        <button className="link" onClick={newPlayer}>
          Changer de joueur
        </button>
      </div>
    );
  }

  if (screen.name === 'play') {
    const { zone, step, results } = screen;
    return (
      <div className="page">
        <GameCanvas
          key={`${zone.id}-${step}`}
          zone={zone}
          kind={MODES[step]}
          sport={zone.sports[step]}
          step={step + 1}
          onFinish={(r) => {
            const all = [...results, r];
            setMedals((prev) => {
              const m = [...(prev[zone.id] ?? [false, false, false])];
              m[step] = m[step] || r.won;
              return { ...prev, [zone.id]: m };
            });
            setScreen({ name: 'result', zone, step, results: all });
          }}
        />
      </div>
    );
  }

  if (screen.name === 'result') {
    const { zone, step, results } = screen;
    const r = results[step];
    const sport = zone.sports[step];
    const last = step === 2;
    return (
      <div className="page center" style={{ ['--accent' as string]: zone.accent }}>
        <div className="card result">
          <div className="big-emoji">{r.won ? '🏅' : '😓'}</div>
          <h2>{r.won ? 'Médaille gagnée !' : 'Raté !'}</h2>
          <p>
            {sport.emoji} {sport.name} — {sport.flag} {sport.country}
          </p>
          <p className="stat">{r.details}</p>
          <p className="muted">+{r.score} points</p>
          <div className="actions">
            <button
              className="primary"
              autoFocus
              onClick={() =>
                setScreen(last ? { name: 'final', zone, results } : { name: 'play', zone, step: step + 1, results })
              }
            >
              {last ? '🏁 Voir l’arrivée' : 'Suite ▶'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Final player={player} zone={screen.zone} results={screen.results} onHome={() => setScreen({ name: 'home' })} onNext={newPlayer} />;
}

function Signup({ onDone }: { onDone: (p: Player) => void }) {
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const valid = pseudo.trim().length > 0 && pseudo.trim().length <= 24 && EMAIL_RE.test(email.trim()) && consent;
  return (
    <div className="page center">
      <form
        className="card signup"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onDone({ pseudo: pseudo.trim(), email: email.trim().toLowerCase() });
        }}
      >
        <h1>🏟️ Tour du Monde des Sports</h1>
        <p className="muted">3 épreuves, 2 minutes, un classement. Bats le rival IA !</p>
        <label>
          Pseudo
          <input value={pseudo} maxLength={24} onChange={(e) => setPseudo(e.target.value)} autoFocus required />
        </label>
        <label>
          Email
          <input type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>J’accepte que mon pseudo, mon email et mon score soient enregistrés pour le classement de l’événement.</span>
        </label>
        <button className="primary" disabled={!valid}>
          C’est parti !
        </button>
        <p className="muted small">Seul ton pseudo apparaît dans le classement public.</p>
      </form>
    </div>
  );
}

function Final({ player, zone, results, onHome, onNext }: { player: Player; zone: Zone; results: ActivityResult[]; onHome: () => void; onNext: () => void }) {
  const score = totalScore(results);
  const time = totalTime(results);
  const medals = results.filter((r) => r.won).length;
  const [status, setStatus] = useState<'saving' | 'saved' | 'error'>('saving');
  const [refresh, setRefresh] = useState(0);
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current) return; // évite le double enregistrement (StrictMode)
    saved.current = true;
    saveScore({
      pseudo: player.pseudo,
      email: player.email,
      zone: zone.id,
      score,
      total_time: time,
      medals,
      details: Object.fromEntries(results.map((r, i) => [`activite${i + 1}`, { won: r.won, score: r.score, ...r.stats }])),
    })
      .then(() => setStatus('saved'))
      .catch(() => setStatus('error'))
      .finally(() => setRefresh((n) => n + 1));
    // un seul enregistrement par fin de parcours
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page center" style={{ ['--accent' as string]: zone.accent }}>
      <div className="card result">
        <div className="banner">🏁 ARRIVÉE</div>
        <h2>
          {zone.emoji} {zone.name} — {medals}/3 🏅
        </h2>
        <p className="score-big">{score} pts</p>
        <p className="stat">⏱ Chrono jeux 2 + 3 : {time != null ? `${time.toFixed(1)} s` : '—'}</p>
        <ul className="recap">
          {results.map((r, i) => (
            <li key={i}>
              {r.won ? '🏅' : '❌'} {zone.sports[i].emoji} {zone.sports[i].name} : {r.details}
            </li>
          ))}
        </ul>
        <p className="muted small">
          {status === 'saving' && 'Enregistrement du score…'}
          {status === 'saved' && `Score enregistré${storageMode === 'local' ? ' (local)' : ''} ✔`}
          {status === 'error' && '⚠️ Le score n’a pas pu être enregistré.'}
        </p>
        <Leaderboard refresh={refresh} highlight={player.pseudo} />
        <div className="actions">
          <button className="primary" onClick={onNext} autoFocus>
            Joueur suivant
          </button>
          <button onClick={onHome}>Autre zone</button>
        </div>
      </div>
    </div>
  );
}

function Leaderboard({ refresh = 0, highlight }: { refresh?: number; highlight?: string }) {
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  useEffect(() => {
    topScores(10)
      .then(setRows)
      .catch(() => setRows([]));
  }, [refresh]);
  if (!rows) return null;
  return (
    <section className="leaderboard">
      <h3>🏆 Classement {rows[0] && <span className="muted">— score à battre : {rows[0].score} pts</span>}</h3>
      {rows.length === 0 ? (
        <p className="muted">Aucun score pour l’instant. Sois le premier !</p>
      ) : (
        <ol>
          {rows.map((r, i) => (
            <li key={i} className={r.pseudo === highlight ? 'me' : ''}>
              <span className="rank">{i + 1}</span>
              <span className="name">{r.pseudo}</span>
              <span className="muted">{zoneName(r.zone)}</span>
              <strong>{r.score} pts</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
