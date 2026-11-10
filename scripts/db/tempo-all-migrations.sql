-- ============================================================
-- Tempo v2 - all migrations (run once on an empty public schema)
-- Generated from supabase/migrations/ in chronological order.
-- DO NOT place this file in supabase/migrations/.
-- Backup the database before running.
-- ============================================================

-- ============================================================
-- 20261023160000_init.sql
-- ============================================================
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

-- ============================================================
-- 20261023180000_dashboard.sql
-- ============================================================
-- Dashboard agregado por usuario.
-- La función corre con los permisos del usuario (security invoker), así que RLS
-- sigue aplicando sobre pomodoros y tareas.

create or replace function public.get_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with base as (
	select id, tarea_id, status, minutes_actual, local_date
	from public.pomodoros
	where user_id = auth.uid()
),
today_stats as (
	select
		coalesce(sum(minutes_actual), 0)::int as focus_minutes,
		count(*) filter (where status = 'completed')::int as completed,
		count(*) filter (where status = 'interrupted')::int as interrupted
	from base
	where local_date = current_date
),
week_stats as (
	select
		coalesce(sum(minutes_actual), 0)::int as focus_minutes,
		count(*) filter (where status = 'completed')::int as completed,
		count(*) filter (where status = 'interrupted')::int as interrupted
	from base
	where local_date >= current_date - 6
),
month_stats as (
	select
		coalesce(sum(minutes_actual), 0)::int as focus_minutes,
		count(*) filter (where status = 'completed')::int as completed,
		count(*) filter (where status = 'interrupted')::int as interrupted
	from base
	where local_date >= date_trunc('month', current_date)::date
),
all_time_stats as (
	select
		coalesce(sum(minutes_actual), 0)::int as focus_minutes,
		count(*) filter (where status = 'completed')::int as completed,
		count(*) filter (where status = 'interrupted')::int as interrupted
	from base
),
daily as (
	select
		d::date as date,
		coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
		count(p.id) filter (where p.status = 'completed')::int as completed,
		count(p.id) filter (where p.status = 'interrupted')::int as interrupted
	from generate_series(current_date - interval '29 days', current_date, interval '1 day') as d
	left join base p on p.local_date = d::date
	group by d
	order by d
),
by_task as (
	select
		t.id as tarea_id,
		t.nombre,
		coalesce(sum(p.minutes_actual), 0)::int as focus_minutes
	from base p
	join public.tareas t on t.id = p.tarea_id
	group by t.id, t.nombre
	order by focus_minutes desc, t.nombre
	limit 5
)
select jsonb_build_object(
	'today', (select to_jsonb(today_stats) from today_stats),
	'week', (select to_jsonb(week_stats) from week_stats),
	'month', (select to_jsonb(month_stats) from month_stats),
	'all_time', (select to_jsonb(all_time_stats) from all_time_stats),
	'daily', (select coalesce(jsonb_agg(to_jsonb(daily) order by date), '[]'::jsonb) from daily),
	'by_task', (select coalesce(jsonb_agg(to_jsonb(by_task) order by focus_minutes desc), '[]'::jsonb) from by_task)
);
$$;

revoke all on function public.get_dashboard() from public;
revoke all on function public.get_dashboard() from anon;
grant execute on function public.get_dashboard() to authenticated;

-- ============================================================
-- 20261023210000_tarea_opcional.sql
-- ============================================================
-- Un pomodoro puede existir sin tarea asociada.
alter table public.pomodoros
	alter column tarea_id drop not null;

-- ============================================================
-- 20261023220000_sync_timestamps.sql
-- ============================================================
-- Timestamps y ciclo para sincronizar pomodoros/breaks desde el cliente.
alter table public.pomodoros
	add column if not exists started_at timestamptz,
	add column if not exists ended_at timestamptz,
	add column if not exists cycle_position integer;

alter table public.breaks
	add column if not exists started_at timestamptz,
	add column if not exists ended_at timestamptz;

-- ============================================================
-- 20261023230000_bloques_tareas.sql
-- ============================================================
-- Bloques y tareas atómicas por focus.
-- La tabla de bloques se puede normalizar después; por ahora guardamos el id.
alter table public.tareas
	add column if not exists bloque_id uuid,
	add column if not exists creada_en_focus_id uuid,
	add column if not exists completada_en_focus_id uuid,
	add column if not exists eliminada_en_focus_id uuid;

alter table public.pomodoros
	add column if not exists bloque_id uuid;

alter table public.breaks
	add column if not exists bloque_id uuid;

create index if not exists tareas_bloque_idx on public.tareas (bloque_id) where deleted_at is null;
create index if not exists pomodoros_bloque_idx on public.pomodoros (bloque_id);
create index if not exists breaks_bloque_idx on public.breaks (bloque_id);

-- ============================================================
-- 20261025120000_sync_conflictos.sql
-- ============================================================
-- Sincronización multi-dispositivo: versión de cliente, dispositivo y RPC con guardia.

alter table public.tareas
	add column if not exists client_updated_at timestamptz,
	add column if not exists last_device_id text;

-- Backfill con la última versión conocida; no con now(), para no rechazar ediciones offline.
-- Se desactiva el trigger para no mover updated_at ni el cursor de pull.
alter table public.tareas disable trigger tareas_set_updated_at;

update public.tareas
set client_updated_at = updated_at
where client_updated_at is null;

alter table public.tareas enable trigger tareas_set_updated_at;

alter table public.tareas
	alter column client_updated_at set not null,
	alter column client_updated_at set default now();

-- Cursor de pull incremental por usuario.
create index if not exists tareas_user_updated_idx on public.tareas (user_id, updated_at);

-- Aplica un upsert de tarea con last-write-wins y borrado monotónico.
create or replace function public.upsert_tarea(payload jsonb)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
	v_id uuid := (payload ->> 'id')::uuid;
	v_cliente timestamptz := coalesce((payload ->> 'clientUpdatedAt')::timestamptz, now());
	v_deleted timestamptz := nullif(payload ->> 'deletedAt', '')::timestamptz;
	v_usuario uuid := auth.uid();
	v_actual public.tareas%rowtype;
