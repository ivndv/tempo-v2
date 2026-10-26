-- Un pomodoro puede existir sin tarea asociada.
alter table public.pomodoros
	alter column tarea_id drop not null;
