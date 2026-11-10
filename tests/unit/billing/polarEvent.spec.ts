import { describe, expect, it } from "vitest";
import {
	type EventoSuscripcionPolar,
	mapearCambioSuscripcion,
	mapearEstadoPolar,
} from "@/modules/billing/domain/polarEvent";

const USUARIO = "97a166db-c5e4-437a-b2b6-0457b986d808";

function evento(overrides: Partial<EventoSuscripcionPolar> = {}): EventoSuscripcionPolar {
	return {
		type: "subscription.updated",
		timestamp: "2026-11-09T12:00:00.000Z",
		externalCustomerId: USUARIO,
		customerId: "polar-customer",
		subscription: {
			id: "polar-subscription",
			status: "active",
			currentPeriodEnd: "2026-12-09T12:00:00.000Z",
			cancelAtPeriodEnd: false,
			endedAt: null,
		},
		...overrides,
	};
}

describe("mapearEstadoPolar", () => {
	it("mapea los estados válidos", () => {
		expect(mapearEstadoPolar("active")).toBe("active");
		expect(mapearEstadoPolar("trialing")).toBe("trialing");
		expect(mapearEstadoPolar("past_due")).toBe("past_due");
		expect(mapearEstadoPolar("canceled")).toBe("canceled");
		expect(mapearEstadoPolar("paused")).toBe("paused");
		expect(mapearEstadoPolar("incomplete")).toBe("incomplete");
		expect(mapearEstadoPolar("incomplete_expired")).toBe("incomplete_expired");
		expect(mapearEstadoPolar("unpaid")).toBe("unpaid");
	});

	it("trata estados desconocidos o vacíos como past_due", () => {
		expect(mapearEstadoPolar(null)).toBe("past_due");
		expect(mapearEstadoPolar("desconocido")).toBe("past_due");
	});
});

describe("mapearCambioSuscripcion", () => {
	it("mapea un evento activo", () => {
		const cambio = mapearCambioSuscripcion(evento());

		expect(cambio).toMatchObject({
			userId: USUARIO,
			status: "active",
			customerId: "polar-customer",
			subscriptionId: "polar-subscription",
			currentPeriodEnd: "2026-12-09T12:00:00.000Z",
			cancelAtPeriodEnd: false,
		});
	});

	it("mantiene la cancelación programada", () => {
		const cambio = mapearCambioSuscripcion(
			evento({
				type: "subscription.canceled",
				subscription: {
					...evento().subscription,
					cancelAtPeriodEnd: true,
				},
			}),
		);

		expect(cambio).toMatchObject({
			status: "active",
			cancelAtPeriodEnd: true,
		});
	});

	it("corta el acceso en un evento revoked", () => {
		const cambio = mapearCambioSuscripcion(
			evento({
				type: "subscription.revoked",
				subscription: {
					...evento().subscription,
					endedAt: "2026-11-09T12:01:00.000Z",
				},
			}),
		);

		expect(cambio).toMatchObject({
			status: "canceled",
			currentPeriodEnd: "2026-11-09T12:01:00.000Z",
			cancelAtPeriodEnd: false,
		});
	});

	it("usa ahora si revoked no trae endedAt", () => {
		const ahora = new Date("2026-11-09T12:30:00.000Z");
		const cambio = mapearCambioSuscripcion(
			evento({
				type: "subscription.revoked",
				subscription: {
					...evento().subscription,
					endedAt: null,
				},
			}),
			ahora,
		);

		expect(cambio).toMatchObject({
			status: "canceled",
			currentPeriodEnd: ahora.toISOString(),
		});
	});

	it("corta el acceso si endedAt está presente aunque el status sea activo", () => {
		const cambio = mapearCambioSuscripcion(
			evento({
				subscription: {
					...evento().subscription,
					endedAt: "2026-11-09T12:05:00.000Z",
				},
			}),
		);

		expect(cambio).toMatchObject({
			status: "canceled",
			currentPeriodEnd: "2026-11-09T12:05:00.000Z",
		});
	});

	it("ignora eventos sin external_customer_id válido", () => {
		expect(mapearCambioSuscripcion(evento({ externalCustomerId: null }))).toBeNull();
		expect(mapearCambioSuscripcion(evento({ externalCustomerId: "no-es-uuid" }))).toBeNull();
	});
});
