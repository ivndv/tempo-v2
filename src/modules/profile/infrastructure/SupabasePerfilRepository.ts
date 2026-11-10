import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";
import type { PerfilRepository } from "../domain/PerfilRepository";
import type { Perfil } from "../domain/perfil";

export class SupabasePerfilRepository implements PerfilRepository {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async obtener(): Promise<Perfil> {
		const { data, error } = await this.supabase
			.from("profiles")
			.select("display_name, timezone, locale")
			.maybeSingle();

		if (error) {
			throw new Error(error.message);
		}

		return {
			displayName: data?.display_name ?? null,
			timezone: data?.timezone ?? "America/Mexico_City",
			locale: data?.locale === "es" ? "es" : "en",
		};
	}

	async actualizar(cambios: Partial<Perfil>): Promise<void> {
		const fila: {
			display_name?: string | null;
			timezone?: string;
			locale?: "en" | "es";
		} = {};

		if (cambios.displayName !== undefined) {
			fila.display_name = cambios.displayName;
		}

		if (cambios.timezone !== undefined) {
			fila.timezone = cambios.timezone;
		}

		if (cambios.locale !== undefined) {
			fila.locale = cambios.locale;
		}

		if (Object.keys(fila).length === 0) {
			return;
		}

		const {
			data: { user },
			error: usuarioError,
		} = await this.supabase.auth.getUser();

		if (usuarioError || !user) {
			throw new Error(usuarioError?.message ?? "No hay una sesión activa");
		}

		const { error } = await this.supabase.from("profiles").update(fila).eq("id", user.id);

		if (error) {
			throw new Error(error.message);
		}
	}
}
