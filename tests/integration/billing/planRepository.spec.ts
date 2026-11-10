import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupabaseSuscripcionRepository } from "@/modules/billing/infrastructure/SupabaseSuscripcionRepository";
import {
	borrarUsuario,
	crearSuscripcionPro,
	crearUsuarioPrueba,
	integracionDisponible,
	type UsuarioPrueba,
} from "../helpers";

describe.skipIf(!integracionDisponible)("SupabaseSuscripcionRepository", () => {
	let a: UsuarioPrueba;
	let b: UsuarioPrueba;

	beforeAll(async () => {
		a = await crearUsuarioPrueba("plan-a");
		b = await crearUsuarioPrueba("plan-b");
	});

	afterAll(async () => {
		await borrarUsuario(a);
		await borrarUsuario(b);
	});

	it("devuelve Free sin suscripción", async () => {
		const repo = new SupabaseSuscripcionRepository(a.client);

		await expect(repo.obtener()).resolves.toMatchObject({
			plan: "free",
			hasSubscription: false,
			hasCustomer: false,
		});
	});

	it("devuelve Pro con suscripción activa y periodo vigente", async () => {
		await crearSuscripcionPro(a.id);
		const repo = new SupabaseSuscripcionRepository(a.client);

		await expect(repo.obtener()).resolves.toMatchObject({
			plan: "pro",
			status: "active",
			hasSubscription: true,
			hasCustomer: true,
		});
	});

	it("mantiene Pro si está cancelado pero el periodo sigue vigente", async () => {
		await crearSuscripcionPro(a.id, { status: "canceled" });
		const repo = new SupabaseSuscripcionRepository(a.client);

		await expect(repo.obtener()).resolves.toMatchObject({
			plan: "pro",
			status: "canceled",
		});
	});

	it("devuelve Free si el periodo ya venció", async () => {
		await crearSuscripcionPro(a.id, {
			status: "active",
			currentPeriodEnd: "2020-01-01T00:00:00.000Z",
		});
		const repo = new SupabaseSuscripcionRepository(a.client);

		await expect(repo.obtener()).resolves.toMatchObject({
			plan: "free",
			status: "active",
		});
	});

	it("devuelve Free con un estado no permitido", async () => {
		await crearSuscripcionPro(a.id, { status: "past_due" });
		const repo = new SupabaseSuscripcionRepository(a.client);

		await expect(repo.obtener()).resolves.toMatchObject({
			plan: "free",
			status: "past_due",
		});
	});

	it("no mezcla el plan de otro usuario", async () => {
		await crearSuscripcionPro(a.id);
		const repoA = new SupabaseSuscripcionRepository(a.client);
		const repoB = new SupabaseSuscripcionRepository(b.client);

		await expect(repoA.obtener()).resolves.toMatchObject({ plan: "pro" });
		await expect(repoB.obtener()).resolves.toMatchObject({ plan: "free" });
	});
});