begin
	if v_usuario is null then
		raise exception 'sin sesión';
	end if;

	select * into v_actual
	from public.tareas
	where id = v_id
	for update;

	if not found then
		insert into public.tareas (
			id,
			user_id,
			nombre,
			estado,
			created_at,
			completed_at,
			deleted_at,
			bloque_id,
			creada_en_focus_id,
			completada_en_focus_id,
			eliminada_en_focus_id,
			client_updated_at,
			last_device_id
		)
		values (
			v_id,
			v_usuario,
			payload ->> 'nombre',
			payload ->> 'estado',
			coalesce((payload ->> 'createdAt')::timestamptz, now()),
			nullif(payload ->> 'completedAt', '')::timestamptz,
			v_deleted,
			nullif(payload ->> 'bloqueId', '')::uuid,
			nullif(payload ->> 'creadaEnFocusId', '')::uuid,
			nullif(payload ->> 'completadaEnFocusId', '')::uuid,
			nullif(payload ->> 'eliminadaEnFocusId', '')::uuid,
			v_cliente,
			nullif(payload ->> 'deviceId', '')
		);

		return 'inserted';
	end if;

	if v_actual.user_id <> v_usuario then
		raise exception 'no autorizado';
	end if;

	-- Una tarea eliminada no revive.
	if v_actual.deleted_at is not null then
		return 'deleted';
	end if;

	-- Un reintento viejo no pisa un cambio más nuevo.
	if v_actual.client_updated_at > v_cliente then
		return 'stale';
	end if;

	update public.tareas
	set
		nombre = payload ->> 'nombre',
		estado = payload ->> 'estado',
		completed_at = nullif(payload ->> 'completedAt', '')::timestamptz,
		deleted_at = v_deleted,
		bloque_id = nullif(payload ->> 'bloqueId', '')::uuid,
		creada_en_focus_id = nullif(payload ->> 'creadaEnFocusId', '')::uuid,
		completada_en_focus_id = nullif(payload ->> 'completadaEnFocusId', '')::uuid,
		eliminada_en_focus_id = nullif(payload ->> 'eliminadaEnFocusId', '')::uuid,
		client_updated_at = v_cliente,
		last_device_id = nullif(payload ->> 'deviceId', '')
	where id = v_id;

	return 'applied';
end;
$$;

revoke all on function public.upsert_tarea(jsonb) from public;
grant execute on function public.upsert_tarea(jsonb) to authenticated;

-- ============================================================
-- 20261025130000_purga_tombstones.sql
-- ============================================================
-- Purga de tombstones del servidor y job diario si pg_cron está disponible.

create or replace function public.purgar_tombstones(dias integer default 90)
returns integer
language sql
security definer
set search_path = public
as $$
	with borradas as (
		delete from public.tareas
		where deleted_at is not null
			and deleted_at < now() - make_interval(days => dias)
		returning 1
	)
	select count(*)::integer from borradas;
$$;

revoke all on function public.purgar_tombstones(integer) from public;
revoke all on function public.purgar_tombstones(integer) from anon, authenticated;

-- Solo el owner/service_role puede ejecutarla; los usuarios no.
do $$
begin
	if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
		execute 'create extension if not exists pg_cron';
		perform cron.unschedule(jobid) from cron.job where jobname = 'tempo-purgar-tombstones';
		perform cron.schedule(
			'tempo-purgar-tombstones',
			'20 4 * * *',
			'select public.purgar_tombstones(90)'
		);
	end if;
exception
	when others then
		raise notice 'pg_cron no disponible, programa la purga manualmente: %', sqlerrm;
end $$;

-- ============================================================
-- 20261025150000_dispositivos_preferencias.sql
-- ============================================================
-- Preferencias del perfil, dispositivos y atribución por dispositivo.

alter table public.profiles
	add column if not exists timezone text not null default 'America/Mexico_City',
	add column if not exists locale text not null default 'en';

alter table public.profiles
	add constraint profiles_locale_check check (locale in ('en', 'es'));

create or replace function public.validar_timezone_perfil()
returns trigger
language plpgsql
as $$
begin
	if not exists (select 1 from pg_timezone_names where name = new.timezone) then
		raise exception 'zona horaria inválida: %', new.timezone;
	end if;

	return new;
end;
$$;

create trigger profiles_validar_timezone
before insert or update of timezone on public.profiles
for each row execute function public.validar_timezone_perfil();

create table if not exists public.devices (
	user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
	id text not null,
	name text not null default 'Device',
	platform text,
	created_at timestamptz not null default now(),
	last_seen_at timestamptz not null default now(),
	primary key (user_id, id)
);

create index if not exists devices_user_last_idx on public.devices (user_id, last_seen_at desc);

alter table public.devices enable row level security;

create policy "devices_all_own"
on public.devices for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on public.devices to authenticated;
revoke all on public.devices from anon;

create or replace function public.registrar_dispositivo(
	p_id text,
	p_name text,
	p_platform text default null
)
returns void
language sql
security invoker
set search_path = public
as $$
	insert into public.devices (user_id, id, name, platform, last_seen_at)
	values (auth.uid(), p_id, coalesce(nullif(p_name, ''), 'Device'), p_platform, now())
	on conflict (user_id, id) do update
		set name = excluded.name,
			platform = excluded.platform,
			last_seen_at = now();
$$;

grant execute on function public.registrar_dispositivo(text, text, text) to authenticated;

-- Atribución de cada pomodoro/break al dispositivo que lo registró.
alter table public.pomodoros add column if not exists device_id text;
alter table public.breaks add column if not exists device_id text;

create index if not exists pomodoros_user_device_date_idx
on public.pomodoros (user_id, device_id, local_date);

create index if not exists breaks_user_device_date_idx
on public.breaks (user_id, device_id, local_date);

-- ============================================================
-- 20261025160000_tema_dispositivo.sql
-- ============================================================
-- Tema por dispositivo (usuario + navegador).

alter table public.devices
	add column if not exists theme text check (theme in ('light', 'dark', 'system'));

drop function if exists public.registrar_dispositivo(text, text, text);

create or replace function public.registrar_dispositivo(
	p_id text,
	p_name text,
	p_platform text default null,
	p_theme text default null
)
returns void
language sql
security invoker
set search_path = public
as $$
	insert into public.devices (user_id, id, name, platform, theme, last_seen_at)
	values (
		auth.uid(),
		p_id,
		coalesce(nullif(p_name, ''), 'Device'),
		p_platform,
		case when p_theme in ('light', 'dark', 'system') then p_theme else null end,
		now()
	)
	on conflict (user_id, id) do update
		set name = excluded.name,
			platform = excluded.platform,
			theme = coalesce(excluded.theme, public.devices.theme),
			last_seen_at = now();
$$;

grant execute on function public.registrar_dispositivo(text, text, text, text) to authenticated;

-- ============================================================
-- 20261025170000_dashboard_v2.sql
-- ============================================================
-- Dashboard v2: rango, dispositivo, zona horaria y métricas avanzadas.

drop function if exists public.get_dashboard();

