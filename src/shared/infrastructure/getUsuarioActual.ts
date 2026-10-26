import "server-only";

import { cache } from "react";
import type { Usuario } from "@/modules/auth/domain/AuthGateway";
import { getServerContainer } from "./container";

// Usuario de la sesión actual, compartido entre layout y páginas del mismo request.
export const getUsuarioActual = cache(async (): Promise<Usuario | null> => {
	const { auth } = await getServerContainer();
	return auth.obtenerUsuario();
});
