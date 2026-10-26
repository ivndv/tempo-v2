import { type Clock, systemClock } from "@/shared/domain/clock";
import {
	type BloqueActivo,
	crearBloque,
	crearSesionBreak,
	crearSesionFocus,
	DURACIONES,
	fechaLocal,
	minutosTranscurridos,
	pausarSesion,
	type RegistroBreak,
	type RegistroPomodoro,
	reanudarSesion,
	restanteBloque,
	type SesionActiva,
	tipoBreakParaCiclo,
} from "../domain/pomodoro";
import type { TimerRepository } from "../domain/TimerRepository";

export interface ResultadoCompletarFocus {
	registro: RegistroPomodoro;
	sesion: SesionActiva | null;
	bloqueCompletado: boolean;
	bloque: BloqueActivo;
}

export interface ResultadoCompletarBreak {
	registro: RegistroBreak;
	sesion: SesionActiva | null;
	bloqueCompletado: boolean;
	bloque: BloqueActivo;
}

export type ResultadoCancelar = RegistroPomodoro | RegistroBreak | null;

export class PomodoroTimerService {
	constructor(
		private readonly repo: TimerRepository,
		private readonly clock: Clock = systemClock,
		private readonly deviceId: string = "unknown",
	) {}

	recuperar(): Promise<SesionActiva | null> {
		return this.repo.obtenerSesion();
	}

	async iniciarBloque(
		duracionMinutos: number,
		zonaHorariaPreferida?: string,
	): Promise<SesionActiva> {
		const zonaHoraria =
			zonaHorariaPreferida ||
			Intl.DateTimeFormat().resolvedOptions().timeZone ||
			"America/Mexico_City";
		const ahora = this.clock.now().getTime();
		const bloque = crearBloque({ duracionMinutos, zonaHoraria, ahora });
		const sesion = crearSesionFocus({ bloque, ahora });

		await this.repo.guardarSesion(sesion);
		return sesion;
	}

	async pausar(sesion: SesionActiva): Promise<SesionActiva> {
		const pausada = pausarSesion(sesion, this.clock.now().getTime());
		await this.repo.guardarSesion(pausada);
		return pausada;
	}

	async reanudar(sesion: SesionActiva): Promise<SesionActiva> {
		const reanudada = reanudarSesion(sesion, this.clock.now().getTime());
		await this.repo.guardarSesion(reanudada);
		return reanudada;
	}

	async completarFocus(sesion: SesionActiva): Promise<ResultadoCompletarFocus> {
		if (sesion.modo !== "focus") {
			throw new Error("La sesión activa no es un pomodoro de enfoque");
		}

		const ahora = this.clock.now();
		const ahoraMs = ahora.getTime();
		const estado = sesion.cortadaPorBloque ? "completed_early" : "completed";
		const ciclo = sesion.bloque.ciclosCompletados + (estado === "completed" ? 1 : 0);
		const bloque: BloqueActivo = {
			...sesion.bloque,
			ciclosCompletados: ciclo,
			focoAcumuladoMin: sesion.bloque.focoAcumuladoMin + sesion.minutosPlanificados,
		};

		const registro: RegistroPomodoro = {
			id: crypto.randomUUID(),
			bloqueId: sesion.bloque.id,
			tareaId: null,
			tareaNombre: null,
			minutos: sesion.minutosPlanificados,
			minutosPlanificados: sesion.minutosPlanificados,
			estado,
			iniciadaEn: new Date(sesion.iniciadaEn).toISOString(),
			finalizadaEn: ahora.toISOString(),
			localDate: fechaLocal(ahora, bloque.zonaHoraria),
			ciclo: sesion.bloque.ciclosCompletados + 1,
			deviceId: this.deviceId,
		};

		const bloqueTermina = estado === "completed_early" || restanteBloque(bloque, ahoraMs) < 60;

		if (bloqueTermina) {
			await this.repo.guardarCierre(registro, null);
			return {
				registro,
				sesion: null,
				bloqueCompletado: true,
				bloque,
			};
		}

		const descanso = crearSesionBreak({
			bloque,
			tipo: tipoBreakParaCiclo(ciclo),
			ahora: ahoraMs,
		});
		await this.repo.guardarCierre(registro, descanso);

		return {
			registro,
			sesion: descanso,
			bloqueCompletado: false,
			bloque,
		};
	}

