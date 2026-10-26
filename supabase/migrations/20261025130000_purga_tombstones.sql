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
