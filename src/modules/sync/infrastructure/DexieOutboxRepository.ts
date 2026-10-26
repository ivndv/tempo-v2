"use client";

import { getLocalDb } from "@/shared/infrastructure/dexie/db";
import type { OutboxRepository } from "../domain/OutboxRepository";
import type { NuevoOutboxItem, OutboxItem } from "../domain/outbox";

const MAX_INTENTOS = 8;
const LEASE_MS = 60_000;

export class DexieOutboxRepository implements OutboxRepository {
	async encolar(item: NuevoOutboxItem): Promise<void> {
		const db = getLocalDb();
		const ahora = new Date().toISOString();
		const existente = await db.outbox
			.where("entity")
			.equals(item.entity)
			.filter((candidato) => candidato.payload.id === item.payload.id)
			.first();

		// Fusiona operaciones del mismo registro: gana la última.
		if (existente) {
			await db.outbox.update(existente.id, {
				operation: item.operation,
				payload: item.payload,
				status: "pending",
				attempts: 0,
				lastError: null,
				nextAttemptAt: ahora,
				leaseUntil: undefined,
			});
			return;
		}

		await db.outbox.add({
			id: crypto.randomUUID(),
			entity: item.entity,
			operation: item.operation,
			payload: item.payload,
			status: "pending",
			attempts: 0,
			lastError: null,
			createdAt: ahora,
			nextAttemptAt: ahora,
		});
	}

	async listarPendientes(limite = 25): Promise<OutboxItem[]> {
		const db = getLocalDb();
		const ahora = new Date().toISOString();

		const [pendientes, fallidos, enProceso] = await Promise.all([
			db.outbox
				.where("[status+nextAttemptAt]")
				.between(["pending", ""], ["pending", ahora], true, true)
				.toArray(),
			db.outbox
				.where("[status+nextAttemptAt]")
				.between(["failed", ""], ["failed", ahora], true, true)
				.toArray(),
			db.outbox.where("status").equals("syncing").toArray(),
		]);

		// Un lease vencido indica que la pestaña que sincronizaba se cerró.
		const sincronizando = enProceso.filter((item) => !item.leaseUntil || item.leaseUntil <= ahora);

		return [...pendientes, ...fallidos, ...sincronizando]
			.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
			.slice(0, limite);
	}

	async marcarEnProceso(id: string): Promise<void> {
		await getLocalDb().outbox.update(id, {
			status: "syncing",
			leaseUntil: new Date(Date.now() + LEASE_MS).toISOString(),
		});
	}

	async marcarSincronizado(id: string): Promise<void> {
		await getLocalDb().outbox.delete(id);
	}

	async marcarFallido(id: string, error: string): Promise<void> {
		const db = getLocalDb();
		const item = await db.outbox.get(id);

		if (!item) {
			return;
		}

		const attempts = item.attempts + 1;
		const baseSegundos = Math.min(300, 2 ** Math.min(attempts, 6) * 5);
		// Jitter para evitar que varias pestañas reintenten al mismo tiempo.
		const esperaSegundos = Math.round(baseSegundos * (1 + Math.random() * 0.25));
		const muerto = attempts >= MAX_INTENTOS;

		await db.outbox.update(id, {
			status: muerto ? "dead" : "failed",
			attempts,
			lastError: error,
			nextAttemptAt: new Date(Date.now() + esperaSegundos * 1000).toISOString(),
			leaseUntil: undefined,
		});
	}

	async contarPendientes(): Promise<number> {
		return getLocalDb().outbox.where("status").anyOf("pending", "failed", "syncing").count();
	}

	async contarMuertos(): Promise<number> {
		return getLocalDb().outbox.where("status").equals("dead").count();
	}
}

export { MAX_INTENTOS };
