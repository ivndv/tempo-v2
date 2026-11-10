"use client";

import { getClientContainer } from "@/shared/infrastructure/clientContainer";
import { obtenerDeviceId } from "@/shared/infrastructure/device";

// Guarda el tema del dispositivo actual; best-effort si no hay red
export async function guardarTemaDispositivo(tema: string): Promise<void> {
	try {
		await getClientContainer().dispositivos.actualizarTema.execute(obtenerDeviceId(), tema);
	} catch {
		// El tema ya quedó en localStorage; se reintenta al cambiar de nuevo
	}
}
