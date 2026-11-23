-- Club court booking — the piece the tournament schema does not cover.
--
-- The existing `courts` table is scoped to a tournament (tournament_id not null),
-- so it cannot represent the club's nine permanent courts or day-to-day
-- reservations. This migration adds that layer, following the same rule the rest
-- of the schema holds to: if it must never happen, the database forbids it.
--
--   * Two live bookings can never overlap on one court (GiST exclusion, not app logic).
--   * A booking that belongs to a tournament match points at it, so the court
--     calendar and the tournament schedule can never disagree.

create extension if not exists btree_gist;

-- ---------- The club's permanent courts ----------

create table public.club_courts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  number int not null check (number > 0),
  name text,
  surface text not null default 'glass' check (surface in ('glass','clay','other')),
  singles boolean not null default false,          -- Las Palmas court 9 is 1v1
  indoor boolean not null default false,
  active boolean not null default true,
  sort_order int,
  unique (club_id, number)
);

-- ---------- Opening hours, per weekday ----------

create table public.club_hours (
  club_id uuid not null references public.clubs(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),   -- 0 = Sunday
  opens time not null,
  closes time not null,
  primary key (club_id, weekday),
  check (closes > opens)
);

-- One-off closures (maintenance, private events, holidays).
create table public.club_closures (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  club_court_id uuid references public.club_courts(id) on delete cascade,  -- null = whole club
  during tstzrange not null,
  reason text,
  check (not isempty(during))
);

-- ---------- Bookings ----------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  club_court_id uuid not null references public.club_courts(id) on delete cascade,
  during tstzrange not null,
  status text not null default 'held'
    check (status in ('held','confirmed','cancelled','played','no_show')),
  source text not null default 'web'
    check (source in ('web','playtomic','walk_in','tournament','membership')),
  booked_by uuid references auth.users(id),
  player_id uuid references public.players(id),
  contact_name text,
  contact_phone text,
  notes text,
  price_cents int check (price_cents >= 0),
  -- when a booking exists because a tournament match is on that court
  match_id uuid references public.matches(id) on delete set null,
  hold_expires_at timestamptz,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (not isempty(during)),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  -- a held slot must say when the hold lapses, so stale holds can be swept
  check ((status = 'held') = (hold_expires_at is not null))
);

-- The guarantee: no two live bookings may ever overlap on the same court.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    club_court_id with =,
    during with &&
  ) where (status in ('held','confirmed','played'));

create index bookings_court_time on public.bookings using gist (club_court_id, during);
create index bookings_day on public.bookings (lower(during));
create index bookings_match on public.bookings (match_id) where match_id is not null;

-- ---------- Row level security ----------

alter table public.club_courts   enable row level security;
alter table public.club_hours    enable row level security;
alter table public.club_closures enable row level security;
alter table public.bookings      enable row level security;

-- Courts and hours are public information.
create policy club_courts_read  on public.club_courts   for select using (active);
create policy club_hours_read   on public.club_hours    for select using (true);
create policy club_closures_read on public.club_closures for select using (true);

-- Anyone may see *that* a slot is taken; nobody but staff sees who took it.
-- The public calendar reads this view, never the table.
create view public.court_availability
  with (security_invoker = false) as
  select b.club_court_id, b.during, b.status
    from public.bookings b
   where b.status in ('held','confirmed','played');

-- Owners see their own bookings; club owners see everything at their club.
create policy bookings_read_own on public.bookings for select
  using (
    booked_by = auth.uid()
    or exists (
      select 1 from public.club_courts cc
        join public.clubs c on c.id = cc.club_id
       where cc.id = bookings.club_court_id and c.owner_id = auth.uid()
    )
  );

create policy bookings_insert_self on public.bookings for insert
  with check (booked_by = auth.uid());

create policy bookings_cancel_own on public.bookings for update
  using (booked_by = auth.uid())
  with check (booked_by = auth.uid());

grant select on public.court_availability to anon, authenticated;

-- ---------- Seed: Las Palmas, as it actually is ----------

-- Run once the club row exists; :club_id is the club's uuid.
-- insert into public.club_courts (club_id, number, name, surface, singles) values
--   (:club_id, 1, 'Chevrolet', 'glass', false),
--   (:club_id, 2, null,        'glass', false),
--   (:club_id, 3, null,        'clay',  false),
--   (:club_id, 4, null,        'clay',  false),
--   (:club_id, 5, null,        'clay',  false),
--   (:club_id, 6, null,        'clay',  false),
--   (:club_id, 7, null,        'glass', false),
--   (:club_id, 8, null,        'glass', false),
--   (:club_id, 9, '1v1',       'glass', true);
