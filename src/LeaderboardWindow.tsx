// Écran de classement, ouvert dans une seconde fenêtre (?view=classement). Se met à jour tout seul.
import { useEffect, useState } from 'react';
import { zoneById } from './game/data';
import { leaderboard, type LeaderRow } from './scores';
import { Header, Sprite } from './ui';

const REFRESH_MS = 5000;

export function LeaderboardWindow() {
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = 'Classement — Tour du Monde des Sports';
    let alive = true;
    const load = () =>
      leaderboard(20)
        .then((r) => {
          if (!alive) return;
          setRows(r);
          setError(false);
        })
        .catch(() => alive && setError(true));
    load();
    const id = setInterval(load, REFRESH_MS);
    // mode local : se met à jour quand l'autre fenêtre enregistre un score
    window.addEventListener('storage', load);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener('storage', load);
    };
  }, []);

  return (
    <div className="screen">
      <Header>
        <span className="chip accent-gold">CLASSEMENT EN DIRECT</span>
      </Header>
      <main className="wrap narrow">
        <h1 className="title-xl center">CLASSEMENT</h1>
        {error && <p className="error">Connexion perdue, nouvelle tentative…</p>}
        {rows && rows.length === 0 && <p className="vt lead center">Aucun score pour l’instant. Sois le premier !</p>}
        {rows && rows.length > 0 && (
          <ol className="board">
            {rows.map((r, i) => {
              const z = zoneById(r.zone);
              return (
                <li key={r.pseudo + i} className={i < 3 ? 'top' : ''} style={{ ['--accent' as string]: z?.accent }}>
                  <span className="rank">{i + 1}</span>
                  {i < 3 ? <Sprite name={['gold', 'silver', 'bronze'][i]} h={36} /> : <span className="medal-space" />}
                  <span className="name">{r.pseudo}</span>
                  <span className="zone">{z?.name ?? r.zone}</span>
                  <span className="time">{r.total_time != null ? `${Number(r.total_time).toFixed(1)} s` : '—'}</span>
                  <strong>{String(r.score).padStart(4, '0')}</strong>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
