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
