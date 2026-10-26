import { describe, expect, it } from "vitest";
import { PomodoroTimerService } from "@/modules/pomodoros/application/PomodoroTimerService";
import {
	crearSesionFocus,
	fechaLocal,
	pausarSesion,
	type RegistroBreak,
	type RegistroPomodoro,
	reanudarSesion,
	restanteSegundos,
	type SesionActiva,
} from "@/modules/pomodoros/domain/pomodoro";
import type { TimerRepository } from "@/modules/pomodoros/domain/TimerRepository";
import type { Clock } from "@/shared/domain/clock";

class FakeClock implements Clock {
	constructor(private tiempo: number) {}

	now(): Date {
		return new Date(this.tiempo);
	}

	avanzar(ms: number): void {
		this.tiempo += ms;
	}
}

class MemoryTimerRepository implements TimerRepository {
	sesion: SesionActiva | null = null;
	pomodoros: RegistroPomodoro[] = [];
	breaks: RegistroBreak[] = [];
	pendientes = new Map<string, number>();

	async obtenerSesion() {
		return this.sesion;
	}

	async guardarSesion(sesion: SesionActiva) {
		this.sesion = sesion;
	}

	async limpiarSesion() {
		this.sesion = null;
	}

	async guardarCierre(registro: RegistroPomodoro | RegistroBreak, siguiente: SesionActiva | null) {
		if ("ciclo" in registro) {
			this.pomodoros.push(registro);
		} else {
			this.breaks.push(registro);
		}

		this.sesion = siguiente;
	}

	async obtenerPendiente(tareaId: string) {
		return this.pendientes.get(tareaId) ?? null;
	}

	async guardarPendiente(tareaId: string, segundos: number) {
		this.pendientes.set(tareaId, segundos);
	}

	async limpiarPendiente(tareaId: string) {
		this.pendientes.delete(tareaId);
	}
}

function crearServicio(tiempoInicial = 1_000_000) {
	const repo = new MemoryTimerRepository();
	const clock = new FakeClock(tiempoInicial);
	return { repo, clock, servicio: new PomodoroTimerService(repo, clock) };
}

describe("PomodoroTimerService con bloques exactos", () => {
	it("un bloque de 30 min completa un focus y un break corto", async () => {
		const { clock, repo, servicio } = crearServicio();
		const focus = await servicio.iniciarBloque(30);

		expect(focus.minutosPlanificados).toBe(25);
		expect(focus.cortadaPorBloque).toBe(false);

		clock.avanzar(25 * 60_000);
		const resultado = await servicio.completarFocus(focus);

		expect(resultado.registro.estado).toBe("completed");
		expect(resultado.registro.tareaId).toBeNull();
		expect(resultado.sesion?.modo).toBe("short");

		if (!resultado.sesion) throw new Error("Falta el break");

		clock.avanzar(5 * 60_000);
		const fin = await servicio.completarBreak(resultado.sesion);

		expect(fin.registro.estado).toBe("completed");
		expect(fin.bloqueCompletado).toBe(true);
		expect(repo.pomodoros).toHaveLength(1);
		expect(repo.breaks).toHaveLength(1);
	});

	it("un bloque de 2 h corta el break largo a los 5 min que quedan", async () => {
		const { clock, servicio } = crearServicio();
		let sesion = await servicio.iniciarBloque(120);

		for (let ciclo = 1; ciclo <= 3; ciclo += 1) {
			clock.avanzar(25 * 60_000);
			const focus = await servicio.completarFocus(sesion);
			if (!focus.sesion) throw new Error("Falta break");

			clock.avanzar(5 * 60_000);
			const breakResult = await servicio.completarBreak(focus.sesion);
			if (!breakResult.sesion) throw new Error("Falta siguiente focus");
			sesion = breakResult.sesion;
		}

		clock.avanzar(25 * 60_000);
		const cuarto = await servicio.completarFocus(sesion);
		expect(cuarto.sesion?.modo).toBe("long");
		expect(cuarto.sesion?.minutosPlanificados).toBe(5);
		expect(cuarto.sesion?.cortadaPorBloque).toBe(true);

		if (!cuarto.sesion) throw new Error("Falta break largo");

		clock.avanzar(5 * 60_000);
		const fin = await servicio.completarBreak(cuarto.sesion);

		expect(fin.registro.estado).toBe("skipped");
		expect(fin.bloqueCompletado).toBe(true);
	});

	it("un focus cortado por fin de bloque se registra como completed_early", async () => {
		const { clock, repo, servicio } = crearServicio();
		const focus = await servicio.iniciarBloque(30);

		clock.avanzar(30 * 60_000);
		const resultado = await servicio.completarFocus({
			...focus,
			cortadaPorBloque: true,
			minutosPlanificados: 10,
		});

		expect(resultado.registro.estado).toBe("completed_early");
		expect(resultado.registro.minutos).toBe(10);
		expect(resultado.bloqueCompletado).toBe(true);
		expect(repo.pomodoros).toHaveLength(1);
	});

	it("cancelar antes del primer minuto no registra nada", async () => {
		const { servicio, repo } = crearServicio();
		const focus = await servicio.iniciarBloque(60);

		const registro = await servicio.cancelar(focus);

		expect(registro).toBeNull();
		expect(repo.pomodoros).toHaveLength(0);
		expect(repo.sesion).toBeNull();
	});

	it("permite saltar un break y pasar al siguiente focus", async () => {
		const { clock, servicio } = crearServicio();
		const focus = await servicio.iniciarBloque(60);
		clock.avanzar(25 * 60_000);
		const resultado = await servicio.completarFocus(focus);

		if (!resultado.sesion) throw new Error("Falta break");

		const saltado = await servicio.saltarBreak(resultado.sesion);

		expect(saltado.registro.estado).toBe("skipped");
		expect(saltado.bloqueCompletado).toBe(false);
		expect(saltado.sesion?.modo).toBe("focus");
	});

	it("pausa y reanuda tanto el focus como el bloque", () => {
		const clock = new FakeClock(1_000_000);
		const bloque = {
			id: "bloque-1",
			duracionMinutos: 60,
			iniciadoEn: 1_000_000,
			finPrevisto: 1_000_000 + 60 * 60_000,
			restanteAlPausar: null,
			ciclosCompletados: 0,
			focoAcumuladoMin: 0,
			zonaHoraria: "America/Mexico_City",
		};
		const focus = crearSesionFocus({ bloque, ahora: 1_000_000 });

		clock.avanzar(10 * 60_000);
		const pausada = pausarSesion(focus, clock.now().getTime());

		expect(pausada.restanteAlPausar).toBe(15 * 60);
		expect(pausada.bloque.restanteAlPausar).toBe(50 * 60);

		clock.avanzar(20 * 60_000);
		const reanudada = reanudarSesion(pausada, clock.now().getTime());

		expect(reanudada.restanteAlPausar).toBeNull();
		expect(reanudada.bloque.restanteAlPausar).toBeNull();
		expect(restanteSegundos(reanudada, clock.now().getTime())).toBe(15 * 60);
	});

	it("calcula localDate con la zona horaria del bloque", () => {
		const fecha = fechaLocal(new Date("2026-10-24T02:00:00.000Z"), "America/Mexico_City");
		expect(fecha).toBe("2026-10-23");
	});
});
