import type { DashboardRepository } from "../domain/DashboardRepository";
import type { OpcionesDashboard } from "../domain/dashboard";

export class ObtenerDashboard {
	constructor(private readonly dashboard: DashboardRepository) {}

	execute(opciones?: OpcionesDashboard) {
		return this.dashboard.obtener(opciones);
	}
}
