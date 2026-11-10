import { describe, expect, it } from "vitest";
import { SincronizarPendientes } from "@/modules/sync/application/SincronizarPendientes";
import type { CursorSync, EntidadSync } from "@/modules/sync/domain/cursor";
import type { OutboxRepository } from "@/modules/sync/domain/OutboxRepository";
import type {
	BreakSyncPayload,
	NuevoOutboxItem,
	OutboxItem,
	PomodoroSyncPayload,
	ResultadoSubidaTarea,
	TareaSyncPayload,
} from "@/modules/sync/domain/outbox";
import type { BreakRemoto, PomodoroRemoto } from "@/modules/sync/domain/registrosRemotos";
import type { SyncGateway } from "@/modules/sync/domain/SyncGateway";
import type { SyncLocalStore } from "@/modules/sync/domain/SyncLocalStore";
import type { TareaRemota } from "@/modules/sync/domain/tareaRemota";

class MemoryOutboxRepository implements OutboxRepository {
	items: OutboxItem[] = [];

	async encolar(item: NuevoOutboxItem) {
		const now = new Date().toISOString();
		this.items.push({
			...item,
			id: crypto.randomUUID(),
			status: "pending",
			attempts: 0,
			lastError: null,
			createdAt: now,
			nextAttemptAt: now,
		});
	}

	async listarPendientes(limite = 25) {
		return this.items
			.filter((item) => item.status === "pending" || item.status === "failed")
			.slice(0, limite);
	}

	async marcarEnProceso(id: string) {
		const item = this.items.find((candidate) => candidate.id === id);
		if (item) item.status = "syncing";
	}

	async marcarSincronizado(id: string) {
		this.items = this.items.filter((item) => item.id !== id);
	}

	async marcarFallido(id: string, error: string) {
		const item = this.items.find((candidate) => candidate.id === id);
		if (item) {
			item.status = "failed";
			item.attempts += 1;
			item.lastError = error;
		}
	}

	async contarPendientes() {
		return this.items.filter((item) => item.status === "pending" || item.status === "failed")
			.length;
	}

	async contarMuertos() {
		return this.items.filter((item) => item.status === "dead").length;
	}
}

class FakeLocal implements SyncLocalStore {
	cursores = new Map<EntidadSync, CursorSync>();
	pendientes = new Set<string>();
	aplicadas: TareaRemota[] = [];
	pomodorosAplicados: PomodoroRemoto[] = [];
	breaksAplicados: BreakRemoto[] = [];
	tombstonesPurgados = 0;

	async listarTareaIdsPendientes() {
		return this.pendientes;
	}

	async aplicarTareas(remotas: TareaRemota[]) {
		this.aplicadas.push(...remotas);
	}

	async aplicarPomodoros(remotos: PomodoroRemoto[]) {
		this.pomodorosAplicados.push(...remotos);
	}

	async aplicarBreaks(remotos: BreakRemoto[]) {
		this.breaksAplicados.push(...remotos);
	}

	async leerCursor(entidad: EntidadSync) {
		return this.cursores.get(entidad) ?? null;
	}

	async guardarCursor(entidad: EntidadSync, cursor: CursorSync | null) {
		if (cursor) {
			this.cursores.set(entidad, cursor);
		} else {
			this.cursores.delete(entidad);
		}
	}

	async purgarTombstonesLocales() {
		return this.tombstonesPurgados;
	}
}

class FakeGateway implements SyncGateway {
	tareas: TareaSyncPayload[] = [];
	pomodoros: PomodoroSyncPayload[] = [];
	breaks: BreakSyncPayload[] = [];
	eliminadas: string[] = [];
	remotas: TareaRemota[] = [];
	pomodorosRemotos: PomodoroRemoto[] = [];
	breaksRemotos: BreakRemoto[] = [];
	desde: CursorSync | null = null;
	sesion = true;
	fallarPomodoros = false;
	resultadoTarea: ResultadoSubidaTarea = "applied";

	async tieneSesion() {
		return this.sesion;
	}

	async descargarTareas(desde: CursorSync | null) {
		this.desde = desde;
		return this.remotas;
	}

	async descargarPomodoros() {
		return this.pomodorosRemotos;
	}

	async descargarBreaks() {
		return this.breaksRemotos;
	}

	async subirTarea(payload: TareaSyncPayload) {
		this.tareas.push(payload);
		return this.resultadoTarea;
	}

	async eliminarTarea(id: string) {
		this.eliminadas.push(id);
	}

