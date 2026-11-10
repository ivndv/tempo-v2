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
