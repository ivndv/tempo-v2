import type { DashboardResumen, OpcionesDashboard } from "./dashboard";

export interface DashboardRepository {
	obtener(opciones?: OpcionesDashboard): Promise<DashboardResumen>;
}