	async subirPomodoro(payload: PomodoroSyncPayload) {
		if (this.fallarPomodoros) {
			throw new Error("fallo temporal");
		}
		this.pomodoros.push(payload);
	}

	async subirBreak(payload: BreakSyncPayload) {
		this.breaks.push(payload);
	}
}

function payloadTarea(id: string): TareaSyncPayload {
	return {
		id,
		nombre: "Tarea",
		estado: "pending",
		createdAt: "2026-10-23T10:00:00.000Z",
		completedAt: null,
		deletedAt: null,
		bloqueId: "bloque-1",
		creadaEnFocusId: null,
		completadaEnFocusId: null,
		eliminadaEnFocusId: null,
		clientUpdatedAt: "2026-10-23T10:00:00.000Z",
		deviceId: "device-1",
	};
}

function payloadPomodoro(id: string): PomodoroSyncPayload {
	return {
		id,
		bloqueId: "bloque-1",
		tareaId: null,
		status: "completed",
		minutesPlanned: 25,
		minutesActual: 25,
		localDate: "2026-10-23",
		createdAt: "2026-10-23T10:25:00.000Z",
		startedAt: "2026-10-23T10:00:00.000Z",
		endedAt: "2026-10-23T10:25:00.000Z",
		cyclePosition: 1,
		deviceId: "device-1",
	};
}

function tareaRemota(id: string, updatedAt: string): TareaRemota {
	return {
		id,
		nombre: "Remota",
		estado: "pending",
		createdAt: "2026-10-23T09:00:00.000Z",
		updatedAt,
		completedAt: null,
		deletedAt: null,
		bloqueId: null,
		creadaEnFocusId: null,
		completadaEnFocusId: null,
		eliminadaEnFocusId: null,
		clientUpdatedAt: updatedAt,
		deviceId: "device-2",
	};
}

