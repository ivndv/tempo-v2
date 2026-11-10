"use client";

import { useEffect, useState } from "react";
import { getClientContainer } from "@/shared/infrastructure/clientContainer";
import type { Usuario } from "../domain/AuthGateway";

export function useAuthSession(): Usuario | null {
	const [usuario, setUsuario] = useState<Usuario | null>(null);

	useEffect(() => {
		return getClientContainer().auth.observarSesion(setUsuario);
	}, []);

	return usuario;
}
