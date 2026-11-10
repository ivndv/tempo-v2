import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	borrarUsuario,
	crearAdmin,
	crearSuscripcionPro,
	crearUsuarioPrueba,
	integracionDisponible,
	type UsuarioPrueba,
} from "../helpers";

describe.skipIf(!integracionDisponible)("RLS y aislamiento entre usuarios", () => {
	let a: UsuarioPrueba;
	let b: UsuarioPrueba;

	beforeAll(async () => {
		a = await crearUsuarioPrueba("rls-a");
		b = await crearUsuarioPrueba("rls-b");
	});

	afterAll(async () => {
		await borrarUsuario(a);
		await borrarUsuario(b);
	});

	it("separa las tareas y no permite modificarlas desde otra cuenta", async () => {
		const { data: tarea, error } = await a.client
			.from("tareas")
			.insert({ nombre: "Tarea privada de A" })
			.select("id")
			.single();

		expect(error).toBeNull();
		const tareaId = tarea?.id;

		if (!tareaId) {
			throw new Error("No se obtuvo el id de la tarea");
		}

		const { data: leidas } = await b.client.from("tareas").select("*").eq("id", tareaId);
		expect(leidas).toEqual([]);

		const { data: actualizadas } = await b.client
			.from("tareas")
			.update({ nombre: "Secuestrada" })
			.eq("id", tareaId)
			.select();
		expect(actualizadas).toEqual([]);

		const { data: borradas } = await b.client.from("tareas").delete().eq("id", tareaId).select();
		expect(borradas).toEqual([]);

		const { data: sigueAhi } = await a.client.from("tareas").select("nombre").eq("id", tareaId);
		expect(sigueAhi?.[0]?.nombre).toBe("Tarea privada de A");
	});

	it("rechaza insertar una tarea a nombre de otro usuario", async () => {
		const { error } = await b.client.from("tareas").insert({
			user_id: a.id,
			nombre: "Tarea falsa",
		});

		expect(error).not.toBeNull();
	});

	it("separa los perfiles", async () => {
		const { data: perfil } = await b.client.from("profiles").select("*").eq("id", a.id);
		expect(perfil).toEqual([]);

		const { data: actualizado } = await b.client
			.from("profiles")
			.update({ display_name: "Hackeado" })
			.eq("id", a.id)
			.select();
		expect(actualizado).toEqual([]);
	});

	it("separa los dispositivos", async () => {
		const { error } = await a.client
			.from("devices")
			.insert({ id: "device-a", name: "Device A", platform: "Linux" });

		expect(error).toBeNull();

		const { data: vistos } = await b.client.from("devices").select("*").eq("id", "device-a");
		expect(vistos).toEqual([]);

		const { error: insertError } = await b.client.from("devices").insert({
			user_id: a.id,
			id: "device-falso",
			name: "Device falso",
		});
		expect(insertError).not.toBeNull();
	});

	it("separa pomodoros y breaks", async () => {
		const { data: tarea } = await a.client
			.from("tareas")
			.insert({ nombre: "Tarea con foco" })
			.select("id")
			.single();

		const { data: pomodoro, error: pomodoroError } = await a.client
			.from("pomodoros")
			.insert({
				tarea_id: tarea?.id as string,
				status: "completed",
				minutes_planned: 25,
				minutes_actual: 25,
				local_date: "2026-11-09",
				device_id: "device-a",
			})
			.select("id")
			.single();

		expect(pomodoroError).toBeNull();

		const pomodoroId = pomodoro?.id;

		if (!pomodoroId) {
			throw new Error("No se obtuvo el id del pomodoro");
		}

		const { data: breakCreado, error: breakError } = await a.client
			.from("breaks")
			.insert({
				tipo: "short",
				status: "completed",
				minutes_planned: 5,
				minutes_actual: 5,
				local_date: "2026-11-09",
				device_id: "device-a",
			})
			.select("id")
			.single();

		expect(breakError).toBeNull();
		const breakId = breakCreado?.id;

		if (!breakId) {
			throw new Error("No se obtuvo el id del break");
		}

		const { data: pomodorosVistos } = await b.client
			.from("pomodoros")
			.select("*")
			.eq("id", pomodoroId);
		expect(pomodorosVistos).toEqual([]);

		const { data: breaksVistos } = await b.client.from("breaks").select("*").eq("id", breakId);
		expect(breaksVistos).toEqual([]);

		const { data: pomodorosActualizados } = await b.client
			.from("pomodoros")
			.update({ minutes_actual: 0 })
			.eq("id", pomodoroId)
			.select();
		expect(pomodorosActualizados).toEqual([]);
	});

	it("protege las suscripciones", async () => {
		await crearSuscripcionPro(a.id);
		const admin = crearAdmin();

		const { data: vistaPorB } = await b.client
			.from("subscriptions")
			.select("*")
			.eq("user_id", a.id);
		expect(vistaPorB).toEqual([]);

		const { error: insertError } = await b.client.from("subscriptions").insert({
			user_id: b.id,
			plan: "pro",
			status: "active",
		});
		expect(insertError).not.toBeNull();

		const { data: vistaAdmin } = await admin
			.from("subscriptions")
			.select("plan, status")
			.eq("user_id", a.id)
			.single();
		expect(vistaAdmin).toMatchObject({ plan: "pro", status: "active" });
	});

	it("no expone la tabla de eventos de billing al usuario", async () => {
		const { data } = await b.client.from("billing_events").select("*").limit(1);
		expect(data ?? []).toEqual([]);
	});
});
