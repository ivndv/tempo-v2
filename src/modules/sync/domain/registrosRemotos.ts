export interface PomodoroRemoto {
	id: string;
	bloqueId: string | null;
	tareaId: string | null;
	status: string;
	minutesPlanned: number;
	minutesActual: number | null;
	localDate: string;
	createdAt: string;
	updatedAt: string;
	startedAt: string | null;
	endedAt: string | null;
	cyclePosition: number | null;
	deviceId: string | null;
}

export interface BreakRemoto {
	id: string;
	bloqueId: string | null;
	tipo: string;
	status: string;
	minutesPlanned: number;
	minutesActual: number | null;
	localDate: string;
	createdAt: string;
	updatedAt: string;
	startedAt: string | null;
	endedAt: string | null;
	deviceId: string | null;
}
