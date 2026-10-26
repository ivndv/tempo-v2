import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";
import type { AuthGateway, Usuario } from "../domain/AuthGateway";

export class SupabaseAuthAdapter implements AuthGateway {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async obtenerUsuario(): Promise<Usuario | null> {
		// Se mantiene getUser hasta migrar a claves asimétricas (ES256): con
		// getClaims el email depende de los claims del token. Ver docs/perf.
		const {
			data: { user },
			error,
		} = await this.supabase.auth.getUser();

		if (error || !user) {
			return null;
		}

		return {
			id: user.id,
			email: user.email ?? "",
		};
	}

	async cerrarSesion(): Promise<void> {
		await this.supabase.auth.signOut();
	}
}
