"use client";

import type { RegistroBreak, RegistroPomodoro } from "@/modules/pomodoros/domain/pomodoro";
import type { EstadoTarea } from "@/modules/tareas/domain/tarea";
import { getLocalDb, type TareaLocalRow } from "@/shared/infrastructure/dexie/db";
import type { CursorSync, EntidadSync } from "../domain/cursor";
import type { BreakRemoto, PomodoroRemoto } from "../domain/registrosRemotos";
import type { SyncLocalStore } from "../domain/SyncLocalStore";
import type { TareaRemota } from "../domain/tareaRemota";

const CURSOR = (entidad: EntidadSync) => `${entidad}.cursor`;

export class DexieSyncLocal implements SyncLocalStore {
	async listarTareaIdsPendientes(): Promise<Set<string>> {
		const items = await getLocalDb().outbox.where("entity").equals("tarea").toArray();

		return new Set(
			items
				.filter((item) => item.status !== "dead")
				.map((item) => (item.payload as { id: string }).id),
		);
	}

	async aplicarTareas(remotas: TareaRemota[]): Promise<void> {
		if (remotas.length === 0) {
			return;
		}

		const db = getLocalDb();

		await db.transaction("rw", db.tareas, async () => {
			await db.tareas.bulkPut(remotas.map(aFilaLocal));
		});
	}

	async aplicarPomodoros(remotos: PomodoroRemoto[]): Promise<void> {
		const filas = remotos
			.map(aRegistroPomodoro)
			.filter((registro): registro is RegistroPomodoro => registro !== null);

		if (filas.length === 0) {
			return;
		}

		const db = getLocalDb();

		await db.transaction("rw", db.pomodoros, async () => {
			await db.pomodoros.bulkPut(filas);
		});
	}

	async aplicarBreaks(remotos: BreakRemoto[]): Promise<void> {
		const filas = remotos
			.map(aRegistroBreak)
			.filter((registro): registro is RegistroBreak => registro !== null);

		if (filas.length === 0) {
			return;
		}

		const db = getLocalDb();

		await db.transaction("rw", db.breaks, async () => {
			await db.breaks.bulkPut(filas);
		});
	}

	async leerCursor(entidad: EntidadSync): Promise<CursorSync | null> {
		const fila = await getLocalDb().syncState.get(CURSOR(entidad));

		if (!fila?.valor) {
			return null;
		}

		return parsearCursor(fila.valor);
	}

	async guardarCursor(entidad: EntidadSync, cursor: CursorSync | null): Promise<void> {
		const db = getLocalDb();
		const clave = CURSOR(entidad);

		if (!cursor) {
			await db.syncState.delete(clave);
			return;
		}

		await db.syncState.put({ clave, valor: JSON.stringify(cursor) });
	}

	// Borra tombstones locales ya sincronizados y con más de N días.
	async purgarTombstonesLocales(dias: number): Promise<number> {
		const db = getLocalDb();
		const limite = new Date(Date.now() - dias * 86_400_000).toISOString();
		let borradas = 0;

		await db.transaction("rw", db.tareas, db.outbox, async () => {
			const enOutbox = new Set(
				(await db.outbox.where("entity").equals("tarea").toArray()).map(
					(item) => (item.payload as { id: string }).id,
				),
			);

			const candidatas = await db.tareas.where("deletedAt").below(limite).toArray();
			const ids = candidatas.filter((tarea) => !enOutbox.has(tarea.id)).map((tarea) => tarea.id);

			if (ids.length > 0) {
				await db.tareas.bulkDelete(ids);
				borradas = ids.length;
			}
		});

		return borradas;
	}
}

function parsearCursor(valor: string): CursorSync {
	try {
		const cursor = JSON.parse(valor) as Partial<CursorSync>;

		if (typeof cursor.updatedAt === "string" && typeof cursor.id === "string") {
			return { updatedAt: cursor.updatedAt, id: cursor.id };
		}
	} catch {
		// Cursor viejo en formato ISO: se migra al vuelo.
	}

	return { updatedAt: valor, id: "" };
}

function aFilaLocal(remota: TareaRemota): TareaLocalRow {
	return {
		id: remota.id,
		userId: "local",
		bloqueId: remota.bloqueId,
		nombre: remota.nombre,
		estado: remota.estado as EstadoTarea,
		createdAt: remota.createdAt,
		updatedAt: remota.clientUpdatedAt ?? remota.updatedAt,
		completedAt: remota.completedAt,
		deletedAt: remota.deletedAt,
		creadaEnFocusId: remota.creadaEnFocusId,
		completadaEnFocusId: remota.completadaEnFocusId,
		eliminadaEnFocusId: remota.eliminadaEnFocusId,
	};
}

function aRegistroPomodoro(remoto: PomodoroRemoto): RegistroPomodoro | null {
	const estado = remoto.status;

	if (estado !== "completed" && estado !== "completed_early" && estado !== "interrupted") {
		return null;
	}

	return {
		id: remoto.id,
		bloqueId: remoto.bloqueId ?? "",
		tareaId: remoto.tareaId,
		tareaNombre: null,
		minutos: remoto.minutesActual ?? remoto.minutesPlanned,
		minutosPlanificados: remoto.minutesPlanned,
		estado,
		iniciadaEn: remoto.startedAt ?? remoto.createdAt,
		finalizadaEn: remoto.endedAt ?? remoto.createdAt,
		localDate: remoto.localDate,
		ciclo: remoto.cyclePosition ?? 0,
		deviceId: remoto.deviceId ?? "unknown",
	};
}

function aRegistroBreak(remoto: BreakRemoto): RegistroBreak | null {
	if (
		remoto.status !== "completed" &&
		remoto.status !== "skipped" &&
		remoto.status !== "interrupted"
	) {
		return null;
	}

	return {
		id: remoto.id,
		bloqueId: remoto.bloqueId ?? "",
		tipo: remoto.tipo === "long" ? "long" : "short",
		estado: remoto.status === "completed" ? "completed" : "skipped",
		minutos: remoto.minutesActual ?? remoto.minutesPlanned,
		minutosPlanificados: remoto.minutesPlanned,
		iniciadaEn: remoto.startedAt ?? remoto.createdAt,
		finalizadaEn: remoto.endedAt ?? remoto.createdAt,
		localDate: remoto.localDate,
		deviceId: remoto.deviceId ?? "unknown",
	};
}
