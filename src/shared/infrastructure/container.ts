import "server-only";

import { cache } from "react";
import { ObtenerDashboard } from "@/modules/analytics/application/ObtenerDashboard";
import { SupabaseDashboardRepository } from "@/modules/analytics/infrastructure/SupabaseDashboardRepository";
import { SupabaseAuthAdapter } from "@/modules/auth/infrastructure/SupabaseAuthAdapter";
import { ObtenerPlan } from "@/modules/billing/application/ObtenerPlan";
import { ObtenerSuscripcion } from "@/modules/billing/application/ObtenerSuscripcion";
import { SupabaseSuscripcionRepository } from "@/modules/billing/infrastructure/SupabaseSuscripcionRepository";
import { ListarDispositivos } from "@/modules/devices/application/ListarDispositivos";
import { SupabaseDispositivoRepository } from "@/modules/devices/infrastructure/SupabaseDispositivoRepository";
import { ObtenerPerfil } from "@/modules/profile/application/ObtenerPerfil";
import { SupabasePerfilRepository } from "@/modules/profile/infrastructure/SupabasePerfilRepository";
import { CambiarEstadoTarea } from "@/modules/tareas/application/CambiarEstadoTarea";
import { CrearTarea } from "@/modules/tareas/application/CrearTarea";
import { EliminarTarea } from "@/modules/tareas/application/EliminarTarea";
import { ListarTareas } from "@/modules/tareas/application/ListarTareas";
import { SupabaseTareaRepository } from "@/modules/tareas/infrastructure/SupabaseTareaRepository";
import { createClient } from "./supabase/server";

// Composition root: conecta adaptadores concretos con casos de uso.
// cache() comparte el contenedor entre layout y páginas del mismo request.
export const getServerContainer = cache(async () => {
	const supabase = await createClient();
	const tareasRepository = new SupabaseTareaRepository(supabase);
	const dashboardRepository = new SupabaseDashboardRepository(supabase);
	const suscripcionRepository = new SupabaseSuscripcionRepository(supabase);

	return {
		supabase,
		auth: new SupabaseAuthAdapter(supabase),
		perfil: {
			obtener: new ObtenerPerfil(new SupabasePerfilRepository(supabase)),
		},
		dispositivos: {
			listar: new ListarDispositivos(new SupabaseDispositivoRepository(supabase)),
		},
		billing: {
			plan: new ObtenerPlan(suscripcionRepository),
			suscripcion: new ObtenerSuscripcion(suscripcionRepository),
		},
		analytics: {
			dashboard: new ObtenerDashboard(dashboardRepository),
		},
		tareas: {
			listar: new ListarTareas(tareasRepository),
			crear: new CrearTarea(tareasRepository),
			cambiarEstado: new CambiarEstadoTarea(tareasRepository),
			eliminar: new EliminarTarea(tareasRepository),
		},
	};
});
