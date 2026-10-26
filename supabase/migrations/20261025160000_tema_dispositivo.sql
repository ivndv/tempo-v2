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
