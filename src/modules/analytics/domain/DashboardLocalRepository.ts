import type { DashboardLocalResumen } from "./dashboardLocal";

export interface OpcionesDashboardLocal {
	timezone: string;
	deviceId?: string | null;
	dias?: number;
}

export interface DashboardLocalRepository {
	obtener(opciones: OpcionesDashboardLocal): Promise<DashboardLocalResumen>;
}
