import type { webhooks } from "@polar-sh/sdk/2026-10";
import { describe, expect, it } from "vitest";
import { mapearPayloadPolar } from "@/modules/billing/infrastructure/polarWebhook";

const USUARIO = "97a166db-c5e4-437a-b2b6-0457b986d808";

function payloadSuscripcion(
	overrides: Record<string, unknown> = {},
	dataOverrides: Record<string, unknown> = {},
): webhooks.WebhookPayload {
	return {
		type: "subscription.active",
		timestamp: "2026-11-09T12:00:00.000Z",
		api_version: "2026-10",
		...overrides,
		data: {
			id: "polar-subscription",
			status: "active",
			current_period_end: "2026-12-09T12:00:00.000Z",
			cancel_at_period_end: false,
			ended_at: null,
			customer_id: "polar-customer",
			customer: { external_id: USUARIO },
			...dataOverrides,
		},
	} as unknown as webhooks.WebhookPayload;
}

describe("mapearPayloadPolar", () => {
	it("extrae el usuario desde customer.external_id", () => {
		const { evento, cambio } = mapearPayloadPolar(payloadSuscripcion(), "evt-1");

		expect(evento).toMatchObject({
			id: "evt-1",
			type: "subscription.active",
			timestamp: "2026-11-09T12:00:00.000Z",
		});
		expect(cambio).toMatchObject({
			userId: USUARIO,
			status: "active",
			customerId: "polar-customer",
			subscriptionId: "polar-subscription",
			currentPeriodEnd: "2026-12-09T12:00:00.000Z",
			cancelAtPeriodEnd: false,
		});
	});

	it("no aplica suscripción en eventos que no son de suscripción", () => {
		const payload = {
			type: "order.paid",
			timestamp: "2026-11-09T12:00:00.000Z",
			api_version: "2026-10",
			data: { id: "order-1" },
		} as unknown as webhooks.WebhookPayload;

		const { evento, cambio } = mapearPayloadPolar(payload, "evt-2");

		expect(evento.type).toBe("order.paid");
		expect(cambio).toBeNull();
	});

	it("corta el acceso en revoked", () => {
		const { cambio } = mapearPayloadPolar(
			payloadSuscripcion(
				{ type: "subscription.revoked" },
				{ ended_at: "2026-11-09T12:01:00.000Z" },
			),
			"evt-3",
		);

		expect(cambio).toMatchObject({
			status: "canceled",
			currentPeriodEnd: "2026-11-09T12:01:00.000Z",
			cancelAtPeriodEnd: false,
		});
	});
});
