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