describe("SincronizarPendientes", () => {
	it("sube tareas, pomodoros y breaks, y limpia el outbox", async () => {
		const outbox = new MemoryOutboxRepository();
		const gateway = new FakeGateway();
		const servicio = new SincronizarPendientes(outbox, gateway, new FakeLocal());

		await outbox.encolar({ entity: "tarea", operation: "upsert", payload: payloadTarea("t1") });
		await outbox.encolar({
			entity: "pomodoro",
			operation: "upsert",
			payload: payloadPomodoro("p1"),
		});
		await outbox.encolar({
			entity: "break",
			operation: "upsert",
			payload: {
				id: "b1",
				bloqueId: "bloque-1",
				tipo: "short",
				status: "completed",
				minutesPlanned: 5,
				minutesActual: 5,
				localDate: "2026-10-23",
				createdAt: "2026-10-23T10:30:00.000Z",
				startedAt: "2026-10-23T10:25:00.000Z",
				endedAt: "2026-10-23T10:30:00.000Z",
			},
		});

		const resultado = await servicio.execute();

		expect(resultado).toEqual({ subidos: 3, fallidos: 0, pendientes: 0, muertos: 0 });
		expect(gateway.tareas).toHaveLength(1);
		expect(gateway.pomodoros).toHaveLength(1);
		expect(gateway.breaks).toHaveLength(1);
	});

	it("no sincroniza si no hay sesión", async () => {
		const outbox = new MemoryOutboxRepository();
		const gateway = new FakeGateway();
		gateway.sesion = false;
		const servicio = new SincronizarPendientes(outbox, gateway, new FakeLocal());

		await outbox.encolar({ entity: "tarea", operation: "upsert", payload: payloadTarea("t1") });

		const resultado = await servicio.execute();

		expect(resultado.subidos).toBe(0);
		expect(resultado.pendientes).toBe(1);
		expect(gateway.tareas).toHaveLength(0);
	});

	it("marca fallido y reintenta después", async () => {
		const outbox = new MemoryOutboxRepository();
		const gateway = new FakeGateway();
		gateway.fallarPomodoros = true;
		const servicio = new SincronizarPendientes(outbox, gateway, new FakeLocal());

		await outbox.encolar({
			entity: "pomodoro",
			operation: "upsert",
			payload: payloadPomodoro("p1"),
		});

		const fallo = await servicio.execute();
		expect(fallo.fallidos).toBe(1);
		expect(fallo.pendientes).toBe(1);
		expect(outbox.items[0]?.lastError).toBe("fallo temporal");

		gateway.fallarPomodoros = false;
		outbox.items[0].nextAttemptAt = new Date(0).toISOString();

		const reintento = await servicio.execute();
		expect(reintento.subidos).toBe(1);
		expect(reintento.pendientes).toBe(0);
	});

	it("descarga tareas y respeta las que tienen cambios locales", async () => {
		const outbox = new MemoryOutboxRepository();
		const gateway = new FakeGateway();
		const local = new FakeLocal();
		const cursor: CursorSync = { updatedAt: "2026-10-23T09:00:00.000Z", id: "" };
		local.cursores.set("tareas", cursor);
		local.pendientes.add("t2");
		gateway.remotas = [
			tareaRemota("t1", "2026-10-23T10:00:00.000Z"),
			tareaRemota("t2", "2026-10-23T11:00:00.000Z"),
		];

		const servicio = new SincronizarPendientes(outbox, gateway, local);
		await servicio.execute();

		expect(gateway.desde).toEqual(cursor);
		expect(local.aplicadas.map((tarea) => tarea.id)).toEqual(["t1"]);
		expect(local.cursores.get("tareas")).toEqual({
			updatedAt: "2026-10-23T11:00:00.000Z",
			id: "t2",
		});
	});

	it("descarga pomodoros y breaks con su propio cursor", async () => {
		const gateway = new FakeGateway();
		const local = new FakeLocal();
		gateway.pomodorosRemotos = [
			{
				id: "p1",
				bloqueId: "bloque-1",
				tareaId: null,
				status: "completed",
				minutesPlanned: 25,
				minutesActual: 25,
				localDate: "2026-10-23",
				createdAt: "2026-10-23T10:25:00.000Z",
				updatedAt: "2026-10-23T10:25:00.000Z",
				startedAt: "2026-10-23T10:00:00.000Z",
				endedAt: "2026-10-23T10:25:00.000Z",
				cyclePosition: 1,
				deviceId: "device-1",
			},
		];
		gateway.breaksRemotos = [
			{
				id: "b1",
				bloqueId: "bloque-1",
				tipo: "short",
				status: "completed",
				minutesPlanned: 5,
				minutesActual: 5,
				localDate: "2026-10-23",
				createdAt: "2026-10-23T10:30:00.000Z",
				updatedAt: "2026-10-23T10:30:00.000Z",
				startedAt: "2026-10-23T10:25:00.000Z",
				endedAt: "2026-10-23T10:30:00.000Z",
				deviceId: "device-1",
			},
		];

		const servicio = new SincronizarPendientes(new MemoryOutboxRepository(), gateway, local);
		await servicio.execute();

		expect(local.pomodorosAplicados.map((pomodoro) => pomodoro.id)).toEqual(["p1"]);
		expect(local.breaksAplicados.map((descanso) => descanso.id)).toEqual(["b1"]);
		expect(local.cursores.get("pomodoros")).toEqual({
			updatedAt: "2026-10-23T10:25:00.000Z",
			id: "p1",
		});
		expect(local.cursores.get("breaks")).toEqual({
			updatedAt: "2026-10-23T10:30:00.000Z",
			id: "b1",
		});
	});

	it("reinicia el cursor cuando el servidor rechaza por conflicto", async () => {
		const outbox = new MemoryOutboxRepository();
		const gateway = new FakeGateway();
		const local = new FakeLocal();
		gateway.resultadoTarea = "stale";
		local.cursores.set("tareas", { updatedAt: "2026-10-23T09:00:00.000Z", id: "" });

		await outbox.encolar({
			entity: "tarea",
			operation: "upsert",
			payload: payloadTarea("t1"),
		});

		const servicio = new SincronizarPendientes(outbox, gateway, local);
		await servicio.execute();

		expect(local.cursores.has("tareas")).toBe(false);
	});

	it("trata una tarea eliminada en el servidor como conflicto", async () => {
		const outbox = new MemoryOutboxRepository();
		const gateway = new FakeGateway();
		const local = new FakeLocal();
		gateway.resultadoTarea = "deleted";
		local.cursores.set("tareas", { updatedAt: "2026-10-23T09:00:00.000Z", id: "" });

		await outbox.encolar({
			entity: "tarea",
			operation: "upsert",
			payload: payloadTarea("t1"),
		});

		const servicio = new SincronizarPendientes(outbox, gateway, local);
		const resultado = await servicio.execute();

		expect(resultado.subidos).toBe(1);
		expect(resultado.pendientes).toBe(0);
		expect(local.cursores.has("tareas")).toBe(false);
	});
});
