import "server-only";

import { cache } from "react";
import type { Perfil } from "@/modules/profile/domain/perfil";
import { getServerContainer } from "./container";

// Preferencias del usuario, compartidas entre layout y páginas del mismo request.
export const getPerfilActual = cache(async (): Promise<Perfil | null> => {
	const { auth, perfil } = await getServerContainer();
	const usuario = await auth.obtenerUsuario();

	if (!usuario) {
		return null;
	}

	try {
		return await perfil.obtener.execute();
	} catch {
		return null;
	}
});
