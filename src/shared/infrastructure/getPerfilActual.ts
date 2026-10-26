import "server-only";

import { cache } from "react";
import { ObtenerPerfil } from "@/modules/profile/application/ObtenerPerfil";
import type { Perfil } from "@/modules/profile/domain/perfil";
import { SupabasePerfilRepository } from "@/modules/profile/infrastructure/SupabasePerfilRepository";
import { getServerContainer } from "./container";

// Preferencias del usuario, compartidas entre layout y páginas del mismo request.
export const getPerfilActual = cache(async (): Promise<Perfil | null> => {
	const { auth, supabase } = await getServerContainer();
	const usuario = await auth.obtenerUsuario();

	if (!usuario) {
		return null;
	}

	try {
		return await new ObtenerPerfil(new SupabasePerfilRepository(supabase)).execute();
	} catch {
		return null;
	}
});
