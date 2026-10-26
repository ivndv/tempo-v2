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
