// Persistance : Supabase si configuré, sinon stockage local du navigateur (dev / démo).
// Règles : un continent par essai, jamais deux fois le même continent, 4 essais max par jour
// (fenêtre = depuis minuit heure de Paris ou depuis la dernière remise à zéro admin).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface ScoreEntry {
  pseudo: string;
  email: string;
  zone: string;
  score: number;
  total_time: number | null; // chrono jeux 2 + 3 (s)
  medals: number;
  details: Record<string, unknown>;
}

export interface LeaderRow {
  pseudo: string;
  zone: string;
  score: number;
  total_time: number | null;
  medals: number;
}

export const MAX_TRIES = 4;

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export const storageMode = supabase ? 'supabase' : 'local';

const pseudoKey = (p: string) => p.trim().toLowerCase();

// ---------- stockage local (fallback) ----------
const LS = { scores: 'sii-olympics-scores', attempts: 'sii-olympics-attempts', reset: 'sii-olympics-reset' };
function lsRead<T>(k: string, def: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : def;
  } catch {
    return def;
  }
}
function lsWrite(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* stockage indisponible */
  }
}
type LocalScore = ScoreEntry & { created_at: string };
type LocalAttempt = { pseudo_key: string; zone: string; created_at: string };

// ---------- fenêtre de jeu ----------
async function resetAt(): Promise<Date> {
  if (supabase) {
    const { data } = await supabase.from('game_state').select('reset_at').eq('id', 1).maybeSingle();
    return data?.reset_at ? new Date(data.reset_at) : new Date(0);
  }
  return new Date(lsRead<string>(LS.reset, new Date(0).toISOString()));
}

/** Minuit (heure de Paris) du jour courant. */
function parisMidnight(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const sinceMidnight = ((get('hour') % 24) * 3600 + get('minute') * 60 + get('second')) * 1000;
  return new Date(now.getTime() - sinceMidnight - now.getMilliseconds());
}

async function windowStart(): Promise<Date> {
  const r = await resetAt();
  const m = parisMidnight();
  return r > m ? r : m;
}

// ---------- essais ----------
/** Continents déjà joués par ce pseudo dans la fenêtre de jeu. */
export async function playedZones(pseudo: string): Promise<string[]> {
  const since = await windowStart();
  if (supabase) {
    const { data, error } = await supabase
      .from('attempts')
      .select('zone')
      .eq('pseudo_key', pseudoKey(pseudo))
      .gte('created_at', since.toISOString());
    if (error) throw error;
    return [...new Set((data ?? []).map((r) => r.zone as string))];
  }
  return [
    ...new Set(
      lsRead<LocalAttempt[]>(LS.attempts, [])
        .filter((a) => a.pseudo_key === pseudoKey(pseudo) && new Date(a.created_at) >= since)
        .map((a) => a.zone),
    ),
  ];
}

export class AttemptRefused extends Error {}

/** Déclare le début d'un essai. Refusé si le continent est déjà joué ou si les 4 essais sont utilisés. */
export async function startAttempt(pseudo: string, zone: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('attempts').insert({ pseudo: pseudo.trim(), zone });
    if (error) {
      if (/ZONE_DEJA_JOUEE|PLUS_D_ESSAIS/.test(error.message)) throw new AttemptRefused(error.message);
      throw error;
    }
    return;
  }
  const played = await playedZones(pseudo);
  if (played.includes(zone) || played.length >= MAX_TRIES) throw new AttemptRefused('refusé');
  lsWrite(LS.attempts, [...lsRead<LocalAttempt[]>(LS.attempts, []), { pseudo_key: pseudoKey(pseudo), zone, created_at: new Date().toISOString() }]);
}

// ---------- scores ----------
export async function saveScore(entry: ScoreEntry): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('scores').insert(entry);
    if (error) throw error;
    return;
  }
  lsWrite(LS.scores, [...lsRead<LocalScore[]>(LS.scores, []), { ...entry, created_at: new Date().toISOString() }]);
}

/** Classement depuis la dernière remise à zéro : meilleur essai de chaque pseudo. */
export async function leaderboard(limit = 20): Promise<LeaderRow[]> {
  const since = await resetAt();
  let rows: LeaderRow[];
  if (supabase) {
    const { data, error } = await supabase
      .from('scores')
      .select('pseudo, zone, score, total_time, medals')
      .gte('created_at', since.toISOString())
      .order('score', { ascending: false })
      .limit(500);
    if (error) throw error;
    rows = (data ?? []) as LeaderRow[];
  } else {
    rows = lsRead<LocalScore[]>(LS.scores, []).filter((s) => new Date(s.created_at) >= since);
  }
  rows.sort((a, b) => b.score - a.score || (a.total_time ?? 1e9) - (b.total_time ?? 1e9));
  const seen = new Set<string>();
  const best: LeaderRow[] = [];
  for (const r of rows) {
    const k = pseudoKey(r.pseudo);
    if (seen.has(k)) continue;
    seen.add(k);
    best.push({ pseudo: r.pseudo, zone: r.zone, score: r.score, total_time: r.total_time, medals: r.medals });
    if (best.length >= limit) break;
  }
  return best;
}

/** Remise à zéro en mode local uniquement (en ligne : l'admin le fait dans Supabase). */
export function localReset() {
  lsWrite(LS.reset, new Date().toISOString());
}
