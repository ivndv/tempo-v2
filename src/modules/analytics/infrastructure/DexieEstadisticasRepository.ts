"use client";

import { fechaLocal } from "@/modules/pomodoros/domain/pomodoro";
import { getLocalDb } from "@/shared/infrastructure/dexie/db";
import { leerZonaHoraria } from "@/shared/infrastructure/preferences";
import type { EstadisticasRepository } from "../domain/EstadisticasRepository";
import type { DiaResumen, EstadisticasHoy } from "../domain/estadisticas";

function zonaHoraria(): string {
	return leerZonaHoraria();
}

export class DexieEstadisticasRepository implements EstadisticasRepository {
	async obtenerHoy(): Promise<EstadisticasHoy> {
		const db = getLocalDb();
		const hoy = fechaLocal(new Date(), zonaHoraria());
		const [pomodoros, breaks] = await Promise.all([
			db.pomodoros.where("localDate").equals(hoy).toArray(),
			db.breaks.where("localDate").equals(hoy).toArray(),
		]);

		const focusMinutos = pomodoros.reduce((total, pomodoro) => total + pomodoro.minutos, 0);
		const breaksCortosMinutos = breaks
			.filter((descanso) => descanso.tipo === "short")
			.reduce((total, descanso) => total + descanso.minutos, 0);
		const breaksLargosMinutos = breaks
			.filter((descanso) => descanso.tipo === "long")
			.reduce((total, descanso) => total + descanso.minutos, 0);

		return {
			focusMinutos,
			pomodorosCompletados: pomodoros.filter(
				(pomodoro) => pomodoro.estado === "completed" || pomodoro.estado === "completed_early",
			).length,
			pomodorosInterrumpidos: pomodoros.filter((pomodoro) => pomodoro.estado === "interrupted")
				.length,
			breaksCortosMinutos,
			breaksLargosMinutos,
			breaksCompletados: breaks.filter((descanso) => descanso.estado === "completed").length,
			breaksSaltados: breaks.filter((descanso) => descanso.estado === "skipped").length,
		};
	}

	async obtenerUltimosDias(dias: number): Promise<DiaResumen[]> {
		const db = getLocalDb();
		const zona = zonaHoraria();
		const ahora = Date.now();
		const fechas = Array.from({ length: dias }, (_, indice) =>
			fechaLocal(new Date(ahora - indice * 86_400_000), zona),
		).reverse();
		const desde = fechas[0] ?? fechaLocal(new Date(ahora), zona);
		const pomodoros = await db.pomodoros.where("localDate").aboveOrEqual(desde).toArray();

		return fechas.map((fecha) => {
			const delDia = pomodoros.filter((pomodoro) => pomodoro.localDate === fecha);

			return {
				fecha,
				minutos: delDia.reduce((total, pomodoro) => total + pomodoro.minutos, 0),
				sesiones: delDia.length,
			};
		});
	}
}
