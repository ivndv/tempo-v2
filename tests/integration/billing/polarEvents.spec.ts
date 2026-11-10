import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	borrarUsuario,
	crearAdmin,
	crearUsuarioPrueba,
	integracionDisponible,
	type UsuarioPrueba,
} from "../helpers";

describe.skipIf(!integracionDisponible)("Eventos de Polar", () => {
	let usuario: UsuarioPrueba;

	beforeAll(async () => {
		usuario = await crearUsuarioPrueba("polar-events");
	});

	afterAll(async () => {
		await borrarUsuario(usuario);
	});

	it("aplica un evento de suscripción", async () => {
		const admin = crearAdmin();
		const { data, error } = await admin.rpc("apply_polar_subscription_event", {
			p_event_id: `evt-${crypto.randomUUID()}`,
			p_event_type: "subscription.active",
			p_event_at: "2026-11-09T12:00:00.000Z",
			p_payload: {},
			p_user_id: usuario.id,
			p_status: "active",
			p_customer_id: "polar-customer",
			p_subscription_id: `polar-${crypto.randomUUID()}`,
			p_current_period_end: "2026-12-09T12:00:00.000Z",
			p_cancel_at_period_end: false,
		});

		expect(error).toBeNull();
		expect(data).toBe(true);

		const { data: suscripcion } = await admin
			.from("subscriptions")
			.select("plan, status, provider_customer_id, current_period_end, cancel_at_period_end")
			.eq("user_id", usuario.id)
			.single();

		expect(suscripcion).toMatchObject({
			plan: "pro",
			status: "active",
			provider_customer_id: "polar-customer",
			current_period_end: "2026-12-09T12:00:00+00:00",
			cancel_at_period_end: false,
		});
	});

	it("es idempotente con el mismo event id", async () => {
		const admin = crearAdmin();
		const eventId = `evt-${crypto.randomUUID()}`;

		const primero = await admin.rpc("apply_polar_subscription_event", {
			p_event_id: eventId,
			p_event_type: "subscription.active",
			p_event_at: "2026-11-09T12:10:00.000Z",
			p_payload: {},
			p_user_id: usuario.id,
			p_status: "active",
			p_customer_id: "polar-customer",
			p_subscription_id: `polar-${crypto.randomUUID()}`,
			p_current_period_end: "2026-12-09T12:00:00.000Z",
			p_cancel_at_period_end: false,
		});

		const segundo = await admin.rpc("apply_polar_subscription_event", {
			p_event_id: eventId,
			p_event_type: "subscription.canceled",
			p_event_at: "2026-11-09T12:11:00.000Z",
			p_payload: {},
			p_user_id: usuario.id,
			p_status: "canceled",
			p_customer_id: "polar-customer",
			p_subscription_id: `polar-${crypto.randomUUID()}`,
			p_current_period_end: "2026-12-09T12:00:00.000Z",
			p_cancel_at_period_end: true,
		});

		expect(primero.data).toBe(true);
		expect(segundo.data).toBe(false);

		const { data: suscripcion } = await admin
			.from("subscriptions")
			.select("status, cancel_at_period_end")
			.eq("user_id", usuario.id)
			.single();

		expect(suscripcion).toMatchObject({
			status: "active",
			cancel_at_period_end: false,
		});
	});

	it("ignora un evento más viejo sin pisar el estado", async () => {
		const admin = crearAdmin();

		await admin.rpc("apply_polar_subscription_event", {
			p_event_id: `evt-${crypto.randomUUID()}`,
			p_event_type: "subscription.active",
			p_event_at: "2026-11-09T13:00:00.000Z",
			p_payload: {},
			p_user_id: usuario.id,
			p_status: "active",
			p_customer_id: "polar-customer",
			p_subscription_id: `polar-${crypto.randomUUID()}`,
			p_current_period_end: "2026-12-09T12:00:00.000Z",
			p_cancel_at_period_end: false,
		});

		const viejo = await admin.rpc("apply_polar_subscription_event", {
			p_event_id: `evt-${crypto.randomUUID()}`,
			p_event_type: "subscription.past_due",
			p_event_at: "2026-11-09T12:00:00.000Z",
			p_payload: {},
			p_user_id: usuario.id,
			p_status: "past_due",
			p_customer_id: "polar-customer",
			p_subscription_id: `polar-${crypto.randomUUID()}`,
			p_current_period_end: "2026-12-09T12:00:00.000Z",
			p_cancel_at_period_end: false,
		});

		expect(viejo.data).toBe(true);

		const { data: suscripcion } = await admin
			.from("subscriptions")
			.select("status")
			.eq("user_id", usuario.id)
			.single();

		expect(suscripcion?.status).toBe("active");
	});

	it("no permite que un usuario normal procese eventos", async () => {
		const { error } = await usuario.client.rpc("record_billing_event", {
			p_event_id: `evt-${crypto.randomUUID()}`,
			p_event_type: "order.paid",
			p_event_at: "2026-11-09T14:00:00.000Z",
			p_payload: {},
		});

		expect(error).not.toBeNull();
	});

	it("registra eventos que no aplican suscripción", async () => {
		const admin = crearAdmin();
		const eventId = `evt-${crypto.randomUUID()}`;

		const primero = await admin.rpc("record_billing_event", {
			p_event_id: eventId,
			p_event_type: "order.paid",
			p_event_at: "2026-11-09T14:00:00.000Z",
			p_payload: {},
		});

		const segundo = await admin.rpc("record_billing_event", {
			p_event_id: eventId,
			p_event_type: "order.paid",
			p_event_at: "2026-11-09T14:00:00.000Z",
			p_payload: {},
		});

		expect(primero.data).toBe(true);
		expect(segundo.data).toBe(false);
	});
});
