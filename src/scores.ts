// Enregistrement des scores : Supabase si configuré, sinon stockage local du navigateur.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export const storageMode = supabase ? 'supabase' : 'local';

const LOCAL_KEY = 'sii-olympics-scores';

function readLocal(): ScoreEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export async function saveScore(entry: ScoreEntry): Promise<void> {
  if (supabase) {
    // Insert seul : la table n'autorise pas la lecture de l'email côté public.
    const { error } = await supabase.from('scores').insert(entry);
    if (error) throw error;
    return;
  }
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...readLocal(), entry]));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

export async function topScores(limit = 10): Promise<LeaderRow[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('scores')
      .select('pseudo, zone, score, total_time')
      .order('score', { ascending: false })
      .order('total_time', { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }
  return readLocal()
    .sort((a, b) => b.score - a.score || (a.total_time ?? 1e9) - (b.total_time ?? 1e9))
    .slice(0, limit)
    .map(({ pseudo, zone, score, total_time }) => ({ pseudo, zone, score, total_time }));
}
