"use client";

import Dexie, { type Table } from "dexie";
import type {
	RegistroBreak,
	RegistroPomodoro,
	SesionActiva,
} from "@/modules/pomodoros/domain/pomodoro";
import type { OutboxItem } from "@/modules/sync/domain/outbox";
import type { EstadoTarea } from "@/modules/tareas/domain/tarea";

export interface TareaLocalRow {
	id: string;
	userId: string;
	bloqueId: string | null;
	nombre: string;
	estado: EstadoTarea;
	createdAt: string;
	updatedAt: string;
	completedAt: string | null;
	deletedAt: string | null;
	creadaEnFocusId: string | null;
	completadaEnFocusId: string | null;
	eliminadaEnFocusId: string | null;
}

export interface PendienteRow {
	tareaId: string;
	segundos: number;
	actualizadoEn: string;
}

export interface SyncStateRow {
	clave: string;
	valor: string;
}

class TempoLocalDatabase extends Dexie {
	tareas!: Table<TareaLocalRow, string>;
	sesionActiva!: Table<SesionActiva, string>;
	pomodoros!: Table<RegistroPomodoro, string>;
	breaks!: Table<RegistroBreak, string>;
	pendientes!: Table<PendienteRow, string>;
	outbox!: Table<OutboxItem, string>;
	syncState!: Table<SyncStateRow, string>;

	constructor() {
		super("tempo-v2-local");

		this.version(1).stores({
			tareas: "id, estado, createdAt, updatedAt",
		});

		this.version(2).stores({
			tareas: "id, estado, createdAt, updatedAt",
			sesionActiva: "id, modo",
			pomodoros: "id, tareaId, localDate, estado",
			breaks: "id, localDate, tipo, estado",
			pendientes: "tareaId",
		});

		// La forma de SesionActiva cambió al introducir bloques.
		// Limpia sesiones viejas; el historial de pomodoros se conserva.
		this.version(3)
			.stores({
				tareas: "id, estado, createdAt, updatedAt",
				sesionActiva: "id, modo",
				pomodoros: "id, tareaId, localDate, estado",
				breaks: "id, localDate, tipo, estado",
				pendientes: "tareaId",
			})
			.upgrade(async (transaction) => {
				await transaction.table("sesionActiva").clear();
			});

		this.version(4).stores({
			tareas: "id, estado, createdAt, updatedAt",
			sesionActiva: "id, modo",
			pomodoros: "id, tareaId, localDate, estado",
			breaks: "id, localDate, tipo, estado",
			pendientes: "tareaId",
			outbox: "id, status, nextAttemptAt, createdAt",
		});

		// Los bloques ahora son por reloj exacto; la forma de SesionActiva cambió.
		this.version(5)
			.stores({
				tareas: "id, estado, createdAt, updatedAt",
				sesionActiva: "id, modo",
				pomodoros: "id, tareaId, localDate, estado",
				breaks: "id, localDate, tipo, estado",
				pendientes: "tareaId",
				outbox: "id, status, nextAttemptAt, createdAt",
			})
			.upgrade(async (transaction) => {
				await transaction.table("sesionActiva").clear();
			});

		this.version(6).stores({
			tareas: "id, bloqueId, estado, createdAt, updatedAt, deletedAt",
			sesionActiva: "id, modo",
			pomodoros: "id, tareaId, localDate, estado",
			breaks: "id, localDate, tipo, estado",
			pendientes: "tareaId",
			outbox: "id, status, nextAttemptAt, createdAt",
		});

		// Índices compuestos, cursor de sync y estado del dispositivo.
		this.version(7).stores({
			tareas: "id, bloqueId, estado, createdAt, updatedAt, deletedAt, [bloqueId+createdAt]",
			sesionActiva: "id, modo",
			pomodoros: "id, tareaId, localDate, estado",
			breaks: "id, localDate, tipo, estado",
			pendientes: "tareaId",
			outbox: "id, status, nextAttemptAt, createdAt, entity, [status+nextAttemptAt]",
			syncState: "clave",
		});
	}
}

let db: TempoLocalDatabase | null = null;

export function getLocalDb(): TempoLocalDatabase {
	if (typeof indexedDB === "undefined") {
		throw new Error("Dexie solo está disponible en el navegador");
	}

	db ??= new TempoLocalDatabase();
	return db;
}

// Limpia los datos locales al cerrar sesión (después de sincronizar).
export async function clearLocalData(): Promise<void> {
	const database = getLocalDb();

	await database.transaction("rw", database.tables, async () => {
		await Promise.all(database.tables.map((table) => table.clear()));
	});
}

// Reinicia la base local; usado por las pruebas con fake-indexeddb.
export async function resetLocalDb(): Promise<void> {
	if (!db) return;

	await db.delete();
	db = null;
}
