import { beforeEach, describe, expect, it } from "vitest";
import {
	DexieOutboxRepository,
	MAX_INTENTOS,
} from "@/modules/sync/infrastructure/DexieOutboxRepository";
import { DexieSyncLocal } from "@/modules/sync/infrastructure/DexieSyncLocal";
import { DexieTareaRepository } from "@/modules/tareas/infrastructure/DexieTareaRepository";
import { getLocalDb, resetLocalDb } from "@/shared/infrastructure/dexie/db";

describe("DexieTareaRepository", () => {
	beforeEach(async () => {
		await resetLocalDb();
	});

	it("guarda la tarea y su outbox en la misma transacción", async () => {
		const repo = new DexieTareaRepository();
		const tarea = await repo.crearEnBloque("Escribir informe", "bloque-1", null);

		const db = getLocalDb();
		const local = await db.tareas.get(tarea.id);
		const outbox = await db.outbox.toArray();

		expect(local?.nombre).toBe("Escribir informe");
		expect(outbox).toHaveLength(1);
		expect(outbox[0]?.payload).toMatchObject({
			id: tarea.id,
			clientUpdatedAt: tarea.createdAt,
		});
	});

	it("fusiona las ediciones pendientes en un solo item", async () => {
		const repo = new DexieTareaRepository();
		const tarea = await repo.crearEnBloque("A", "bloque-1", null);

		await repo.cambiarEstadoEnBloque(tarea.id, "done", null);
		await repo.eliminarEnBloque(tarea.id, null);

		const outbox = await getLocalDb().outbox.toArray();

		expect(outbox).toHaveLength(1);
		expect(outbox[0]?.payload).toMatchObject({ id: tarea.id, estado: "done" });
	});

	it("lista por bloque en orden y excluye eliminadas", async () => {
		const repo = new DexieTareaRepository();
		const primera = await repo.crearEnBloque("Primera", "bloque-1", null);
		const segunda = await repo.crearEnBloque("Segunda", "bloque-1", null);
		await repo.crearEnBloque("Otra", "bloque-2", null);

		await repo.eliminarEnBloque(segunda.id, null);

		const lista = await repo.listarPorBloque("bloque-1");

		expect(lista.map((tarea) => tarea.id)).toEqual([primera.id]);
		expect(await repo.listarPorBloque("bloque-1", true)).toHaveLength(2);
	});
});

describe("DexieOutboxRepository", () => {
	beforeEach(async () => {
		await resetLocalDb();
	});

	it("fusiona operaciones del mismo registro", async () => {
		const tareas = new DexieTareaRepository();
		const outbox = new DexieOutboxRepository();
		const tarea = await tareas.crearEnBloque("A", null, null);

		expect(await outbox.contarPendientes()).toBe(1);
		expect((await getLocalDb().outbox.toArray())[0]?.payload.id).toBe(tarea.id);
	});

	it("marca dead después del máximo de intentos", async () => {
		const tareas = new DexieTareaRepository();
		const outbox = new DexieOutboxRepository();
		await tareas.crearEnBloque("A", null, null);

		const [item] = await getLocalDb().outbox.toArray();

		for (let intento = 0; intento < MAX_INTENTOS; intento += 1) {
			await outbox.marcarFallido(item.id, "fallo persistente");
		}

		const final = await getLocalDb().outbox.get(item.id);

		expect(final?.status).toBe("dead");
		expect(final?.attempts).toBe(MAX_INTENTOS);
		expect(await outbox.contarPendientes()).toBe(0);
		expect(await outbox.listarPendientes()).toHaveLength(0);
	});
});

describe("DexieSyncLocal", () => {
	beforeEach(async () => {
		await resetLocalDb();
	});

	it("purga tombstones viejos que ya no tienen cambios pendientes", async () => {
		const tareas = new DexieTareaRepository();
		const local = new DexieSyncLocal();
		const tarea = await tareas.crearEnBloque("Vieja", null, null);
		const db = getLocalDb();

		await tareas.eliminarEnBloque(tarea.id, null);
		await db.outbox.clear();
		await db.tareas.update(tarea.id, {
			deletedAt: new Date(Date.now() - 60 * 86_400_000).toISOString(),
		});

		const purgadas = await local.purgarTombstonesLocales(30);

		expect(purgadas).toBe(1);
		expect(await db.tareas.get(tarea.id)).toBeUndefined();
	});

	it("no purga tombstones con outbox pendiente", async () => {
		const tareas = new DexieTareaRepository();
		const local = new DexieSyncLocal();
		const tarea = await tareas.crearEnBloque("Pendiente", null, null);
		const db = getLocalDb();

		await tareas.eliminarEnBloque(tarea.id, null);
		await db.tareas.update(tarea.id, {
			deletedAt: new Date(Date.now() - 60 * 86_400_000).toISOString(),
		});

		const purgadas = await local.purgarTombstonesLocales(30);

		expect(purgadas).toBe(0);
		expect(await db.tareas.get(tarea.id)).toBeDefined();
	});
});