create or replace function public.get_dashboard(
	p_dias integer default 30,
	p_device_id text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
	v_usuario uuid := auth.uid();
	v_zona text;
	v_hoy date;
	v_pro boolean;
	v_dias integer;
	v_dias_diarios integer;
	v_dispositivo text;
begin
	if v_usuario is null then
		raise exception 'sin sesión';
	end if;

	select timezone into v_zona from public.profiles where id = v_usuario;
	v_zona := coalesce(v_zona, 'America/Mexico_City');
	v_hoy := (now() at time zone v_zona)::date;

	select exists (
		select 1
		from public.subscriptions s
		where s.user_id = v_usuario
			and s.plan = 'pro'
			and s.status in ('active', 'trialing', 'canceled')
			and (s.current_period_end is null or s.current_period_end > now())
	) into v_pro;

	v_dias := case when p_dias is null or p_dias <= 0 then 0 else p_dias end;

	if not v_pro then
		v_dias := case when v_dias = 0 then 30 else least(greatest(v_dias, 7), 30) end;
		v_dispositivo := null;
	else
		if v_dias > 0 then
			v_dias := least(v_dias, 3650);
		end if;

		v_dispositivo := nullif(p_device_id, '');

		if v_dispositivo is not null and not exists (
			select 1 from public.devices d
			where d.user_id = v_usuario and d.id = v_dispositivo
		) then
			raise exception 'dispositivo inválido';
		end if;
	end if;

	v_dias_diarios := case when v_dias = 0 then 365 else v_dias end;

	return (
		with base as (
			select p.*
			from public.pomodoros p
			where p.user_id = v_usuario
				and (v_dispositivo is null or p.device_id = v_dispositivo)
		),
		hoy as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date = v_hoy
		),
		semana as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date between v_hoy - 6 and v_hoy
		),
		mes as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date >= date_trunc('month', v_hoy)::date
		),
		total as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
		),
		semana_previa as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date between v_hoy - 13 and v_hoy - 7
		),
		dias as (
			select generate_series(
				v_hoy - (v_dias_diarios - 1),
				v_hoy,
				interval '1 day'
			)::date as fecha
		),
		diario as (
			select
				d.fecha as date,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(p.id) filter (where p.status <> 'interrupted')::int as completed,
				count(p.id) filter (where p.status = 'interrupted')::int as interrupted
			from dias d
			left join base p on p.local_date = d.fecha
			group by d.fecha
			order by d.fecha
		),
		por_tarea as (
			select
				t.id as tarea_id,
				t.nombre,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes
			from base p
			join public.tareas t on t.id = p.tarea_id
			group by t.id, t.nombre
			order by focus_minutes desc, t.nombre
			limit 10
		),
		por_dispositivo as (
			select
				p.device_id,
				coalesce(d.name, 'Unknown') as nombre,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where p.status <> 'interrupted')::int as completed
			from base p
			left join public.devices d on d.user_id = v_usuario and d.id = p.device_id
			group by p.device_id, d.name
			order by focus_minutes desc
		),
		dias_activos as (
			select local_date
			from base
			group by local_date
			having sum(minutes_actual) > 0
		),
		grupos as (
			select
				local_date,
				local_date - (row_number() over (order by local_date))::int as grupo
			from dias_activos
		),
		rachas as (
			select grupo, count(*)::int as largo, max(local_date) as fin
			from grupos
			group by grupo
		),
		racha as (
			select
				coalesce(max(largo), 0)::int as longest,
				coalesce(max(largo) filter (where fin in (v_hoy, v_hoy - 1)), 0)::int as current
			from rachas
		),
		mejor_dia as (
			select local_date as date, sum(minutes_actual)::int as focus_minutes
			from base
			group by local_date
			order by focus_minutes desc
			limit 1
		),
		mejor_semana as (
			select
				date_trunc('week', local_date)::date as week_start,
				sum(minutes_actual)::int as focus_minutes
			from base
			group by 1
			order by focus_minutes desc
			limit 1
		),
		sesion_mas_larga as (
			select coalesce(max(minutes_actual), 0)::int as minutes from base
		)
		select jsonb_build_object(
			'today', (select to_jsonb(hoy) from hoy),
			'week', (select to_jsonb(semana) from semana),
			'month', (select to_jsonb(mes) from mes),
			'all_time', (select to_jsonb(total) from total),
			'previous_week', (select to_jsonb(semana_previa) from semana_previa),
			'daily', coalesce((select jsonb_agg(to_jsonb(diario) order by date) from diario), '[]'::jsonb),
			'by_task', coalesce((select jsonb_agg(to_jsonb(por_tarea) order by focus_minutes desc) from por_tarea), '[]'::jsonb),
			'devices', case
				when v_pro then coalesce((select jsonb_agg(to_jsonb(por_dispositivo) order by focus_minutes desc) from por_dispositivo), '[]'::jsonb)
				else '[]'::jsonb
			end,
			'streak', (select to_jsonb(racha) from racha),
			'best_day', (select to_jsonb(mejor_dia) from mejor_dia),
			'best_week', (select to_jsonb(mejor_semana) from mejor_semana),
			'longest_session', (select minutes from sesion_mas_larga),
			'plan', case when v_pro then 'pro' else 'free' end,
			'range_days', v_dias
		)
	);
end;
$$;

revoke all on function public.get_dashboard(integer, text) from public;
revoke all on function public.get_dashboard(integer, text) from anon;
grant execute on function public.get_dashboard(integer, text) to authenticated;

-- ============================================================
-- Migration history (so `supabase db push` does not re-apply)
-- ============================================================
create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);

insert into supabase_migrations.schema_migrations (version, name) values
  ('20261023160000', 'init'),
  ('20261023180000', 'dashboard'),
  ('20261023210000', 'tarea_opcional'),
  ('20261023220000', 'sync_timestamps'),
  ('20261023230000', 'bloques_tareas'),
  ('20261025120000', 'sync_conflictos'),
  ('20261025130000', 'purga_tombstones'),
  ('20261025150000', 'dispositivos_preferencias'),
  ('20261025160000', 'tema_dispositivo'),
  ('20261025170000', 'dashboard_v2')
on conflict (version) do nothing;

-- PostgREST must see the new tables and RPCs.
notify pgrst, 'reload schema';

-- ============================================================
-- 20261109190000_dashboard_alltime_ranges.sql
-- ============================================================
-- Dashboard: histórico completo, granularidad adaptativa, filtros por rango
-- y series semanales para las gráficas Pro.

