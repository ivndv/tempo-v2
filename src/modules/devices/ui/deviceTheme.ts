"use client";

import { obtenerDeviceId } from "@/shared/infrastructure/device";
import { createClient } from "@/shared/infrastructure/supabase/client";

// Guarda el tema del dispositivo actual; best-effort si no hay red.
export async function guardarTemaDispositivo(tema: string): Promise<void> {
	try {
		const supabase = createClient();
		await supabase.from("devices").update({ theme: tema }).eq("id", obtenerDeviceId());
	} catch {
		// El tema ya quedó en localStorage; se reintenta al cambiar de nuevo.
	}
}
