"use client";

import { DexieOutboxRepository } from "@/modules/sync/infrastructure/DexieOutboxRepository";
import { getLocalDb } from "@/shared/infrastructure/dexie/db";
import type { RegistroBreak, RegistroPomodoro, SesionActiva } from "../domain/pomodoro";
import type { TimerRepository } from "../domain/TimerRepository";

function payloadPomodoro(registro: RegistroPomodoro) {
	return {
		id: registro.id,
		bloqueId: registro.bloqueId,
		tareaId: registro.tareaId,
		status: registro.estado,
		minutesPlanned: registro.minutosPlanificados,
		minutesActual: registro.minutos,
		localDate: registro.localDate,
		createdAt: registro.finalizadaEn,
		startedAt: registro.iniciadaEn,
		endedAt: registro.finalizadaEn,
		cyclePosition: registro.ciclo,
		deviceId: registro.deviceId,
	};
}

function payloadBreak(registro: RegistroBreak) {
	return {
		id: registro.id,
		bloqueId: registro.bloqueId,
		tipo: registro.tipo,
		status: registro.estado,
		minutesPlanned: registro.minutosPlanificados,
		minutesActual: registro.minutos,
		localDate: registro.localDate,
		createdAt: registro.finalizadaEn,
		startedAt: registro.iniciadaEn,
		endedAt: registro.finalizadaEn,
		deviceId: registro.deviceId,
	};
}

export class DexieTimerRepository implements TimerRepository {
	private readonly outbox = new DexieOutboxRepository();

	async obtenerSesion(): Promise<SesionActiva | null> {
		const sesion = await getLocalDb().sesionActiva.toCollection().first();
		return sesion ?? null;
	}

	async guardarSesion(sesion: SesionActiva): Promise<void> {
		const db = getLocalDb();

		await db.transaction("rw", db.sesionActiva, async () => {
			await db.sesionActiva.clear();
			await db.sesionActiva.put(sesion);
		});
	}

	async limpiarSesion(): Promise<void> {
		await getLocalDb().sesionActiva.clear();
	}

	// Cierra un focus/break de forma atómica: registro, outbox y siguiente sesión.
	async guardarCierre(
		registro: RegistroPomodoro | RegistroBreak,
		siguiente: SesionActiva | null,
	): Promise<void> {
		const db = getLocalDb();
		const esPomodoro = "ciclo" in registro;

		await db.transaction("rw", db.sesionActiva, db.pomodoros, db.breaks, db.outbox, async () => {
			if (esPomodoro) {
				await db.pomodoros.put(registro);
				await this.outbox.encolar({
					entity: "pomodoro",
					operation: "upsert",
					payload: payloadPomodoro(registro),
				});
			} else {
				await db.breaks.put(registro);
				await this.outbox.encolar({
					entity: "break",
					operation: "upsert",
					payload: payloadBreak(registro),
				});
			}

			await db.sesionActiva.clear();

			if (siguiente) {
				await db.sesionActiva.put(siguiente);
			}
		});
	}

	async obtenerPendiente(tareaId: string): Promise<number | null> {
		const pendiente = await getLocalDb().pendientes.get(tareaId);
		return pendiente?.segundos ?? null;
	}

	async guardarPendiente(tareaId: string, segundos: number): Promise<void> {
		await getLocalDb().pendientes.put({
			tareaId,
			segundos,
			actualizadoEn: new Date().toISOString(),
		});
	}

	async limpiarPendiente(tareaId: string): Promise<void> {
		await getLocalDb().pendientes.delete(tareaId);
	}
}
