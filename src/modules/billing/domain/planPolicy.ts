export interface EstadoPlan {
	plan: string | null;
	status: string | null;
	currentPeriodEnd: string | null;
}

const ESTADOS_PRO = ["active", "trialing", "canceled"];

// Misma regla que public.get_dashboard: plan pro, estado vigente y periodo no vencido.
export function esPlanProActivo(estado: EstadoPlan, ahora = Date.now()): boolean {
	if (estado.plan !== "pro") {
		return false;
	}

	if (!estado.status || !ESTADOS_PRO.includes(estado.status)) {
		return false;
	}

	if (!estado.currentPeriodEnd) {
		return true;
	}

	const fin = new Date(estado.currentPeriodEnd).getTime();
	return Number.isFinite(fin) && fin > ahora;
}
