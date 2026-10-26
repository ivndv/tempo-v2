import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";
import type { DispositivoRepository } from "../domain/DispositivoRepository";
import type { Dispositivo } from "../domain/dispositivo";

export class SupabaseDispositivoRepository implements DispositivoRepository {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async listar(): Promise<Dispositivo[]> {
		const { data, error } = await this.supabase
			.from("devices")
			.select("id, name, platform, last_seen_at")
			.order("last_seen_at", { ascending: false });

		if (error) {
			throw new Error(error.message);
		}

		return (data ?? []).map((fila) => ({
			id: fila.id,
			nombre: fila.name,
			plataforma: fila.platform,
			ultimaConexion: fila.last_seen_at,
		}));
	}

	async renombrar(id: string, nombre: string): Promise<void> {
		const { error } = await this.supabase.from("devices").update({ name: nombre }).eq("id", id);

		if (error) {
			throw new Error(error.message);
		}
	}

	async eliminar(id: string): Promise<void> {
		const { error } = await this.supabase.from("devices").delete().eq("id", id);

		if (error) {
			throw new Error(error.message);
		}
	}
}
