export const DURACIONES = {
	focus: 25,
	short: 5,
	long: 30,
} as const;

export const BLOQUES = [
	{ duracionMinutos: 30, etiqueta: "30 min" },
	{ duracionMinutos: 60, etiqueta: "1 h" },
	{ duracionMinutos: 120, etiqueta: "2 h" },
	{ duracionMinutos: 180, etiqueta: "3 h" },
	{ duracionMinutos: 240, etiqueta: "4 h" },
	{ duracionMinutos: 300, etiqueta: "5 h" },
	{ duracionMinutos: 360, etiqueta: "6 h" },
] as const;

export type Modo = keyof typeof DURACIONES;
export type TipoBreak = "short" | "long";
export type EstadoRegistro = "completed" | "completed_early" | "interrupted" | "skipped";

export interface BloqueActivo {
	id: string;
	duracionMinutos: number;
	iniciadoEn: number;
	finPrevisto: number;
	restanteAlPausar: number | null;
	ciclosCompletados: number;
	focoAcumuladoMin: number;
	zonaHoraria: string;
}

export interface SesionActiva {
	id: string;
	bloque: BloqueActivo;
	modo: Modo;
	minutosPlanificados: number;
	iniciadaEn: number;
	finPrevisto: number;
	restanteAlPausar: number | null;
	// La fase se recortó porque el bloque terminó antes.
	cortadaPorBloque: boolean;
}

export interface RegistroPomodoro {
	id: string;
	bloqueId: string;
	tareaId: string | null;
	tareaNombre: string | null;
	minutos: number;
	minutosPlanificados: number;
	estado: "completed" | "completed_early" | "interrupted";
	iniciadaEn: string;
	finalizadaEn: string;
	localDate: string;
	ciclo: number;
	deviceId: string;
}

export interface RegistroBreak {
	id: string;
	bloqueId: string;
	tipo: TipoBreak;
	estado: "completed" | "skipped";
	minutos: number;
	minutosPlanificados: number;
	iniciadaEn: string;
	finalizadaEn: string;
	localDate: string;
	deviceId: string;
}

export function crearBloque(input: {
	duracionMinutos: number;
	zonaHoraria?: string;
	ahora?: number;
}): BloqueActivo {
	const ahora = input.ahora ?? Date.now();

	return {
		id: crypto.randomUUID(),
		duracionMinutos: input.duracionMinutos,
		iniciadoEn: ahora,
		finPrevisto: ahora + input.duracionMinutos * 60_000,
		restanteAlPausar: null,
		ciclosCompletados: 0,
		focoAcumuladoMin: 0,
		zonaHoraria: input.zonaHoraria ?? "America/Mexico_City",
	};
}

export function totalSegundos(sesion: SesionActiva): number {
	return sesion.minutosPlanificados * 60;
}

export function estaPausada(sesion: SesionActiva): boolean {
	return sesion.restanteAlPausar !== null || sesion.bloque.restanteAlPausar !== null;
}

export function restanteSegundos(sesion: SesionActiva, ahora = Date.now()): number {
	if (sesion.restanteAlPausar !== null) {
		return Math.max(0, Math.ceil(sesion.restanteAlPausar));
	}

	return Math.max(0, Math.ceil((sesion.finPrevisto - ahora) / 1000));
}

export function restanteBloque(bloque: BloqueActivo, ahora = Date.now()): number {
	if (bloque.restanteAlPausar !== null) {
		return Math.max(0, Math.ceil(bloque.restanteAlPausar));
	}

	return Math.max(0, Math.ceil((bloque.finPrevisto - ahora) / 1000));
}

export function minutosTranscurridos(sesion: SesionActiva, ahora = Date.now()): number {
	const transcurridos = Math.max(0, totalSegundos(sesion) - restanteSegundos(sesion, ahora));
	return Math.min(sesion.minutosPlanificados, Math.max(0, Math.round(transcurridos / 60)));
}

export function crearSesionFocus(input: { bloque: BloqueActivo; ahora?: number }): SesionActiva {
	const ahora = input.ahora ?? Date.now();
	const disponible = restanteBloque(input.bloque, ahora);
	const minutos = Math.max(0, Math.min(DURACIONES.focus, Math.ceil(disponible / 60)));
	const cortadaPorBloque = disponible < DURACIONES.focus * 60;

	return {
		id: crypto.randomUUID(),
		bloque: input.bloque,
		modo: "focus",
		minutosPlanificados: minutos,
		iniciadaEn: ahora,
		finPrevisto: ahora + minutos * 60_000,
		restanteAlPausar: null,
		cortadaPorBloque,
	};
}

export function crearSesionBreak(input: {
	bloque: BloqueActivo;
	tipo: TipoBreak;
	ahora?: number;
}): SesionActiva {
	const ahora = input.ahora ?? Date.now();
	const disponible = restanteBloque(input.bloque, ahora);
	const nominal = DURACIONES[input.tipo];
	const minutos = Math.max(0, Math.min(nominal, Math.ceil(disponible / 60)));
	const cortadaPorBloque = disponible < nominal * 60;

	return {
		id: crypto.randomUUID(),
		bloque: input.bloque,
		modo: input.tipo,
		minutosPlanificados: minutos,
		iniciadaEn: ahora,
		finPrevisto: ahora + minutos * 60_000,
		restanteAlPausar: null,
		cortadaPorBloque,
	};
}

export function pausarSesion(sesion: SesionActiva, ahora = Date.now()): SesionActiva {
	return {
		...sesion,
		bloque: {
			...sesion.bloque,
			restanteAlPausar: restanteBloque(sesion.bloque, ahora),
		},
		restanteAlPausar: restanteSegundos(sesion, ahora),
	};
}

export function reanudarSesion(sesion: SesionActiva, ahora = Date.now()): SesionActiva {
	const restanteFase = sesion.restanteAlPausar ?? restanteSegundos(sesion, ahora);
	const restanteSesion = sesion.bloque.restanteAlPausar ?? restanteBloque(sesion.bloque, ahora);

	return {
		...sesion,
		restanteAlPausar: null,
		finPrevisto: ahora + restanteFase * 1000,
		bloque: {
			...sesion.bloque,
			restanteAlPausar: null,
			finPrevisto: ahora + restanteSesion * 1000,
		},
	};
}

export function tipoBreakParaCiclo(ciclo: number): TipoBreak {
	return ciclo % 4 === 0 ? "long" : "short";
}

export function fechaLocal(ahora = new Date(), zonaHoraria = "America/Mexico_City"): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: zonaHoraria,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(ahora);
}
