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
}
