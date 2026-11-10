import type { webhooks } from "@polar-sh/sdk/2026-10";
import type { EventoPolar } from "../domain/BillingEventRepository";
import {
	type CambioSuscripcionPolar,
	esEventoSuscripcion,
	mapearCambioSuscripcion,
} from "../domain/polarEvent";

interface DatosSuscripcion {
	id: string;
	status: string;
	current_period_end: string;
	cancel_at_period_end: boolean;
	ended_at: string | null;
	customer_id: string;
	customer?: { external_id?: string | null } | null;
}

interface PayloadConSuscripcion {
	type: string;
	timestamp: string;
	external_customer_id?: string | null;
	customer_id?: string | null;
	data: DatosSuscripcion;
}

function crearCambio(payload: PayloadConSuscripcion): CambioSuscripcionPolar | null {
	return mapearCambioSuscripcion({
		type: payload.type,
		timestamp: payload.timestamp,
		externalCustomerId: payload.data.customer?.external_id ?? payload.external_customer_id ?? null,
		customerId: payload.customer_id ?? payload.data.customer_id,
		subscription: {
			id: payload.data.id,
			status: payload.data.status,
			currentPeriodEnd: payload.data.current_period_end,
			cancelAtPeriodEnd: payload.data.cancel_at_period_end,
			endedAt: payload.data.ended_at,
		},
	});
}

export function mapearPayloadPolar(
	payload: webhooks.WebhookPayload,
	eventId: string,
): { evento: EventoPolar; cambio: CambioSuscripcionPolar | null } {
	const evento: EventoPolar = {
		id: eventId,
		type: payload.type,
		timestamp: payload.timestamp,
		payload,
	};

	if (!esEventoSuscripcion(payload.type)) {
		return { evento, cambio: null };
	}

	let cambio: CambioSuscripcionPolar | null = null;

	switch (payload.type) {
		case "subscription.created":
		case "subscription.updated":
		case "subscription.active":
		case "subscription.canceled":
		case "subscription.cycled":
		case "subscription.past_due":
		case "subscription.paused":
		case "subscription.resumed":
		case "subscription.uncanceled":
		case "subscription.revoked":
		case "subscription.migrated":
			cambio = crearCambio(payload);
			break;
		default:
			break;
	}

	return { evento, cambio };
}
