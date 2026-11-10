import { ESTADOS_SUSCRIPCION, type EstadoSuscripcion } from "./suscripcion";

export interface SuscripcionPolar {
	id: string;
	status: string;
	currentPeriodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	endedAt: string | null;
}

export interface EventoSuscripcionPolar {
	type: string;
	timestamp: string;
	externalCustomerId: string | null;
	customerId: string | null;
	subscription: SuscripcionPolar;
}

export interface CambioSuscripcionPolar {
	userId: string;
	status: EstadoSuscripcion;
	customerId: string | null;
	subscriptionId: string;
	currentPeriodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	eventAt: string;
}

const EVENTOS_SUSCRIPCION = new Set([
	"subscription.created",
	"subscription.updated",
	"subscription.active",
	"subscription.canceled",
	"subscription.cycled",
	"subscription.past_due",
	"subscription.paused",
	"subscription.resumed",
	"subscription.uncanceled",
	"subscription.revoked",
	"subscription.migrated",
]);

export function esEventoSuscripcion(tipo: string): boolean {
	return EVENTOS_SUSCRIPCION.has(tipo);
}

export function mapearEstadoPolar(status: string | null | undefined): EstadoSuscripcion {
	if (!status) {
		return "past_due";
	}

	return (ESTADOS_SUSCRIPCION as readonly string[]).includes(status)
		? (status as EstadoSuscripcion)
		: "past_due";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function mapearCambioSuscripcion(
	evento: EventoSuscripcionPolar,
	ahora = new Date(),
): CambioSuscripcionPolar | null {
	if (!evento.externalCustomerId || !UUID.test(evento.externalCustomerId)) {
		return null;
	}

	const terminada =
		evento.subscription.endedAt ??
		(evento.type === "subscription.revoked" ? ahora.toISOString() : null);

	return {
		userId: evento.externalCustomerId,
		status: terminada ? "canceled" : mapearEstadoPolar(evento.subscription.status),
		customerId: evento.customerId,
		subscriptionId: evento.subscription.id,
		currentPeriodEnd: terminada ?? evento.subscription.currentPeriodEnd,
		cancelAtPeriodEnd: terminada ? false : evento.subscription.cancelAtPeriodEnd,
		eventAt: evento.timestamp,
	};
}