create or replace function public.get_dashboard(
	p_dias integer default 30,
	p_device_id text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
	v_usuario uuid := auth.uid();
	v_zona text;
	v_hoy date;
	v_pro boolean;
	v_dias integer;
	v_dispositivo text;
	v_desde date;
	v_primer_dia date;
	v_span integer;
	v_granularidad text;
	v_fin_serie date;
begin
	if v_usuario is null then
		raise exception 'sin sesión';
	end if;

	select timezone into v_zona from public.profiles where id = v_usuario;
	v_zona := coalesce(v_zona, 'America/Mexico_City');
	v_hoy := (now() at time zone v_zona)::date;

	-- Misma regla que PlanPolicy: pro + estado vigente + periodo no vencido.
	select exists (
		select 1
		from public.subscriptions s
		where s.user_id = v_usuario
			and s.plan = 'pro'
			and s.status in ('active', 'trialing', 'canceled')
			and (s.current_period_end is null or s.current_period_end > now())
	) into v_pro;

	v_dias := case when p_dias is null or p_dias <= 0 then 0 else p_dias end;

	if not v_pro then
		v_dias := case when v_dias = 0 then 30 else least(greatest(v_dias, 7), 30) end;
		v_dispositivo := null;
	else
		if v_dias > 0 then
			v_dias := least(v_dias, 3650);
		end if;

		v_dispositivo := nullif(p_device_id, '');

		if v_dispositivo is not null and not exists (
			select 1 from public.devices d
			where d.user_id = v_usuario and d.id = v_dispositivo
		) then
			raise exception 'dispositivo inválido';
		end if;
	end if;

	select min(p.local_date) into v_primer_dia
	from public.pomodoros p
	where p.user_id = v_usuario
		and (v_dispositivo is null or p.device_id = v_dispositivo);

	v_primer_dia := coalesce(v_primer_dia, v_hoy);

	if v_dias = 0 then
		v_desde := v_primer_dia;
		v_span := (v_hoy - v_desde) + 1;
		-- Más de un año se agrupa por mes para que el histórico completo sea legible.
		v_granularidad := case when v_span > 365 then 'month' else 'day' end;
	else
		v_desde := v_hoy - (v_dias - 1);
		v_span := v_dias;
		v_granularidad := 'day';
	end if;

	v_fin_serie := case v_granularidad
		when 'day' then v_hoy
		else date_trunc('month', v_hoy)::date
	end;

	return (
		with base as (
			select p.*
			from public.pomodoros p
			where p.user_id = v_usuario
				and (v_dispositivo is null or p.device_id = v_dispositivo)
		),
		rango as (
			select p.*
			from base p
			where p.local_date >= v_desde
		),
		hoy as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date = v_hoy
		),
		semana as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date between v_hoy - 6 and v_hoy
		),
		mes as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date >= date_trunc('month', v_hoy)::date
		),
		total as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
		),
		semana_previa as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date between v_hoy - 13 and v_hoy - 7
		),
		series as (
			select generate_series(
				case v_granularidad
					when 'day' then v_desde
					else date_trunc('month', v_desde)::date
				end,
				v_fin_serie,
				case v_granularidad
					when 'day' then interval '1 day'
					else interval '1 month'
				end
			)::date as fecha
		),
		diario as (
			select
				s.fecha as date,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(p.id) filter (where p.status <> 'interrupted')::int as completed,
				count(p.id) filter (where p.status = 'interrupted')::int as interrupted
			from series s
			left join base p on
				case v_granularidad
					when 'day' then p.local_date = s.fecha
					else p.local_date >= s.fecha
						and p.local_date < (s.fecha + interval '1 month')::date
				end
			group by s.fecha
			order by s.fecha
		),
		semanas as (
			select generate_series(
				date_trunc('week', v_desde)::date,
				date_trunc('week', v_hoy)::date,
				interval '1 week'
			)::date as fecha
		),
		semanal as (
			select
				s.fecha as date,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(p.id) filter (where p.status <> 'interrupted')::int as completed,
				count(p.id) filter (where p.status = 'interrupted')::int as interrupted
			from semanas s
			left join base p on p.local_date >= s.fecha
				and p.local_date < (s.fecha + 7)
			group by s.fecha
			order by s.fecha
		),
		por_tarea as (
			select
				t.id as tarea_id,
				t.nombre,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes
			from rango p
			join public.tareas t on t.id = p.tarea_id
			group by t.id, t.nombre
			order by focus_minutes desc, t.nombre
			limit 10
		),
		por_dispositivo as (
			select
				p.device_id,
				coalesce(d.name, 'Unknown') as nombre,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where p.status <> 'interrupted')::int as completed
			from rango p
			left join public.devices d on d.user_id = v_usuario and d.id = p.device_id
			group by p.device_id, d.name
			order by focus_minutes desc
		),
		dias_activos as (
			select local_date
			from base
			group by local_date
			having sum(minutes_actual) > 0
		),
		grupos as (
			select
				local_date,
				local_date - (row_number() over (order by local_date))::int as grupo
			from dias_activos
		),
		rachas as (
			select grupo, count(*)::int as largo, max(local_date) as fin
			from grupos
			group by grupo
		),
		racha as (
			select
				coalesce(max(largo), 0)::int as longest,
				coalesce(max(largo) filter (where fin in (v_hoy, v_hoy - 1)), 0)::int as current
			from rachas
		),
		mejor_dia as (
			select local_date as date, sum(minutes_actual)::int as focus_minutes
			from base
			group by local_date
			order by focus_minutes desc
			limit 1
		),
		mejor_semana as (
			select
				date_trunc('week', local_date)::date as week_start,
				sum(minutes_actual)::int as focus_minutes
			from base
			group by 1
			order by focus_minutes desc
			limit 1
		),
		sesion_mas_larga as (
			select coalesce(max(minutes_actual), 0)::int as minutes from base
		)
		select jsonb_build_object(
			'today', (select to_jsonb(hoy) from hoy),
			'week', (select to_jsonb(semana) from semana),
			'month', (select to_jsonb(mes) from mes),
			'all_time', (select to_jsonb(total) from total),
			'previous_week', (select to_jsonb(semana_previa) from semana_previa),
			'daily', coalesce((select jsonb_agg(to_jsonb(diario) order by date) from diario), '[]'::jsonb),
			'weekly', coalesce((select jsonb_agg(to_jsonb(semanal) order by date) from semanal), '[]'::jsonb),
			'granularity', v_granularidad,
			'range_days', v_dias,
			'by_task', coalesce((select jsonb_agg(to_jsonb(por_tarea) order by focus_minutes desc) from por_tarea), '[]'::jsonb),
			'devices', case
				when v_pro then coalesce((select jsonb_agg(to_jsonb(por_dispositivo) order by focus_minutes desc) from por_dispositivo), '[]'::jsonb)
				else '[]'::jsonb
			end,
			'streak', (select to_jsonb(racha) from racha),
			'best_day', (select to_jsonb(mejor_dia) from mejor_dia),
			'best_week', (select to_jsonb(mejor_semana) from mejor_semana),
			'longest_session', (select minutes from sesion_mas_larga),
			'plan', case when v_pro then 'pro' else 'free' end
		)
	);
end;
$$;

revoke all on function public.get_dashboard(integer, text) from public;
revoke all on function public.get_dashboard(integer, text) from anon;
grant execute on function public.get_dashboard(integer, text) to authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- 20261109203000_dashboard_granularity_heatmap.sql
-- ============================================================
-- Dashboard: rango de 2 años, granularidad manual, heatmap y detalle de tareas.

drop function if exists public.get_dashboard(integer, text);

