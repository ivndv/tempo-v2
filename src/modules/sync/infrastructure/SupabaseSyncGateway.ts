import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";
import type { CursorSync } from "../domain/cursor";
import type {
	BreakSyncPayload,
	PomodoroSyncPayload,
	ResultadoSubidaTarea,
	TareaSyncPayload,
} from "../domain/outbox";
import type { BreakRemoto, PomodoroRemoto } from "../domain/registrosRemotos";
import type { SyncGateway } from "../domain/SyncGateway";
import type { TareaRemota } from "../domain/tareaRemota";

const PAGINA = 200;

export class SupabaseSyncGateway implements SyncGateway {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async tieneSesion(): Promise<boolean> {
		const {
			data: { user },
		} = await this.supabase.auth.getUser();

		return Boolean(user);
	}

	async descargarTareas(desde: CursorSync | null): Promise<TareaRemota[]> {
		let consulta = this.supabase
			.from("tareas")
			.select(
				"id, nombre, estado, created_at, updated_at, completed_at, deleted_at, bloque_id, creada_en_focus_id, completada_en_focus_id, eliminada_en_focus_id, client_updated_at, last_device_id",
			)
			.order("updated_at", { ascending: true })
			.order("id", { ascending: true })
			.limit(PAGINA);

		if (desde) {
			consulta = consulta.gte("updated_at", desde.updatedAt);
		}

		const { data, error } = await consulta;

		if (error) {
			throw new Error(error.message);
		}

		return (data ?? [])
			.filter((fila) => despuesDe(fila.updated_at, fila.id, desde))
			.map((fila) => ({
				id: fila.id,
				nombre: fila.nombre,
				estado: fila.estado,
				createdAt: fila.created_at,
				updatedAt: fila.updated_at,
				completedAt: fila.completed_at,
				deletedAt: fila.deleted_at,
				bloqueId: fila.bloque_id,
				creadaEnFocusId: fila.creada_en_focus_id,
				completadaEnFocusId: fila.completada_en_focus_id,
				eliminadaEnFocusId: fila.eliminada_en_focus_id,
				clientUpdatedAt: fila.client_updated_at,
				deviceId: fila.last_device_id,
			}));
	}

	async descargarPomodoros(desde: CursorSync | null): Promise<PomodoroRemoto[]> {
		let consulta = this.supabase
			.from("pomodoros")
			.select(
				"id, bloque_id, tarea_id, status, minutes_planned, minutes_actual, local_date, created_at, updated_at, started_at, ended_at, cycle_position, device_id",
			)
			.order("updated_at", { ascending: true })
			.order("id", { ascending: true })
			.limit(PAGINA);

		if (desde) {
			consulta = consulta.gte("updated_at", desde.updatedAt);
		}

		const { data, error } = await consulta;

		if (error) {
			throw new Error(error.message);
		}

		return (data ?? [])
			.filter((fila) => despuesDe(fila.updated_at, fila.id, desde))
			.map((fila) => ({
				id: fila.id,
				bloqueId: fila.bloque_id,
				tareaId: fila.tarea_id,
				status: fila.status,
				minutesPlanned: fila.minutes_planned,
				minutesActual: fila.minutes_actual,
				localDate: fila.local_date,
				createdAt: fila.created_at,
				updatedAt: fila.updated_at,
				startedAt: fila.started_at,
				endedAt: fila.ended_at,
				cyclePosition: fila.cycle_position,
				deviceId: fila.device_id,
			}));
	}

	async descargarBreaks(desde: CursorSync | null): Promise<BreakRemoto[]> {
		let consulta = this.supabase
			.from("breaks")
			.select(
				"id, bloque_id, tipo, status, minutes_planned, minutes_actual, local_date, created_at, updated_at, started_at, ended_at, device_id",
			)
			.order("updated_at", { ascending: true })
			.order("id", { ascending: true })
			.limit(PAGINA);

		if (desde) {
			consulta = consulta.gte("updated_at", desde.updatedAt);
		}

		const { data, error } = await consulta;

		if (error) {
			throw new Error(error.message);
		}

		return (data ?? [])
			.filter((fila) => despuesDe(fila.updated_at, fila.id, desde))
			.map((fila) => ({
				id: fila.id,
				bloqueId: fila.bloque_id,
				tipo: fila.tipo,
				status: fila.status,
				minutesPlanned: fila.minutes_planned,
				minutesActual: fila.minutes_actual,
				localDate: fila.local_date,
				createdAt: fila.created_at,
				updatedAt: fila.updated_at,
				startedAt: fila.started_at,
				endedAt: fila.ended_at,
				deviceId: fila.device_id,
			}));
	}

	async subirTarea(payload: TareaSyncPayload): Promise<ResultadoSubidaTarea> {
		const { data, error } = await this.supabase.rpc("upsert_tarea", {
			payload: {
				id: payload.id,
				nombre: payload.nombre,
				estado: payload.estado,
				createdAt: payload.createdAt,
				completedAt: payload.completedAt,
				deletedAt: payload.deletedAt,
				bloqueId: payload.bloqueId,
				creadaEnFocusId: payload.creadaEnFocusId,
				completadaEnFocusId: payload.completadaEnFocusId,
				eliminadaEnFocusId: payload.eliminadaEnFocusId,
				clientUpdatedAt: payload.clientUpdatedAt,
				deviceId: payload.deviceId,
			},
		});

		if (error) {
			throw new Error(error.message);
		}

		return (data as ResultadoSubidaTarea | null) ?? "applied";
	}

	async eliminarTarea(id: string): Promise<void> {
		const { error } = await this.supabase.from("tareas").delete().eq("id", id);

		if (error) {
			throw new Error(error.message);
		}
	}

	async subirPomodoro(payload: PomodoroSyncPayload): Promise<void> {
		const { error } = await this.supabase.from("pomodoros").upsert(
			{
				id: payload.id,
				bloque_id: payload.bloqueId,
				tarea_id: payload.tareaId,
				status: payload.status,
				minutes_planned: payload.minutesPlanned,
				minutes_actual: payload.minutesActual,
				local_date: payload.localDate,
				created_at: payload.createdAt,
				started_at: payload.startedAt,
				ended_at: payload.endedAt,
				cycle_position: payload.cyclePosition,
				device_id: payload.deviceId,
			},
			{ onConflict: "id" },
		);

		if (error) {
			throw new Error(error.message);
		}
	}

	async subirBreak(payload: BreakSyncPayload): Promise<void> {
		const { error } = await this.supabase.from("breaks").upsert(
			{
				id: payload.id,
				bloque_id: payload.bloqueId,
				tipo: payload.tipo,
				status: payload.status,
				minutes_planned: payload.minutesPlanned,
				minutes_actual: payload.minutesActual,
				local_date: payload.localDate,
				created_at: payload.createdAt,
				started_at: payload.startedAt,
				ended_at: payload.endedAt,
				device_id: payload.deviceId,
			},
			{ onConflict: "id" },
		);

		if (error) {
			throw new Error(error.message);
		}
	}
}

// Cursor compuesto: evita saltarse filas con el mismo updated_at.
export function despuesDe(updatedAt: string, id: string, cursor: CursorSync | null): boolean {
	if (!cursor) {
		return true;
	}

	return updatedAt > cursor.updatedAt || (updatedAt === cursor.updatedAt && id > cursor.id);
}
