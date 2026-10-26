-- Esquema inicial de Tempo v2: perfiles, tareas, pomodoros, breaks y billing.
-- RLS es la frontera de autorización para los datos de usuario.

create extension if not exists pgcrypto;

-- Actualiza updated_at en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

-- ─── Perfiles ───────────────────────────────────────────────

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	display_name text,
	timezone text not null default 'America/Mexico_City',
	leaderboard_opt_in boolean not null default false,
	public_slug text unique,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Crea el perfil cuando Supabase Auth crea un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.profiles (id, display_name)
	values (
		new.id,
		coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
	)
	on conflict (id) do nothing;

	return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ─── Tareas ────────────────────────────────────────────────

create table public.tareas (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
	nombre text not null check (char_length(btrim(nombre)) between 1 and 100),
	estado text not null default 'pending' check (estado in ('pending', 'in_progress', 'done', 'abandoned')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	completed_at timestamptz,
	deleted_at timestamptz
);

create index tareas_user_created_idx on public.tareas (user_id, created_at desc) where deleted_at is null;
create index tareas_user_estado_idx on public.tareas (user_id, estado) where deleted_at is null;

create trigger tareas_set_updated_at
before update on public.tareas
for each row execute function public.set_updated_at();

-- ─── Pomodoros ─────────────────────────────────────────────

create table public.pomodoros (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
	tarea_id uuid not null references public.tareas (id) on delete cascade,
	status text not null check (status in ('active', 'completed', 'completed_early', 'interrupted')),
	minutes_planned integer not null default 25 check (minutes_planned > 0),
	minutes_actual integer check (minutes_actual >= 0),
	local_date date not null default current_date,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	completed_at timestamptz
);

create index pomodoros_user_date_idx on public.pomodoros (user_id, local_date);
create index pomodoros_tarea_idx on public.pomodoros (tarea_id);

create trigger pomodoros_set_updated_at
before update on public.pomodoros
for each row execute function public.set_updated_at();

-- ─── Breaks ────────────────────────────────────────────────

create table public.breaks (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
	tipo text not null check (tipo in ('short', 'long')),
	status text not null check (status in ('active', 'completed', 'skipped', 'interrupted')),
	minutes_planned integer not null check (minutes_planned > 0),
	minutes_actual integer check (minutes_actual >= 0),
	local_date date not null default current_date,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	completed_at timestamptz
);

create index breaks_user_date_idx on public.breaks (user_id, local_date);

create trigger breaks_set_updated_at
before update on public.breaks
for each row execute function public.set_updated_at();

-- ─── Billing ───────────────────────────────────────────────

create table public.subscriptions (
	user_id uuid primary key references public.profiles (id) on delete cascade,
	plan text not null default 'free' check (plan in ('free', 'pro')),
	status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'paused')),
	provider text not null default 'polar',
	provider_customer_id text,
	provider_subscription_id text unique,
	current_period_end timestamptz,
	cancel_at_period_end boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create table public.billing_events (
	id text primary key,
	type text not null,
	payload jsonb not null,
	processed_at timestamptz not null default now()
);

-- ─── RLS ───────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.tareas enable row level security;
alter table public.pomodoros enable row level security;
alter table public.breaks enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;

create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "tareas_all_own"
on public.tareas for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "pomodoros_all_own"
on public.pomodoros for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "breaks_all_own"
on public.breaks for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- El usuario solo lee su suscripción; escribe el backend con service role.
create policy "subscriptions_select_own"
on public.subscriptions for select
using (user_id = auth.uid());

-- billing_events no tiene políticas: solo service role accede.

-- ─── Grants ────────────────────────────────────────────────

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.tareas to authenticated;
grant select, insert, update, delete on public.pomodoros to authenticated;
grant select, insert, update, delete on public.breaks to authenticated;
grant select on public.subscriptions to authenticated;

grant all on public.profiles to service_role;
grant all on public.tareas to service_role;
grant all on public.pomodoros to service_role;
grant all on public.breaks to service_role;
grant all on public.subscriptions to service_role;
grant all on public.billing_events to service_role;

revoke all on public.profiles from anon;
revoke all on public.tareas from anon;
revoke all on public.pomodoros from anon;
revoke all on public.breaks from anon;
revoke all on public.subscriptions from anon;
revoke all on public.billing_events from anon;