create or replace function public.get_dashboard(
	p_dias integer default 30,
	p_device_id text default null,
	p_granularidad text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
	v_usuario uuid := auth.uid();
	v_zona text;
	v_hoy date;
	v_pro boolean;
	v_dias integer;
	v_dispositivo text;
	v_desde date;
	v_primer_dia date;
	v_span integer;
	v_granularidad text;
	v_fin_serie date;
begin
	if v_usuario is null then
		raise exception 'sin sesión';
	end if;

	select timezone into v_zona from public.profiles where id = v_usuario;
	v_zona := coalesce(v_zona, 'America/Mexico_City');
	v_hoy := (now() at time zone v_zona)::date;

	select exists (
		select 1
		from public.subscriptions s
		where s.user_id = v_usuario
			and s.plan = 'pro'
			and s.status in ('active', 'trialing', 'canceled')
			and (s.current_period_end is null or s.current_period_end > now())
	) into v_pro;

	v_dias := case when p_dias is null or p_dias <= 0 then 0 else p_dias end;

	if not v_pro then
		v_dias := case when v_dias = 0 then 30 else least(greatest(v_dias, 7), 30) end;
		v_dispositivo := null;
	else
		if v_dias > 0 then
			v_dias := least(v_dias, 3650);
		end if;

		v_dispositivo := nullif(p_device_id, '');

		if v_dispositivo is not null and not exists (
			select 1 from public.devices d
			where d.user_id = v_usuario and d.id = v_dispositivo
		) then
			raise exception 'dispositivo inválido';
		end if;
	end if;

	select min(p.local_date) into v_primer_dia
	from public.pomodoros p
	where p.user_id = v_usuario
		and (v_dispositivo is null or p.device_id = v_dispositivo);

	v_primer_dia := coalesce(v_primer_dia, v_hoy);

	if v_dias = 0 then
		v_desde := v_primer_dia;
		v_span := (v_hoy - v_desde) + 1;

		v_granularidad := case when v_span > 365 then 'month' else 'day' end;
	else
		v_desde := v_hoy - (v_dias - 1);
		v_span := v_dias;

		v_granularidad := case
			when v_dias <= 31 then 'day'
			when v_dias <= 365 then 'week'
			else 'month'
		end;
	end if;

	if p_granularidad in ('day', 'week', 'month') then
		v_granularidad := p_granularidad;
	end if;

	v_fin_serie := case v_granularidad
		when 'day' then v_hoy
		when 'week' then date_trunc('week', v_hoy)::date
		else date_trunc('month', v_hoy)::date
	end;

	return (
		with base as (
			select p.*
			from public.pomodoros p
			where p.user_id = v_usuario
				and (v_dispositivo is null or p.device_id = v_dispositivo)
		),
		rango as (
			select p.*
			from base p
			where p.local_date >= v_desde
		),
		hoy as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date = v_hoy
		),
		semana as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date between v_hoy - 6 and v_hoy
		),
		mes as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date >= date_trunc('month', v_hoy)::date
		),
		total as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
		),
		semana_previa as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date between v_hoy - 13 and v_hoy - 7
		),
		series as (
			select generate_series(
				case v_granularidad
					when 'day' then v_desde
					when 'week' then date_trunc('week', v_desde)::date
					else date_trunc('month', v_desde)::date
				end,
				v_fin_serie,
				case v_granularidad
					when 'day' then interval '1 day'
					when 'week' then interval '1 week'
					else interval '1 month'
				end
			)::date as fecha
		),
		diario as (
			select
				s.fecha as date,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(p.id) filter (where p.status <> 'interrupted')::int as completed,
				count(p.id) filter (where p.status = 'interrupted')::int as interrupted
			from series s
			left join base p on
				case v_granularidad
					when 'day' then p.local_date = s.fecha
					when 'week' then p.local_date >= s.fecha
						and p.local_date < (s.fecha + 7)
					else p.local_date >= s.fecha
						and p.local_date < (s.fecha + interval '1 month')::date
				end
			group by s.fecha
			order by s.fecha
		),
		semanas as (
			select generate_series(
				date_trunc('week', v_primer_dia)::date,
				date_trunc('week', v_hoy)::date,
				interval '1 week'
			)::date as fecha
		),
		semanal as (
			select
				s.fecha as date,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(p.id) filter (where p.status <> 'interrupted')::int as completed,
				count(p.id) filter (where p.status = 'interrupted')::int as interrupted
			from semanas s
			left join base p on p.local_date >= s.fecha
				and p.local_date < (s.fecha + 7)
			group by s.fecha
			order by s.fecha
		),
		por_tarea as (
			select
				t.id as tarea_id,
				t.nombre,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(*)::int as sessions,
				count(*) filter (where p.status <> 'interrupted')::int as completed,
				max(p.local_date) as last_worked
			from rango p
			join public.tareas t on t.id = p.tarea_id
			group by t.id, t.nombre
			order by focus_minutes desc, t.nombre
			limit 10
		),
		por_dispositivo as (
			select
				p.device_id,
				coalesce(d.name, 'Unknown') as nombre,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where p.status <> 'interrupted')::int as completed
			from rango p
			left join public.devices d on d.user_id = v_usuario and d.id = p.device_id
			group by p.device_id, d.name
			order by focus_minutes desc
		),
		heatmap as (
			select
				extract(isodow from (coalesce(p.started_at, p.created_at) at time zone v_zona))::int as weekday,
				extract(hour from (coalesce(p.started_at, p.created_at) at time zone v_zona))::int as hour,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(*)::int as sessions
			from rango p
			group by 1, 2
			order by 1, 2
		),
		dias_activos as (
			select local_date
			from base
			group by local_date
			having sum(minutes_actual) > 0
		),
		grupos as (
			select
				local_date,
				local_date - (row_number() over (order by local_date))::int as grupo
			from dias_activos
		),
		rachas as (
			select grupo, count(*)::int as largo, max(local_date) as fin
			from grupos
			group by grupo
		),
		racha as (
			select
				coalesce(max(largo), 0)::int as longest,
				coalesce(max(largo) filter (where fin in (v_hoy, v_hoy - 1)), 0)::int as current
			from rachas
		),
		mejor_dia as (
			select local_date as date, sum(minutes_actual)::int as focus_minutes
			from base
			group by local_date
			order by focus_minutes desc
			limit 1
		),
		mejor_semana as (
			select
				date_trunc('week', local_date)::date as week_start,
				sum(minutes_actual)::int as focus_minutes
			from base
			group by 1
			order by focus_minutes desc
			limit 1
		),
		sesion_mas_larga as (
			select coalesce(max(minutes_actual), 0)::int as minutes from base
		)
		select jsonb_build_object(
			'today', (select to_jsonb(hoy) from hoy),
			'week', (select to_jsonb(semana) from semana),
			'month', (select to_jsonb(mes) from mes),
			'all_time', (select to_jsonb(total) from total),
			'previous_week', (select to_jsonb(semana_previa) from semana_previa),
			'daily', coalesce((select jsonb_agg(to_jsonb(diario) order by date) from diario), '[]'::jsonb),
			'weekly', coalesce((select jsonb_agg(to_jsonb(semanal) order by date) from semanal), '[]'::jsonb),
			'heatmap', coalesce((select jsonb_agg(to_jsonb(heatmap) order by weekday, hour) from heatmap), '[]'::jsonb),
			'granularity', v_granularidad,
			'range_days', v_dias,
			'by_task', coalesce((select jsonb_agg(to_jsonb(por_tarea) order by focus_minutes desc) from por_tarea), '[]'::jsonb),
			'devices', case
				when v_pro then coalesce((select jsonb_agg(to_jsonb(por_dispositivo) order by focus_minutes desc) from por_dispositivo), '[]'::jsonb)
				else '[]'::jsonb
			end,
			'streak', (select to_jsonb(racha) from racha),
			'best_day', (select to_jsonb(mejor_dia) from mejor_dia),
			'best_week', (select to_jsonb(mejor_semana) from mejor_semana),
			'longest_session', (select minutes from sesion_mas_larga),
			'plan', case when v_pro then 'pro' else 'free' end
		)
	);
end;
$$;