	async completarBreak(sesion: SesionActiva): Promise<ResultadoCompletarBreak> {
		if (sesion.modo === "focus") {
			throw new Error("La sesión activa no es un descanso");
		}

		const ahora = this.clock.now();
		const ahoraMs = ahora.getTime();
		const estado = sesion.cortadaPorBloque ? "skipped" : "completed";
		const registro: RegistroBreak = {
			id: crypto.randomUUID(),
			bloqueId: sesion.bloque.id,
			tipo: sesion.modo,
			estado,
			minutos: sesion.minutosPlanificados,
			minutosPlanificados: sesion.minutosPlanificados,
			iniciadaEn: new Date(sesion.iniciadaEn).toISOString(),
			finalizadaEn: ahora.toISOString(),
			localDate: fechaLocal(ahora, sesion.bloque.zonaHoraria),
			deviceId: this.deviceId,
		};

		const bloqueTermina = estado === "skipped" || restanteBloque(sesion.bloque, ahoraMs) < 60;

		if (bloqueTermina) {
			await this.repo.guardarCierre(registro, null);
			return {
				registro,
				sesion: null,
				bloqueCompletado: true,
				bloque: sesion.bloque,
			};
		}

		const siguiente = crearSesionFocus({ bloque: sesion.bloque, ahora: ahoraMs });
		await this.repo.guardarCierre(registro, siguiente);

		return {
			registro,
			sesion: siguiente,
			bloqueCompletado: false,
			bloque: sesion.bloque,
		};
	}

	async saltarBreak(sesion: SesionActiva): Promise<ResultadoCompletarBreak> {
		if (sesion.modo === "focus") {
			throw new Error("La sesión activa no es un descanso");
		}

		const ahora = this.clock.now();
		const ahoraMs = ahora.getTime();
		const registro: RegistroBreak = {
			id: crypto.randomUUID(),
			bloqueId: sesion.bloque.id,
			tipo: sesion.modo,
			estado: "skipped",
			minutos: minutosTranscurridos(sesion, ahoraMs),
			minutosPlanificados: sesion.minutosPlanificados,
			iniciadaEn: new Date(sesion.iniciadaEn).toISOString(),
			finalizadaEn: ahora.toISOString(),
			localDate: fechaLocal(ahora, sesion.bloque.zonaHoraria),
			deviceId: this.deviceId,
		};

		if (restanteBloque(sesion.bloque, ahoraMs) < 60) {
			await this.repo.guardarCierre(registro, null);
			return {
				registro,
				sesion: null,
				bloqueCompletado: true,
				bloque: sesion.bloque,
			};
		}

		const siguiente = crearSesionFocus({ bloque: sesion.bloque, ahora: ahoraMs });
		await this.repo.guardarCierre(registro, siguiente);

		return {
			registro,
			sesion: siguiente,
			bloqueCompletado: false,
			bloque: sesion.bloque,
		};
	}

	// Cancelar termina el bloque completo. Si pasó menos de 1 min, no registra.
	async cancelar(sesion: SesionActiva): Promise<ResultadoCancelar> {
		const ahora = this.clock.now();
		const minutos = minutosTranscurridos(sesion, ahora.getTime());

		if (sesion.modo === "focus") {
			const registro: RegistroPomodoro | null =
				minutos >= 1
					? {
							id: crypto.randomUUID(),
							bloqueId: sesion.bloque.id,
							tareaId: null,
							tareaNombre: null,
							minutos,
							minutosPlanificados: sesion.minutosPlanificados,
							estado: "interrupted",
							iniciadaEn: new Date(sesion.iniciadaEn).toISOString(),
							finalizadaEn: ahora.toISOString(),
							localDate: fechaLocal(ahora, sesion.bloque.zonaHoraria),
							ciclo: sesion.bloque.ciclosCompletados + 1,
							deviceId: this.deviceId,
						}
					: null;

			if (registro) {
				await this.repo.guardarCierre(registro, null);
			} else {
				await this.repo.limpiarSesion();
			}

			return registro;
		}

		const registro: RegistroBreak | null =
			minutos >= 1
				? {
						id: crypto.randomUUID(),
						bloqueId: sesion.bloque.id,
						tipo: sesion.modo,
						estado: "skipped",
						minutos,
						minutosPlanificados: sesion.minutosPlanificados,
						iniciadaEn: new Date(sesion.iniciadaEn).toISOString(),
						finalizadaEn: ahora.toISOString(),
						localDate: fechaLocal(ahora, sesion.bloque.zonaHoraria),
						deviceId: this.deviceId,
					}
				: null;

		if (registro) {
			await this.repo.guardarCierre(registro, null);
		} else {
			await this.repo.limpiarSesion();
		}

		return registro;
	}

	async descartar(): Promise<void> {
		await this.repo.limpiarSesion();
	}
}

export { DURACIONES };
