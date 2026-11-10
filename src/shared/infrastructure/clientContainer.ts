"use client";

import { ObtenerDashboardLocal } from "@/modules/analytics/application/ObtenerDashboardLocal";
import { ObtenerEstadisticasHoy } from "@/modules/analytics/application/ObtenerEstadisticasHoy";
import { ObtenerUltimosDias } from "@/modules/analytics/application/ObtenerUltimosDias";
import { DexieDashboardRepository } from "@/modules/analytics/infrastructure/DexieDashboardRepository";
import { DexieEstadisticasRepository } from "@/modules/analytics/infrastructure/DexieEstadisticasRepository";
import { SupabaseAuthAdapter } from "@/modules/auth/infrastructure/SupabaseAuthAdapter";
import { ActualizarTemaDispositivo } from "@/modules/devices/application/ActualizarTemaDispositivo";
import { EliminarDispositivo } from "@/modules/devices/application/EliminarDispositivo";
import { ListarDispositivos } from "@/modules/devices/application/ListarDispositivos";
import { RegistrarDispositivo } from "@/modules/devices/application/RegistrarDispositivo";
import { RenombrarDispositivo } from "@/modules/devices/application/RenombrarDispositivo";
import { SupabaseDispositivoRepository } from "@/modules/devices/infrastructure/SupabaseDispositivoRepository";
import { PomodoroTimerService } from "@/modules/pomodoros/application/PomodoroTimerService";
import { DexieTimerRepository } from "@/modules/pomodoros/infrastructure/DexieTimerRepository";
import { ActualizarPerfil } from "@/modules/profile/application/ActualizarPerfil";
import { ObtenerPerfil } from "@/modules/profile/application/ObtenerPerfil";
import { SupabasePerfilRepository } from "@/modules/profile/infrastructure/SupabasePerfilRepository";
import { SincronizarPendientes } from "@/modules/sync/application/SincronizarPendientes";
import { DexieOutboxRepository } from "@/modules/sync/infrastructure/DexieOutboxRepository";
import { DexieSyncLocal } from "@/modules/sync/infrastructure/DexieSyncLocal";
import { SupabaseSyncGateway } from "@/modules/sync/infrastructure/SupabaseSyncGateway";
import { CambiarEstadoTarea } from "@/modules/tareas/application/CambiarEstadoTarea";
import { CrearTarea } from "@/modules/tareas/application/CrearTarea";
import { EliminarTarea } from "@/modules/tareas/application/EliminarTarea";
import { ListarTareas } from "@/modules/tareas/application/ListarTareas";
import { DexieTareaRepository } from "@/modules/tareas/infrastructure/DexieTareaRepository";
import { obtenerDeviceId } from "./device";
import { conBloqueo } from "./locks";
import { createClient } from "./supabase/client";

function crearContenedor() {
	const supabase = createClient();
	const perfiles = new SupabasePerfilRepository(supabase);
	const dispositivos = new SupabaseDispositivoRepository(supabase);
	const tareas = new DexieTareaRepository();
	const timer = new DexieTimerRepository();
	const dashboard = new DexieDashboardRepository();
	const estadisticas = new DexieEstadisticasRepository();
	const outbox = new DexieOutboxRepository();
	const syncLocal = new DexieSyncLocal();
	const syncGateway = new SupabaseSyncGateway(supabase);
	const sincronizar = new SincronizarPendientes(outbox, syncGateway, syncLocal);

	return {
		supabase,
		auth: new SupabaseAuthAdapter(supabase),
		perfil: {
			obtener: new ObtenerPerfil(perfiles),
			actualizar: new ActualizarPerfil(perfiles),
		},
		dispositivos: {
			listar: new ListarDispositivos(dispositivos),
			registrar: new RegistrarDispositivo(dispositivos),
			renombrar: new RenombrarDispositivo(dispositivos),
			eliminar: new EliminarDispositivo(dispositivos),
			actualizarTema: new ActualizarTemaDispositivo(dispositivos),
		},
		tareas: {
			listar: new ListarTareas(tareas),
			crear: new CrearTarea(tareas),
			cambiarEstado: new CambiarEstadoTarea(tareas),
			eliminar: new EliminarTarea(tareas),
		},
		analytics: {
			dashboardLocal: new ObtenerDashboardLocal(dashboard),
			hoy: new ObtenerEstadisticasHoy(estadisticas),
			ultimosDias: new ObtenerUltimosDias(estadisticas),
		},
		timer: {
			crear: () => new PomodoroTimerService(timer, undefined, obtenerDeviceId()),
		},
		sync: {
			ejecutar: () => conBloqueo(() => sincronizar.execute()),
		},
	};
}

let instancia: ReturnType<typeof crearContenedor> | null = null;

// Composition root del navegador: único lugar que conecta adaptadores concretos
export function getClientContainer(): ReturnType<typeof crearContenedor> {
	if (typeof window === "undefined") {
		return crearContenedor();
	}

	instancia ??= crearContenedor();
	return instancia;
}
