-- =====================================================================
-- CourtVision schema: tables, row-level security, and the RPCs that
-- change several rows at once (joining, seeding, draws, results).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  role         text not null default 'player' check (role in ('player', 'admin')),
  admin_status text not null default 'none' check (admin_status in ('none', 'pending', 'approved', 'denied')),
  rating       int  not null default 1500,
  wins         int  not null default 0,
  losses       int  not null default 0,
  pf           int  not null default 0,   -- points won
  pa           int  not null default 0,   -- points lost
  last_delta   int  not null default 0,
  created_at   timestamptz not null default now()
);

-- Contact details are split out so players can't read each other's email or phone
create table public.contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email   text not null default '',
  phone   text
);

create table public.tournaments (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 3 and 120),
  date           date not null,
  venue          text,
  format         text not null check (format in ('singles', 'doubles')),
  type           text not null check (type in ('SE', 'RR', 'GK')),   -- single elim, round robin, groups + knockout
  max_entries    int  not null default 12 check (max_entries between 2 and 64),
  status         text not null default 'open' check (status in ('open', 'live', 'completed', 'cancelled')),
  reg_closed     boolean not null default false,
  reg_deadline   date,
  champion_team  uuid,
  ended_manually boolean not null default false,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create table public.entrants (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (tournament_id, user_id)
);
create index entrants_user_idx on public.entrants(user_id);

create table public.teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name          text,
  player_ids    uuid[] not null default '{}',
  seed          int not null default 0,
  created_at    timestamptz not null default now()
);
create index teams_tournament_idx on public.teams(tournament_id);

alter table public.tournaments
  add constraint tournaments_champion_fk foreign key (champion_team) references public.teams(id) on delete set null;

create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round         int not null default 0,
  slot          int not null default 0,
  grp           text,                      -- 'A' / 'B' for group-stage matches
  stage         text,                      -- 'Group A', 'Semifinal', 'Final', '5th place'
  team_a        uuid references public.teams(id) on delete set null,
  team_b        uuid references public.teams(id) on delete set null,
  games         jsonb not null default '[]',   -- [[21,15],[19,21],...] from team_a's side
  winner        uuid references public.teams(id) on delete set null,
  status        text not null default 'pending' check (status in ('pending', 'live', 'done', 'bye')),
  next_match    uuid references public.matches(id) on delete set null deferrable initially deferred,
  next_side     text check (next_side in ('a', 'b')),
  live          jsonb,                     -- in-progress rally state for spectators
  outcome       text check (outcome in ('retired', 'walkover')),
  note          text,
  partial       jsonb,
  finished_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index matches_tournament_idx on public.matches(tournament_id);

-- ---------------------------------------------------------------- helpers
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.reg_open(t public.tournaments) returns boolean
language sql stable as $$
  select t.status = 'open' and not t.reg_closed and (t.reg_deadline is null or current_date <= t.reg_deadline);
$$;

-- New sign-ups get a profile + contact row. Name/phone/admin request come from signInWithOtp metadata.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, admin_status)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(coalesce(new.email, 'player'), '@', 1)),
          case when coalesce((new.raw_user_meta_data->>'wants_admin')::boolean, false) then 'pending' else 'none' end)
  on conflict (id) do nothing;
  insert into public.contacts (user_id, email, phone)
  values (new.id, coalesce(new.email, ''), nullif(trim(new.raw_user_meta_data->>'phone'), ''))
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Players may rename themselves but never touch role or rating fields.
-- (auth.uid() is null in the SQL editor / service context, which is allowed.)
create or replace function public.protect_profile() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role; new.admin_status := old.admin_status; new.rating := old.rating;
    new.wins := old.wins; new.losses := old.losses; new.pf := old.pf; new.pa := old.pa; new.last_delta := old.last_delta;
  end if;
  return new;
end $$;

create trigger protect_profile_fields before update on public.profiles
  for each row execute function public.protect_profile();

-- Accounts that already existed before this migration
insert into public.profiles (id, name)
  select id, coalesce(nullif(trim(raw_user_meta_data->>'name'), ''), split_part(coalesce(email, 'player'), '@', 1)) from auth.users
  on conflict (id) do nothing;
insert into public.contacts (user_id, email, phone)
  select id, coalesce(email, ''), nullif(trim(raw_user_meta_data->>'phone'), '') from auth.users
  on conflict (user_id) do nothing;

