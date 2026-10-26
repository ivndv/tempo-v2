export interface EstadisticasHoy {
	focusMinutos: number;
	pomodorosCompletados: number;
	pomodorosInterrumpidos: number;
	breaksCortosMinutos: number;
	breaksLargosMinutos: number;
	breaksCompletados: number;
	breaksSaltados: number;
}

export interface DiaResumen {
	fecha: string;
	minutos: number;
	sesiones: number;
}

export const ESTADISTICAS_HOY_VACIAS: EstadisticasHoy = {
	focusMinutos: 0,
	pomodorosCompletados: 0,
	pomodorosInterrumpidos: 0,
	breaksCortosMinutos: 0,
	breaksLargosMinutos: 0,
	breaksCompletados: 0,
	breaksSaltados: 0,
};
