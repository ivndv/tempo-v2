"use client";

import { createClient } from "@/shared/infrastructure/supabase/client";
import { SincronizarPendientes } from "../application/SincronizarPendientes";
import { DexieOutboxRepository } from "./DexieOutboxRepository";
import { DexieSyncLocal } from "./DexieSyncLocal";
import { SupabaseSyncGateway } from "./SupabaseSyncGateway";

export function crearSyncService() {
	const supabase = createClient();
	const servicio = new SincronizarPendientes(
		new DexieOutboxRepository(),
		new SupabaseSyncGateway(supabase),
		new DexieSyncLocal(),
	);

	return {
		execute: () => conBloqueo(() => servicio.execute()),
	};
}

// Serializa la sincronización entre pestañas del mismo navegador.
async function conBloqueo<T>(tarea: () => Promise<T>): Promise<T> {
	if (typeof navigator === "undefined" || !navigator.locks) {
		return tarea();
	}

	return navigator.locks.request("tempo-sync", () => tarea());
}
