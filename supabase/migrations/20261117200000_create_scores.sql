-- Tour du Monde des Sports : scores, essais et remise à zéro.
-- Accès public (clé publishable / rôle anon) :
--   * attempts : un joueur (pseudo) déclare un essai au début d'un continent ;
--     la base refuse un continent déjà joué ou plus de 4 essais par jour (depuis la dernière remise à zéro) ;
--   * scores   : INSERT en fin de parcours, SELECT sans l'email (classement) ;
--   * game_state : lecture de la date de remise à zéro.
-- L'admin remet le jeu à zéro avec :  update public.game_state set reset_at = now() where id = 1;
-- L'export CSV avec emails se fera côté admin (service role / dashboard), jamais depuis le navigateur.

-- Remise à zéro ---------------------------------------------------------------
create table public.game_state (
  id smallint primary key default 1 check (id = 1),
  reset_at timestamptz not null default now()
);
insert into public.game_state (id) values (1);

alter table public.game_state enable row level security;
revoke all on public.game_state from anon, authenticated;
grant select on public.game_state to anon, authenticated;
create policy "Lecture publique de l'état du jeu"
  on public.game_state for select to anon, authenticated using (true);

-- Début de la fenêtre de jeu : max(minuit heure de Paris, dernière remise à zéro).
create or replace function public.play_window_start()
returns timestamptz
language sql stable
set search_path = ''
as $$
  select greatest(
    (date_trunc('day', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris',
    (select reset_at from public.game_state where id = 1)
  );
$$;

-- Essais -------------------------------------------------------------------------
create table public.attempts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  pseudo text not null check (char_length(pseudo) between 1 and 24),
  pseudo_key text generated always as (lower(btrim(pseudo))) stored,
  zone text not null check (zone in ('amerique', 'europe-asie', 'afrique', 'oceanie'))
);
create index attempts_pseudo_idx on public.attempts (pseudo_key, created_at desc);

alter table public.attempts enable row level security;
revoke all on public.attempts from anon, authenticated;
grant insert (pseudo, zone) on public.attempts to anon, authenticated;
grant select (pseudo_key, zone, created_at) on public.attempts to anon, authenticated;
create policy "Déclarer un essai" on public.attempts for insert to anon, authenticated with check (true);
create policy "Lire les essais" on public.attempts for select to anon, authenticated using (true);

-- Règles : un continent une seule fois, 4 essais max dans la fenêtre de jeu.
create or replace function public.check_attempt()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  since timestamptz := public.play_window_start();
  key text := lower(btrim(new.pseudo));
begin
  if exists (
    select 1 from public.attempts a
    where a.pseudo_key = key and a.zone = new.zone and a.created_at >= since
  ) then
    raise exception 'ZONE_DEJA_JOUEE' using errcode = 'P0001';
  end if;
  if (select count(*) from public.attempts a where a.pseudo_key = key and a.created_at >= since) >= 4 then
    raise exception 'PLUS_D_ESSAIS' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger attempts_check before insert on public.attempts
  for each row execute function public.check_attempt();

-- Scores -------------------------------------------------------------------------
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
create index scores_leaderboard_idx on public.scores (created_at, score desc);

alter table public.scores enable row level security;
revoke all on public.scores from anon, authenticated;
grant insert (pseudo, email, zone, score, total_time, medals, details) on public.scores to anon, authenticated;
grant select (id, created_at, pseudo, zone, score, total_time, medals) on public.scores to anon, authenticated;
create policy "Enregistrer un score" on public.scores for insert to anon, authenticated with check (true);
create policy "Classement public (sans email)" on public.scores for select to anon, authenticated using (true);
