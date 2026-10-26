import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";
import type { TareaRepository } from "../domain/TareaRepository";
import { type EstadoTarea, esEstadoTarea, type Tarea } from "../domain/tarea";

type TareaRow = Database["public"]["Tables"]["tareas"]["Row"];

function mapTarea(row: TareaRow): Tarea {
	return {
		id: row.id,
		userId: row.user_id,
		bloqueId: row.bloque_id ?? null,
		nombre: row.nombre,
		estado: esEstadoTarea(row.estado) ? row.estado : "pending",
		createdAt: row.created_at,
		completedAt: row.completed_at,
		deletedAt: row.deleted_at,
	};
}

export class SupabaseTareaRepository implements TareaRepository {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async listar(): Promise<Tarea[]> {
		const { data, error } = await this.supabase
			.from("tareas")
			.select("*")
			.is("deleted_at", null)
			.order("created_at", { ascending: false });

		if (error) {
			throw new Error(error.message);
		}

		return (data ?? []).map(mapTarea);
	}

	async crear(nombre: string): Promise<Tarea> {
		const { data, error } = await this.supabase
			.from("tareas")
			.insert({ nombre })
			.select("*")
			.single();

		if (error) {
			throw new Error(error.message);
		}

		return mapTarea(data);
	}

	async cambiarEstado(id: string, estado: EstadoTarea): Promise<void> {
		const { error } = await this.supabase
			.from("tareas")
			.update({
				estado,
				completed_at: estado === "done" ? new Date().toISOString() : null,
			})
			.eq("id", id);

		if (error) {
			throw new Error(error.message);
		}
	}

	async eliminar(id: string): Promise<void> {
		const { error } = await this.supabase
			.from("tareas")
			.update({ deleted_at: new Date().toISOString() })
			.eq("id", id);

		if (error) {
			throw new Error(error.message);
		}
	}
}
