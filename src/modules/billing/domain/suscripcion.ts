import type { Plan } from "./plan";

export const ESTADOS_SUSCRIPCION = [
	"active",
	"trialing",
	"past_due",
	"canceled",
	"paused",
	"incomplete",
	"incomplete_expired",
	"unpaid",
] as const;

export type EstadoSuscripcion = (typeof ESTADOS_SUSCRIPCION)[number];

export const SUSCRIPCION_VACIA: SuscripcionResumen = {
	plan: "free",
	status: null,
	currentPeriodEnd: null,
	cancelAtPeriodEnd: false,
	hasSubscription: false,
	hasCustomer: false,
};

export interface SuscripcionResumen {
	plan: Plan;
	status: EstadoSuscripcion | null;
	currentPeriodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	hasSubscription: boolean;
	hasCustomer: boolean;
}

export interface SuscripcionRepository {
	obtener(): Promise<SuscripcionResumen>;
}
