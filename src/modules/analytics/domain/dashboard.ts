export interface PeriodoResumen {
	focusMinutes: number;
	completed: number;
	interrupted: number;
}

export interface DiaResumen {
	date: string;
	focusMinutes: number;
	completed: number;
	interrupted: number;
}

export interface TareaResumen {
	tareaId: string;
	nombre: string;
	focusMinutes: number;
}

export interface DispositivoResumen {
	deviceId: string;
	nombre: string;
	focusMinutes: number;
	completed: number;
}

export interface RachaResumen {
	current: number;
	longest: number;
}

export interface DiaRecord {
	date: string;
	focusMinutes: number;
}

export interface SemanaRecord {
	weekStart: string;
	focusMinutes: number;
}

export interface OpcionesDashboard {
	dias?: number;
	deviceId?: string | null;
}

export interface DashboardResumen {
	today: PeriodoResumen;
	week: PeriodoResumen;
	month: PeriodoResumen;
	allTime: PeriodoResumen;
	previousWeek: PeriodoResumen;
	daily: DiaResumen[];
	byTask: TareaResumen[];
	devices: DispositivoResumen[];
	streak: RachaResumen;
	bestDay: DiaRecord | null;
	bestWeek: SemanaRecord | null;
	longestSession: number;
}
