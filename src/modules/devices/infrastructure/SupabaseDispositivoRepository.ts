import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";
import type {
	DatosRegistroDispositivo,
	DispositivoRepository,
	ResultadoRegistroDispositivo,
} from "../domain/DispositivoRepository";
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

	async registrar({
		id,
		nombre,
		plataforma,
		tema,
	}: DatosRegistroDispositivo): Promise<ResultadoRegistroDispositivo> {
		const { error } = await this.supabase.rpc("registrar_dispositivo", {
			p_id: id,
			p_name: nombre,
			p_platform: plataforma ?? undefined,
			p_theme: tema ?? undefined,
		});

		if (error) {
			throw new Error(error.message);
		}

		const { data, error: temaError } = await this.supabase
			.from("devices")
			.select("theme")
			.eq("id", id)
			.maybeSingle();

		if (temaError) {
			throw new Error(temaError.message);
		}

		return { tema: data?.theme ?? null };
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

	async actualizarTema(id: string, tema: string): Promise<void> {
		const { error } = await this.supabase.from("devices").update({ theme: tema }).eq("id", id);

		if (error) {
			throw new Error(error.message);
		}
	}
}