revoke all on function public.get_dashboard(integer, text, text) from public;
revoke all on function public.get_dashboard(integer, text, text) from anon;
grant execute on function public.get_dashboard(integer, text, text) to authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- 20261109210000_dashboard_calendar.sql
-- ============================================================
-- Dashboard: filtros globales, weekly dentro del rango y calendario diario.

drop function if exists public.get_dashboard(integer, text, text);

create or replace function public.get_dashboard(
	p_dias integer default 30,
	p_device_id text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
	v_usuario uuid := auth.uid();
	v_zona text;
	v_hoy date;
	v_pro boolean;
	v_dias integer;
	v_dispositivo text;
	v_desde date;
	v_primer_dia date;
	v_span integer;
	v_granularidad text;
	v_fin_serie date;
begin
	if v_usuario is null then
		raise exception 'sin sesión';
	end if;

	select timezone into v_zona from public.profiles where id = v_usuario;
	v_zona := coalesce(v_zona, 'America/Mexico_City');
	v_hoy := (now() at time zone v_zona)::date;

	select exists (
		select 1
		from public.subscriptions s
		where s.user_id = v_usuario
			and s.plan = 'pro'
			and s.status in ('active', 'trialing', 'canceled')
			and (s.current_period_end is null or s.current_period_end > now())
	) into v_pro;

	v_dias := case when p_dias is null or p_dias <= 0 then 0 else p_dias end;

	if not v_pro then
		v_dias := case when v_dias = 0 then 30 else least(greatest(v_dias, 7), 30) end;
		v_dispositivo := null;
	else
		if v_dias > 0 then
			v_dias := least(v_dias, 3650);
		end if;

		v_dispositivo := nullif(p_device_id, '');

		if v_dispositivo is not null and not exists (
			select 1 from public.devices d
			where d.user_id = v_usuario and d.id = v_dispositivo
		) then
			raise exception 'dispositivo inválido';
		end if;
	end if;

	select min(p.local_date) into v_primer_dia
	from public.pomodoros p
	where p.user_id = v_usuario
		and (v_dispositivo is null or p.device_id = v_dispositivo);

	v_primer_dia := coalesce(v_primer_dia, v_hoy);

	if v_dias = 0 then
		v_desde := v_primer_dia;
		v_span := (v_hoy - v_desde) + 1;
		v_granularidad := case when v_span > 365 then 'month' else 'day' end;
	else
		v_desde := v_hoy - (v_dias - 1);
		v_span := v_dias;

		v_granularidad := case
			when v_dias <= 31 then 'day'
			when v_dias <= 365 then 'week'
			else 'month'
		end;
	end if;

	v_fin_serie := case v_granularidad
		when 'day' then v_hoy
		when 'week' then date_trunc('week', v_hoy)::date
		else date_trunc('month', v_hoy)::date
	end;

	return (
		with base as (
			select p.*
			from public.pomodoros p
			where p.user_id = v_usuario
				and (v_dispositivo is null or p.device_id = v_dispositivo)
		),
		rango as (
			select p.*
			from base p
			where p.local_date >= v_desde
		),
		hoy as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date = v_hoy
		),
		semana as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date between v_hoy - 6 and v_hoy
		),
		mes as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date >= date_trunc('month', v_hoy)::date
		),
		total as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
		),
		semana_previa as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date between v_hoy - 13 and v_hoy - 7
		),
		series as (
			select generate_series(
				case v_granularidad
					when 'day' then v_desde
					when 'week' then date_trunc('week', v_desde)::date
					else date_trunc('month', v_desde)::date
				end,
				v_fin_serie,
				case v_granularidad
					when 'day' then interval '1 day'
					when 'week' then interval '1 week'
					else interval '1 month'
				end
			)::date as fecha
		),
		diario as (
			select
				s.fecha as date,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(p.id) filter (where p.status <> 'interrupted')::int as completed,
				count(p.id) filter (where p.status = 'interrupted')::int as interrupted
			from series s
			left join base p on
				case v_granularidad
					when 'day' then p.local_date = s.fecha
					when 'week' then p.local_date >= s.fecha
						and p.local_date < (s.fecha + 7)
					else p.local_date >= s.fecha
						and p.local_date < (s.fecha + interval '1 month')::date
				end
			group by s.fecha
			order by s.fecha
		),
		semanas as (
			select generate_series(
				date_trunc('week', v_desde)::date,
				date_trunc('week', v_hoy)::date,
				interval '1 week'
			)::date as fecha
		),
		semanal as (
			select
				s.fecha as date,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(p.id) filter (where p.status <> 'interrupted')::int as completed,
				count(p.id) filter (where p.status = 'interrupted')::int as interrupted
			from semanas s
			left join rango p on p.local_date >= s.fecha
				and p.local_date < (s.fecha + 7)
			group by s.fecha
			order by s.fecha
		),
		calendario_dias as (
			select generate_series(
				v_desde,
				v_hoy,
				interval '1 day'
			)::date as fecha
		),
		calendario as (
			select
				c.fecha as date,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(p.id)::int as sessions
			from calendario_dias c
			left join rango p on p.local_date = c.fecha
			group by c.fecha
			order by c.fecha
		),
		por_tarea as (
			select
				t.id as tarea_id,
				t.nombre,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(*)::int as sessions,
				count(*) filter (where p.status <> 'interrupted')::int as completed,
				max(p.local_date) as last_worked
			from rango p
			join public.tareas t on t.id = p.tarea_id
			group by t.id, t.nombre
			order by focus_minutes desc, t.nombre
			limit 10
		),
		por_dispositivo as (
			select
				p.device_id,
				coalesce(d.name, 'Unknown') as nombre,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where p.status <> 'interrupted')::int as completed
			from rango p
			left join public.devices d on d.user_id = v_usuario and d.id = p.device_id
			group by p.device_id, d.name
			order by focus_minutes desc
		),
		dias_activos as (
			select local_date
			from base
			group by local_date
			having sum(minutes_actual) > 0
		),
		grupos as (
			select
				local_date,
				local_date - (row_number() over (order by local_date))::int as grupo
			from dias_activos
		),
		rachas as (
			select grupo, count(*)::int as largo, max(local_date) as fin
			from grupos
			group by grupo
		),
		racha as (
			select
				coalesce(max(largo), 0)::int as longest,
				coalesce(max(largo) filter (where fin in (v_hoy, v_hoy - 1)), 0)::int as current
			from rachas
		),
		mejor_dia as (
			select local_date as date, sum(minutes_actual)::int as focus_minutes
			from base
			group by local_date
			order by focus_minutes desc
			limit 1
		),
		mejor_semana as (
			select
				date_trunc('week', local_date)::date as week_start,
				sum(minutes_actual)::int as focus_minutes
			from base
			group by 1
			order by focus_minutes desc
			limit 1
		),
		sesion_mas_larga as (
			select coalesce(max(minutes_actual), 0)::int as minutes from base
		)
		select jsonb_build_object(
			'today', (select to_jsonb(hoy) from hoy),
			'week', (select to_jsonb(semana) from semana),
			'month', (select to_jsonb(mes) from mes),
			'all_time', (select to_jsonb(total) from total),
			'previous_week', (select to_jsonb(semana_previa) from semana_previa),
			'daily', coalesce((select jsonb_agg(to_jsonb(diario) order by date) from diario), '[]'::jsonb),
			'weekly', coalesce((select jsonb_agg(to_jsonb(semanal) order by date) from semanal), '[]'::jsonb),
			'calendar', coalesce((select jsonb_agg(to_jsonb(calendario) order by date) from calendario), '[]'::jsonb),
			'granularity', v_granularidad,
			'range_days', v_dias,
			'by_task', coalesce((select jsonb_agg(to_jsonb(por_tarea) order by focus_minutes desc) from por_tarea), '[]'::jsonb),
			'devices', case
				when v_pro then coalesce((select jsonb_agg(to_jsonb(por_dispositivo) order by focus_minutes desc) from por_dispositivo), '[]'::jsonb)
				else '[]'::jsonb
			end,
			'streak', (select to_jsonb(racha) from racha),
			'best_day', (select to_jsonb(mejor_dia) from mejor_dia),
			'best_week', (select to_jsonb(mejor_semana) from mejor_semana),
			'longest_session', (select minutes from sesion_mas_larga),
			'plan', case when v_pro then 'pro' else 'free' end
		)
	);
