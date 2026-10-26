"use client";

import Dexie from "dexie";
import { DexieOutboxRepository } from "@/modules/sync/infrastructure/DexieOutboxRepository";
import { obtenerDeviceId } from "@/shared/infrastructure/device";
import { getLocalDb, type TareaLocalRow } from "@/shared/infrastructure/dexie/db";
import type { TareaRepository } from "../domain/TareaRepository";
import type { EstadoTarea, Tarea } from "../domain/tarea";

export interface ResumenTareasBloque {
	creadas: number;
	completadas: number;
	eliminadas: number;
	total: number;
}

function mapTarea(row: TareaLocalRow): Tarea {
	return {
		id: row.id,
		userId: row.userId,
		bloqueId: row.bloqueId,
		nombre: row.nombre,
		estado: row.estado,
		createdAt: row.createdAt,
		completedAt: row.completedAt,
		deletedAt: row.deletedAt,
	};
}

function payloadTarea(row: TareaLocalRow) {
	return {
		id: row.id,
		nombre: row.nombre,
		estado: row.estado,
		createdAt: row.createdAt,
		completedAt: row.completedAt,
		deletedAt: row.deletedAt,
		bloqueId: row.bloqueId,
		creadaEnFocusId: row.creadaEnFocusId,
		completadaEnFocusId: row.completadaEnFocusId,
		eliminadaEnFocusId: row.eliminadaEnFocusId,
		clientUpdatedAt: row.updatedAt,
		deviceId: obtenerDeviceId(),
	};
}

export class DexieTareaRepository implements TareaRepository {
	private readonly outbox = new DexieOutboxRepository();

	async listar(): Promise<Tarea[]> {
		const rows = await getLocalDb().tareas.orderBy("createdAt").reverse().toArray();
		return rows.filter((row) => !row.deletedAt).map(mapTarea);
	}

	async listarPorBloque(bloqueId: string, incluirEliminadas = false): Promise<Tarea[]> {
		const rows = await getLocalDb()
			.tareas.where("[bloqueId+createdAt]")
			.between([bloqueId, Dexie.minKey], [bloqueId, Dexie.maxKey], true, true)
			.reverse()
			.toArray();

		return rows.filter((row) => incluirEliminadas || !row.deletedAt).map(mapTarea);
	}

	async crear(nombre: string): Promise<Tarea> {
		return this.crearEnBloque(nombre, null, null);
	}

	async crearEnBloque(
		nombre: string,
		bloqueId: string | null,
		focusId: string | null,
	): Promise<Tarea> {
		const db = getLocalDb();
		const now = new Date().toISOString();
		const row: TareaLocalRow = {
			id: crypto.randomUUID(),
			userId: "local",
			bloqueId,
			nombre,
			estado: "pending",
			createdAt: now,
			updatedAt: now,
			completedAt: null,
			deletedAt: null,
			creadaEnFocusId: focusId,
			completadaEnFocusId: null,
			eliminadaEnFocusId: null,
		};

		// Tarea + outbox en una sola transacción: o se guardan las dos o ninguna.
		await db.transaction("rw", db.tareas, db.outbox, async () => {
			await db.tareas.add(row);
			await this.outbox.encolar({
				entity: "tarea",
				operation: "upsert",
				payload: payloadTarea(row),
			});
		});

		return mapTarea(row);
	}

	async cambiarEstado(id: string, estado: EstadoTarea): Promise<void> {
		await this.cambiarEstadoEnBloque(id, estado, null);
	}

	async cambiarEstadoEnBloque(
		id: string,
		estado: EstadoTarea,
		focusId: string | null,
	): Promise<void> {
		const db = getLocalDb();

		await db.transaction("rw", db.tareas, db.outbox, async () => {
			const actual = await db.tareas.get(id);

			if (!actual) {
				return;
			}

			const now = new Date().toISOString();

			await db.tareas.update(id, {
				estado,
				completedAt: estado === "done" ? now : null,
				completadaEnFocusId: estado === "done" ? (actual.completadaEnFocusId ?? focusId) : null,
				updatedAt: now,
			});

			const row = await db.tareas.get(id);

			if (row) {
				await this.outbox.encolar({
					entity: "tarea",
					operation: "upsert",
					payload: payloadTarea(row),
				});
			}
		});
	}

	async eliminar(id: string): Promise<void> {
		await this.eliminarEnBloque(id, null);
	}

	async eliminarEnBloque(id: string, focusId: string | null): Promise<void> {
		const db = getLocalDb();

		await db.transaction("rw", db.tareas, db.outbox, async () => {
			const actual = await db.tareas.get(id);

			if (!actual) {
				return;
			}

			const now = new Date().toISOString();

			await db.tareas.update(id, {
				deletedAt: now,
				eliminadaEnFocusId: focusId,
				updatedAt: now,
			});

			const row = await db.tareas.get(id);

			if (row) {
				await this.outbox.encolar({
					entity: "tarea",
					operation: "upsert",
					payload: payloadTarea(row),
				});
			}
		});
	}

	async resumenBloque(bloqueId: string): Promise<ResumenTareasBloque> {
		const rows = await getLocalDb().tareas.where("bloqueId").equals(bloqueId).toArray();

		return {
			creadas: rows.length,
			completadas: rows.filter((row) => row.completadaEnFocusId !== null || row.estado === "done")
				.length,
			eliminadas: rows.filter((row) => row.deletedAt !== null).length,
			total: rows.length,
		};
	}
}
