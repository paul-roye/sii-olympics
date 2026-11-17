-- Table des scores du Tour du Monde des Sports.
-- Accès public (clé publishable / rôle anon) :
--   * INSERT d'un score à la fin d'une partie ;
--   * SELECT limité aux colonnes non personnelles (pas d'email) pour le classement.
-- L'export CSV avec emails se fera côté admin (service role / dashboard), jamais depuis le navigateur.

create table public.scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  pseudo text not null check (char_length(pseudo) between 1 and 24),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  zone text not null check (zone in ('amerique', 'europe-asie', 'afrique', 'oceanie')),
  score integer not null check (score between 0 and 3000),
  total_time numeric(6, 1) check (total_time is null or total_time between 0 and 600),
  medals smallint not null default 0 check (medals between 0 and 3),
  details jsonb not null default '{}'::jsonb
);

create index scores_leaderboard_idx on public.scores (score desc, total_time asc);

alter table public.scores enable row level security;

-- Droits table/colonnes : l'email n'est jamais lisible par anon / authenticated.
revoke all on public.scores from anon, authenticated;
grant insert (pseudo, email, zone, score, total_time, medals, details) on public.scores to anon, authenticated;
grant select (id, created_at, pseudo, zone, score, total_time, medals) on public.scores to anon, authenticated;

create policy "Tout le monde peut enregistrer un score"
  on public.scores for insert
  to anon, authenticated
  with check (true);

create policy "Classement public (colonnes non personnelles)"
  on public.scores for select
  to anon, authenticated
  using (true);