-- ---------------------------------------------------------------- player RPCs
create or replace function public.join_tournament(p_tournament uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t public.tournaments%rowtype; n int; me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first'; end if;
  select * into t from public.tournaments where id = p_tournament for update;
  if not found then raise exception 'Tournament not found'; end if;
  if not public.reg_open(t) then raise exception 'Registration for this tournament is closed'; end if;
  if exists (select 1 from public.entrants where tournament_id = t.id and user_id = me) then return; end if;
  select count(*) into n from public.entrants where tournament_id = t.id;
  if n >= t.max_entries then raise exception 'The draw is full'; end if;
  insert into public.entrants (tournament_id, user_id) values (t.id, me);
  if t.format = 'singles' then
    insert into public.teams (tournament_id, player_ids, seed)
    values (t.id, array[me], (select coalesce(max(seed), 0) + 1 from public.teams where tournament_id = t.id));
  end if;
end $$;

create or replace function public.leave_tournament(p_tournament uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t public.tournaments%rowtype; me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first'; end if;
  select * into t from public.tournaments where id = p_tournament for update;
  if not found then raise exception 'Tournament not found'; end if;
  if not public.reg_open(t) then raise exception 'Registration is closed, so the entry list is locked'; end if;
  delete from public.entrants where tournament_id = t.id and user_id = me;
  delete from public.teams where tournament_id = t.id and me = any(player_ids);
end $$;

-- ---------------------------------------------------------------- admin RPCs
create or replace function public.set_team_seeds(p_tournament uuid, p_team_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can change seeding'; end if;
  update public.teams tm set seed = x.ord
    from unnest(p_team_ids) with ordinality as x(team_id, ord)
    where tm.id = x.team_id and tm.tournament_id = p_tournament;
end $$;

-- Replaces a tournament's whole draw in one transaction (generate / regenerate / clear)
create or replace function public.replace_matches(p_tournament uuid, p_matches jsonb, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can change the draw'; end if;
  if p_status not in ('open', 'live') then raise exception 'Invalid status %', p_status; end if;
  if exists (select 1 from public.matches where tournament_id = p_tournament and status in ('done', 'live')) then
    raise exception 'The draw is locked because matches have started';
  end if;
  delete from public.matches where tournament_id = p_tournament;
  insert into public.matches (id, tournament_id, round, slot, grp, stage, team_a, team_b, games, winner, status, next_match, next_side)
  select r.id, p_tournament, r.round, r.slot, r.grp, r.stage, r.team_a, r.team_b, coalesce(r.games, '[]'::jsonb), r.winner,
         coalesce(r.status, 'pending'), r.next_match, r.next_side
  from jsonb_to_recordset(coalesce(p_matches, '[]'::jsonb))
    as r(id uuid, round int, slot int, grp text, stage text, team_a uuid, team_b uuid, games jsonb, winner uuid, status text, next_match uuid, next_side text);
  update public.tournaments set status = p_status, champion_team = null, ended_manually = false,
    reg_closed = case when p_status = 'live' then true else reg_closed end
  where id = p_tournament;
end $$;

-- Saves a result, advances the winner, moves Elo ratings, and finishes the tournament when decided.
create or replace function public.record_result(p_match uuid, p_games jsonb, p_winner_side int default null, p_outcome text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  m public.matches%rowtype;
  t public.tournaments%rowtype;
  a_games int; b_games int; a_pts int; b_pts int;
  a_won boolean; w uuid; l uuid; w_pts int; l_pts int; w_players uuid[]; l_players uuid[];
  rw numeric; rl numeric; delta int := 0;
  rated boolean := coalesce(p_outcome, '') <> 'walkover';   -- a walkover never touches ratings or records
  champ uuid;
  v_games jsonb := coalesce(p_games, '[]'::jsonb);
begin
  if not public.is_admin() then raise exception 'Only admins can record results'; end if;
  if p_outcome is not null and p_outcome not in ('retired', 'walkover') then raise exception 'Unknown outcome %', p_outcome; end if;
  if jsonb_typeof(v_games) <> 'array' then raise exception 'Games must be a list'; end if;
  if exists (select 1 from jsonb_array_elements(v_games) as x(g)
             where jsonb_typeof(g) <> 'array' or jsonb_array_length(g) <> 2
                or (g->>0)::int not between 0 and 30 or (g->>1)::int not between 0 and 30) then
    raise exception 'Each game needs two scores between 0 and 30';
  end if;

  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'Match not found'; end if;
  if m.status in ('done', 'bye') then raise exception 'This match already has a result'; end if;
  if m.team_a is null or m.team_b is null then raise exception 'Both sides of the match must be known first'; end if;
  select * into t from public.tournaments where id = m.tournament_id for update;
  if t.status <> 'live' then raise exception 'The tournament is not in play'; end if;

  select count(*) filter (where (x.g->>0)::int > (x.g->>1)::int),
         count(*) filter (where (x.g->>0)::int < (x.g->>1)::int),
         coalesce(sum((x.g->>0)::int), 0), coalesce(sum((x.g->>1)::int), 0)
    into a_games, b_games, a_pts, b_pts
    from jsonb_array_elements(v_games) as x(g);

  if p_winner_side is not null then
    if p_winner_side not in (0, 1) then raise exception 'Winner side must be 0 or 1'; end if;
    a_won := p_winner_side = 0;
  elsif a_games = b_games then
    raise exception 'These games do not produce a winner';
  else
    a_won := a_games > b_games;
  end if;
  w := case when a_won then m.team_a else m.team_b end;
  l := case when a_won then m.team_b else m.team_a end;
  w_pts := case when a_won then a_pts else b_pts end;
  l_pts := case when a_won then b_pts else a_pts end;

  update public.matches set games = v_games, winner = w, status = 'done', live = null, outcome = p_outcome, finished_at = now()
    where id = m.id;
  if m.next_match is not null then
    if m.next_side = 'a' then update public.matches set team_a = w where id = m.next_match;
    else update public.matches set team_b = w where id = m.next_match; end if;
  end if;

  if rated then
    select player_ids into w_players from public.teams where id = w;
    select player_ids into l_players from public.teams where id = l;
    select coalesce(avg(p.rating), 1500) into rw from public.profiles p where p.id = any (w_players);
    select coalesce(avg(p.rating), 1500) into rl from public.profiles p where p.id = any (l_players);
    delta := greatest(4, round(32 * (1 - 1 / (1 + power(10::numeric, (round(rl) - round(rw)) / 400.0)))));
    update public.profiles set rating = rating + delta, wins = wins + 1, pf = pf + w_pts, pa = pa + l_pts, last_delta = delta
      where id = any (w_players);
    update public.profiles set rating = rating - delta, losses = losses + 1, pf = pf + l_pts, pa = pa + w_pts, last_delta = -delta
      where id = any (l_players);
  end if;

  if (t.type = 'SE' and m.next_match is null) or (t.type = 'GK' and m.stage = 'Final') then
    champ := w;
  elsif t.type = 'RR' and not exists (select 1 from public.matches where tournament_id = t.id and status <> 'done') then
    with gs as (
      select mm.team_a as team, (x.g->>0)::int as pf_, (x.g->>1)::int as pa_
        from public.matches mm, jsonb_array_elements(mm.games) as x(g) where mm.tournament_id = t.id and mm.status = 'done'
      union all
      select mm.team_b, (x.g->>1)::int, (x.g->>0)::int
        from public.matches mm, jsonb_array_elements(mm.games) as x(g) where mm.tournament_id = t.id and mm.status = 'done'
    )
    select tm.id into champ
      from public.teams tm
      where tm.tournament_id = t.id
      order by (select count(*) from public.matches mx where mx.tournament_id = t.id and mx.status = 'done' and mx.winner = tm.id) desc,
               (select coalesce(sum(case when gs.pf_ > gs.pa_ then 1 else -1 end), 0) from gs where gs.team = tm.id) desc,
               (select coalesce(sum(gs.pf_ - gs.pa_), 0) from gs where gs.team = tm.id) desc
      limit 1;
  end if;
  if champ is not null then
    update public.tournaments set status = 'completed', champion_team = champ where id = t.id;
  end if;
end $$;

revoke execute on function public.join_tournament(uuid), public.leave_tournament(uuid), public.set_team_seeds(uuid, uuid[]),
  public.replace_matches(uuid, jsonb, text), public.record_result(uuid, jsonb, int, text) from public, anon;
grant execute on function public.join_tournament(uuid), public.leave_tournament(uuid), public.set_team_seeds(uuid, uuid[]),
  public.replace_matches(uuid, jsonb, text), public.record_result(uuid, jsonb, int, text) to authenticated;

-- ---------------------------------------------------------------- row-level security
alter table public.profiles    enable row level security;
alter table public.contacts    enable row level security;
alter table public.tournaments enable row level security;
alter table public.entrants    enable row level security;
alter table public.teams       enable row level security;
alter table public.matches     enable row level security;

create policy "Signed-in users read profiles" on public.profiles for select to authenticated using (true);
create policy "Users update their own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins update any profile" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Own contact details, or admin" on public.contacts for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Users update their own contact details" on public.contacts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare tbl text;
begin
  foreach tbl in array array['tournaments', 'entrants', 'teams', 'matches'] loop
    execute format('create policy "Signed-in users read %1$s" on public.%1$I for select to authenticated using (true)', tbl);
    execute format('create policy "Admins manage %1$s" on public.%1$I for all to authenticated using (public.is_admin()) with check (public.is_admin())', tbl);
  end loop;
end $$;

-- ---------------------------------------------------------------- realtime (live scores, brackets, rankings)
alter publication supabase_realtime add table public.profiles, public.tournaments, public.entrants, public.teams, public.matches;
