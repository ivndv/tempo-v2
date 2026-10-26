"use client";

import { fechaLocal, type RegistroPomodoro } from "@/modules/pomodoros/domain/pomodoro";
import { getLocalDb } from "@/shared/infrastructure/dexie/db";
import type { PeriodoResumen } from "../domain/dashboard";
import type { DashboardLocalResumen } from "../domain/dashboardLocal";

const DIAS_HISTORIAL = 365;

interface OpcionesDashboard {
	timezone: string;
	deviceId?: string | null;
}

export class DexieDashboardRepository {
	async obtener({ timezone, deviceId }: OpcionesDashboard): Promise<DashboardLocalResumen> {
		const db = getLocalDb();
		const hoy = fechaLocal(new Date(), timezone);
		const [pomodoros, tareas] = await Promise.all([db.pomodoros.toArray(), db.tareas.toArray()]);

		const filtrados = pomodoros.filter(
			(pomodoro) => !deviceId || !pomodoro.deviceId || pomodoro.deviceId === deviceId,
		);

		const fechas = Array.from({ length: DIAS_HISTORIAL }, (_, indice) =>
			restarDias(hoy, indice),
		).reverse();

		const porFecha = new Map<
			string,
			{ minutos: number; completados: number; interrumpidos: number }
		>();

		for (const fecha of fechas) {
			porFecha.set(fecha, { minutos: 0, completados: 0, interrumpidos: 0 });
		}

		for (const pomodoro of filtrados) {
			const dia = porFecha.get(pomodoro.localDate);

			if (!dia) {
				continue;
			}

			dia.minutos += pomodoro.minutos;

			if (pomodoro.estado === "interrupted") {
				dia.interrumpidos += 1;
			} else {
				dia.completados += 1;
			}
		}

		const daily = fechas.map((fecha) => {
			const dia = porFecha.get(fecha) ?? { minutos: 0, completados: 0, interrumpidos: 0 };

			return {
				date: fecha,
				focusMinutes: dia.minutos,
				completed: dia.completados,
				interrupted: dia.interrumpidos,
			};
		});

		const inicioSemana = restarDias(hoy, 6);
		const inicioSemanaAnterior = restarDias(hoy, 13);
		const finSemanaAnterior = restarDias(hoy, 7);
		const inicioMes = `${hoy.slice(0, 7)}-01`;

		const periodo = (desde: string, hasta = hoy): PeriodoResumen => {
			const delRango = filtrados.filter(
				(pomodoro) => pomodoro.localDate >= desde && pomodoro.localDate <= hasta,
			);

			return resumir(delRango);
		};

		const nombres = new Map(tareas.map((tarea) => [tarea.id, tarea.nombre]));
		const porTarea = new Map<string, { nombre: string; minutos: number }>();
		const porDispositivo = new Map<string, { minutos: number; completados: number }>();

		for (const pomodoro of filtrados) {
			const clave = pomodoro.tareaId ?? "";
			const actualTarea = porTarea.get(clave) ?? {
				nombre: clave ? (nombres.get(clave) ?? "") : "",
				minutos: 0,
			};
			actualTarea.minutos += pomodoro.minutos;
			porTarea.set(clave, actualTarea);

			const claveDispositivo = pomodoro.deviceId || "desconocido";
			const actualDispositivo = porDispositivo.get(claveDispositivo) ?? {
				minutos: 0,
				completados: 0,
			};
			actualDispositivo.minutos += pomodoro.minutos;

			if (pomodoro.estado !== "interrupted") {
				actualDispositivo.completados += 1;
			}

			porDispositivo.set(claveDispositivo, actualDispositivo);
		}

		const byTask = Array.from(porTarea.entries())
			.map(([tareaId, valor]) => ({
				tareaId,
				nombre: valor.nombre,
				focusMinutes: valor.minutos,
			}))
			.sort((a, b) => b.focusMinutes - a.focusMinutes)
			.slice(0, 10);

		const devices = Array.from(porDispositivo.entries())
			.map(([deviceId, valor]) => ({
				deviceId,
				nombre: "",
				focusMinutes: valor.minutos,
				completed: valor.completados,
			}))
			.sort((a, b) => b.focusMinutes - a.focusMinutes);

		const porDia = new Map<string, number>();
		const porSemana = new Map<string, number>();
		let sesionMasLarga = 0;

		for (const pomodoro of filtrados) {
			porDia.set(pomodoro.localDate, (porDia.get(pomodoro.localDate) ?? 0) + pomodoro.minutos);
			const semana = inicioDeSemana(pomodoro.localDate);
			porSemana.set(semana, (porSemana.get(semana) ?? 0) + pomodoro.minutos);
			sesionMasLarga = Math.max(sesionMasLarga, pomodoro.minutos);
		}

		const diasActivos = Array.from(new Set(filtrados.map((pomodoro) => pomodoro.localDate)))
			.filter((fecha) => (porDia.get(fecha) ?? 0) > 0)
			.sort();

		let rachaLarga = 0;
		let rachaActual = 0;
		let anterior: string | null = null;

		for (const dia of diasActivos) {
			rachaActual = anterior && restarDias(dia, 1) === anterior ? rachaActual + 1 : 1;
			rachaLarga = Math.max(rachaLarga, rachaActual);
			anterior = dia;
		}

		const activos = new Set(diasActivos);
		let cursor = activos.has(hoy) ? hoy : restarDias(hoy, 1);
		let rachaVigente = 0;

		while (activos.has(cursor)) {
			rachaVigente += 1;
			cursor = restarDias(cursor, 1);
		}

		const mejorDia =
			Array.from(porDia.entries())
				.map(([date, focusMinutes]) => ({ date, focusMinutes }))
				.sort((a, b) => b.focusMinutes - a.focusMinutes)[0] ?? null;

		const mejorSemana =
			Array.from(porSemana.entries())
				.map(([weekStart, focusMinutes]) => ({ weekStart, focusMinutes }))
				.sort((a, b) => b.focusMinutes - a.focusMinutes)[0] ?? null;

		return {
			today: periodo(hoy),
			week: periodo(inicioSemana),
			month: periodo(inicioMes),
			allTime: resumir(filtrados),
			previousWeek: periodo(inicioSemanaAnterior, finSemanaAnterior),
			daily,
			byTask,
			devices,
			streak: { current: rachaVigente, longest: rachaLarga },
			bestDay: mejorDia,
			bestWeek: mejorSemana,
			longestSession: sesionMasLarga,
		};
	}
}

function resumir(pomodoros: RegistroPomodoro[]): PeriodoResumen {
	return {
		focusMinutes: pomodoros.reduce((total, pomodoro) => total + pomodoro.minutos, 0),
		completed: pomodoros.filter((pomodoro) => pomodoro.estado !== "interrupted").length,
		interrupted: pomodoros.filter((pomodoro) => pomodoro.estado === "interrupted").length,
	};
}

function restarDias(fecha: string, dias: number): string {
	const base = new Date(`${fecha}T12:00:00Z`);
	base.setUTCDate(base.getUTCDate() - dias);
	return base.toISOString().slice(0, 10);
}

function inicioDeSemana(fecha: string): string {
	const base = new Date(`${fecha}T12:00:00Z`);
	const dia = (base.getUTCDay() + 6) % 7;
	base.setUTCDate(base.getUTCDate() - dia);
	return base.toISOString().slice(0, 10);
}