end;
$$;

revoke all on function public.get_dashboard(integer, text) from public;
revoke all on function public.get_dashboard(integer, text) from anon;
grant execute on function public.get_dashboard(integer, text) to authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- 20261109211000_dashboard_daily_range_fix.sql
-- ============================================================
-- Dashboard: la serie agregada no cuenta días previos al rango.

drop function if exists public.get_dashboard(integer, text, text);

create or replace function public.get_dashboard(
	p_dias integer default 30,
	p_device_id text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
	v_usuario uuid := auth.uid();
	v_zona text;
	v_hoy date;
	v_pro boolean;
	v_dias integer;
	v_dispositivo text;
	v_desde date;
	v_primer_dia date;
	v_span integer;
	v_granularidad text;
	v_fin_serie date;
begin
	if v_usuario is null then
		raise exception 'sin sesión';
	end if;

	select timezone into v_zona from public.profiles where id = v_usuario;
	v_zona := coalesce(v_zona, 'America/Mexico_City');
	v_hoy := (now() at time zone v_zona)::date;

	select exists (
		select 1
		from public.subscriptions s
		where s.user_id = v_usuario
			and s.plan = 'pro'
			and s.status in ('active', 'trialing', 'canceled')
			and (s.current_period_end is null or s.current_period_end > now())
	) into v_pro;

	v_dias := case when p_dias is null or p_dias <= 0 then 0 else p_dias end;

	if not v_pro then
		v_dias := case when v_dias = 0 then 30 else least(greatest(v_dias, 7), 30) end;
		v_dispositivo := null;
	else
		if v_dias > 0 then
			v_dias := least(v_dias, 3650);
		end if;

		v_dispositivo := nullif(p_device_id, '');

		if v_dispositivo is not null and not exists (
			select 1 from public.devices d
			where d.user_id = v_usuario and d.id = v_dispositivo
		) then
			raise exception 'dispositivo inválido';
		end if;
	end if;

	select min(p.local_date) into v_primer_dia
	from public.pomodoros p
	where p.user_id = v_usuario
		and (v_dispositivo is null or p.device_id = v_dispositivo);

	v_primer_dia := coalesce(v_primer_dia, v_hoy);

	if v_dias = 0 then
		v_desde := v_primer_dia;
		v_span := (v_hoy - v_desde) + 1;
		v_granularidad := case when v_span > 365 then 'month' else 'day' end;
	else
		v_desde := v_hoy - (v_dias - 1);
		v_span := v_dias;

		v_granularidad := case
			when v_dias <= 31 then 'day'
			when v_dias <= 365 then 'week'
			else 'month'
		end;
	end if;

	v_fin_serie := case v_granularidad
		when 'day' then v_hoy
		when 'week' then date_trunc('week', v_hoy)::date
		else date_trunc('month', v_hoy)::date
	end;

	return (
		with base as (
			select p.*
			from public.pomodoros p
			where p.user_id = v_usuario
				and (v_dispositivo is null or p.device_id = v_dispositivo)
		),
		rango as (
			select p.*
			from base p
			where p.local_date >= v_desde
		),
		hoy as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date = v_hoy
		),
		semana as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date between v_hoy - 6 and v_hoy
		),
		mes as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date >= date_trunc('month', v_hoy)::date
		),
		total as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
		),
		semana_previa as (
			select
				coalesce(sum(minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where status <> 'interrupted')::int as completed,
				count(*) filter (where status = 'interrupted')::int as interrupted
			from base
			where local_date between v_hoy - 13 and v_hoy - 7
		),
		series as (
			select generate_series(
				case v_granularidad
					when 'day' then v_desde
					when 'week' then date_trunc('week', v_desde)::date
					else date_trunc('month', v_desde)::date
				end,
				v_fin_serie,
				case v_granularidad
					when 'day' then interval '1 day'
					when 'week' then interval '1 week'
					else interval '1 month'
				end
			)::date as fecha
		),
		diario as (
			select
				s.fecha as date,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(p.id) filter (where p.status <> 'interrupted')::int as completed,
				count(p.id) filter (where p.status = 'interrupted')::int as interrupted
			from series s
			left join rango p on
				case v_granularidad
					when 'day' then p.local_date = s.fecha
					when 'week' then p.local_date >= s.fecha
						and p.local_date < (s.fecha + 7)
					else p.local_date >= s.fecha
						and p.local_date < (s.fecha + interval '1 month')::date
				end
			group by s.fecha
			order by s.fecha
		),
		semanas as (
			select generate_series(
				date_trunc('week', v_desde)::date,
				date_trunc('week', v_hoy)::date,
				interval '1 week'
			)::date as fecha
		),
		semanal as (
			select
				s.fecha as date,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(p.id) filter (where p.status <> 'interrupted')::int as completed,
				count(p.id) filter (where p.status = 'interrupted')::int as interrupted
			from semanas s
			left join rango p on p.local_date >= s.fecha
				and p.local_date < (s.fecha + 7)
			group by s.fecha
			order by s.fecha
		),
		calendario_dias as (
			select generate_series(
				v_desde,
				v_hoy,
				interval '1 day'
			)::date as fecha
		),
		calendario as (
			select
				c.fecha as date,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(p.id)::int as sessions
			from calendario_dias c
			left join rango p on p.local_date = c.fecha
			group by c.fecha
			order by c.fecha
		),
		por_tarea as (
			select
				t.id as tarea_id,
				t.nombre,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(*)::int as sessions,
				count(*) filter (where p.status <> 'interrupted')::int as completed,
				max(p.local_date) as last_worked
			from rango p
			join public.tareas t on t.id = p.tarea_id
			group by t.id, t.nombre
			order by focus_minutes desc, t.nombre
			limit 10
		),
		por_dispositivo as (
			select
				p.device_id,
				coalesce(d.name, 'Unknown') as nombre,
				coalesce(sum(p.minutes_actual), 0)::int as focus_minutes,
				count(*) filter (where p.status <> 'interrupted')::int as completed
			from rango p
			left join public.devices d on d.user_id = v_usuario and d.id = p.device_id
			group by p.device_id, d.name
			order by focus_minutes desc
		),
		dias_activos as (
			select local_date
			from base
			group by local_date
			having sum(minutes_actual) > 0
		),
		grupos as (
			select
				local_date,
				local_date - (row_number() over (order by local_date))::int as grupo
			from dias_activos
		),
		rachas as (
			select grupo, count(*)::int as largo, max(local_date) as fin
			from grupos
			group by grupo
		),
		racha as (
			select
				coalesce(max(largo), 0)::int as longest,
				coalesce(max(largo) filter (where fin in (v_hoy, v_hoy - 1)), 0)::int as current
			from rachas
		),
		mejor_dia as (
			select local_date as date, sum(minutes_actual)::int as focus_minutes
			from base
			group by local_date
			order by focus_minutes desc
			limit 1
		),
		mejor_semana as (
			select
				date_trunc('week', local_date)::date as week_start,
				sum(minutes_actual)::int as focus_minutes
			from base
			group by 1
			order by focus_minutes desc
			limit 1
		),
		sesion_mas_larga as (
			select coalesce(max(minutes_actual), 0)::int as minutes from base
		)
		select jsonb_build_object(
			'today', (select to_jsonb(hoy) from hoy),
			'week', (select to_jsonb(semana) from semana),
			'month', (select to_jsonb(mes) from mes),
			'all_time', (select to_jsonb(total) from total),
			'previous_week', (select to_jsonb(semana_previa) from semana_previa),
			'daily', coalesce((select jsonb_agg(to_jsonb(diario) order by date) from diario), '[]'::jsonb),
			'weekly', coalesce((select jsonb_agg(to_jsonb(semanal) order by date) from semanal), '[]'::jsonb),
			'calendar', coalesce((select jsonb_agg(to_jsonb(calendario) order by date) from calendario), '[]'::jsonb),
			'granularity', v_granularidad,
			'range_days', v_dias,
			'by_task', coalesce((select jsonb_agg(to_jsonb(por_tarea) order by focus_minutes desc) from por_tarea), '[]'::jsonb),
			'devices', case
				when v_pro then coalesce((select jsonb_agg(to_jsonb(por_dispositivo) order by focus_minutes desc) from por_dispositivo), '[]'::jsonb)
				else '[]'::jsonb
			end,
			'streak', (select to_jsonb(racha) from racha),
			'best_day', (select to_jsonb(mejor_dia) from mejor_dia),
			'best_week', (select to_jsonb(mejor_semana) from mejor_semana),
			'longest_session', (select minutes from sesion_mas_larga),
			'plan', case when v_pro then 'pro' else 'free' end
		)
	);
