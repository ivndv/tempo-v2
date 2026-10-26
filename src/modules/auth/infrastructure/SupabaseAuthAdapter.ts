import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";
import type { AuthGateway, Usuario } from "../domain/AuthGateway";

export class SupabaseAuthAdapter implements AuthGateway {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async obtenerUsuario(): Promise<Usuario | null> {
		// Con ES256 getClaims verifica la firma localmente (sin red).
		// Si el proyecto vuelve a HS256, cae solo a getUser.
		const { data, error } = await this.supabase.auth.getClaims();

		if (error || !data?.claims) {
			return null;
		}

		const sub = data.claims.sub;

		if (typeof sub !== "string") {
			return null;
		}

		let email = typeof data.claims.email === "string" ? data.claims.email : "";

		// Algunos proveedores no incluyen email en el token: se pide el usuario.
		if (!email) {
			const { data: completo } = await this.supabase.auth.getUser();
			email = completo.user?.email ?? "";
		}

		return { id: sub, email };
	}

	async cerrarSesion(): Promise<void> {
		await this.supabase.auth.signOut();
	}
}
