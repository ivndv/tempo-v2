-- Timestamps y ciclo para sincronizar pomodoros/breaks desde el cliente.
alter table public.pomodoros
	add column if not exists started_at timestamptz,
	add column if not exists ended_at timestamptz,
	add column if not exists cycle_position integer;

alter table public.breaks
	add column if not exists started_at timestamptz,
	add column if not exists ended_at timestamptz;
