import type {
	DashboardLocalRepository,
	OpcionesDashboardLocal,
} from "../domain/DashboardLocalRepository";
import type { DashboardLocalResumen } from "../domain/dashboardLocal";

export class ObtenerDashboardLocal {
	constructor(private readonly dashboard: DashboardLocalRepository) {}

	execute(opciones: OpcionesDashboardLocal): Promise<DashboardLocalResumen> {
		return this.dashboard.obtener(opciones);
	}
}