end;
$$;

revoke all on function public.get_dashboard(integer, text) from public;
revoke all on function public.get_dashboard(integer, text) from anon;
grant execute on function public.get_dashboard(integer, text) to authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- 20261109220000_billing_polar.sql
-- ============================================================
-- Billing Polar: estados del proveedor, orden de eventos y procesamiento idempotente.

alter table public.subscriptions
	add column if not exists last_event_at timestamptz;

alter table public.billing_events
	add column if not exists event_at timestamptz not null default now();

alter table public.subscriptions
	drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
	add constraint subscriptions_status_check
	check (
		status in (
			'active',
			'trialing',
			'past_due',
			'canceled',
			'paused',
			'incomplete',
			'incomplete_expired',
			'unpaid'
		)
	);

-- Guarda un evento sin tocar la suscripción.
create or replace function public.record_billing_event(
	p_event_id text,
	p_event_type text,
	p_event_at timestamptz,
	p_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_insertado text;
begin
	insert into public.billing_events (id, type, payload, event_at)
	values (p_event_id, p_event_type, p_payload, coalesce(p_event_at, now()))
	on conflict (id) do nothing
	returning id into v_insertado;

	return v_insertado is not null;
end;
$$;

-- Guarda el evento y aplica la suscripción de Polar.
-- Si el evento es duplicado, no hace nada.
-- Si el evento es más viejo que el último aplicado, lo guarda pero no pisa el estado.
create or replace function public.apply_polar_subscription_event(
	p_event_id text,
	p_event_type text,
	p_event_at timestamptz,
	p_payload jsonb,
	p_user_id uuid,
	p_status text,
	p_customer_id text default null,
	p_subscription_id text default null,
	p_current_period_end timestamptz default null,
	p_cancel_at_period_end boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_insertado text;
	v_ultimo_evento timestamptz;
begin
	insert into public.billing_events (id, type, payload, event_at)
	values (p_event_id, p_event_type, p_payload, coalesce(p_event_at, now()))
	on conflict (id) do nothing
	returning id into v_insertado;

	if v_insertado is null then
		return false;
	end if;

	if p_user_id is null then
		return true;
	end if;

	select last_event_at into v_ultimo_evento
	from public.subscriptions
	where user_id = p_user_id;

	if v_ultimo_evento is not null and coalesce(p_event_at, now()) < v_ultimo_evento then
		return true;
	end if;

	insert into public.subscriptions (
		user_id,
		plan,
		status,
		provider,
		provider_customer_id,
		provider_subscription_id,
		current_period_end,
		cancel_at_period_end,
		last_event_at
	) values (
		p_user_id,
		'pro',
		p_status,
		'polar',
		p_customer_id,
		p_subscription_id,
		p_current_period_end,
		coalesce(p_cancel_at_period_end, false),
		coalesce(p_event_at, now())
	)
	on conflict (user_id) do update set
		plan = 'pro',
		status = excluded.status,
		provider = 'polar',
		provider_customer_id = coalesce(
			excluded.provider_customer_id,
			public.subscriptions.provider_customer_id
		),
		provider_subscription_id = coalesce(
			excluded.provider_subscription_id,
			public.subscriptions.provider_subscription_id
		),
		current_period_end = excluded.current_period_end,
		cancel_at_period_end = excluded.cancel_at_period_end,
		last_event_at = excluded.last_event_at;

	return true;
end;
$$;

revoke all on function public.record_billing_event(text, text, timestamptz, jsonb) from public;
revoke all on function public.record_billing_event(text, text, timestamptz, jsonb) from anon;
revoke all on function public.record_billing_event(text, text, timestamptz, jsonb) from authenticated;
grant execute on function public.record_billing_event(text, text, timestamptz, jsonb) to service_role;

revoke all on function public.apply_polar_subscription_event(
	text, text, timestamptz, jsonb, uuid, text, text, text, timestamptz, boolean
) from public;
revoke all on function public.apply_polar_subscription_event(
	text, text, timestamptz, jsonb, uuid, text, text, text, timestamptz, boolean
) from anon;
revoke all on function public.apply_polar_subscription_event(
	text, text, timestamptz, jsonb, uuid, text, text, text, timestamptz, boolean
) from authenticated;
grant execute on function public.apply_polar_subscription_event(
	text, text, timestamptz, jsonb, uuid, text, text, text, timestamptz, boolean
) to service_role;

notify pgrst, 'reload schema';
