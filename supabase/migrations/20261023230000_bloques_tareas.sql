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
