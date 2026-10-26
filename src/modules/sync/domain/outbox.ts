export type OutboxEntity = "tarea" | "pomodoro" | "break";
export type OutboxOperation = "upsert" | "delete";
export type OutboxStatus = "pending" | "syncing" | "failed" | "dead";

export interface TareaSyncPayload {
	id: string;
	nombre: string;
	estado: string;
	createdAt: string;
	completedAt: string | null;
	deletedAt: string | null;
	bloqueId: string | null;
	creadaEnFocusId: string | null;
	completadaEnFocusId: string | null;
	eliminadaEnFocusId: string | null;
	clientUpdatedAt: string;
	deviceId: string;
}

export interface PomodoroSyncPayload {
	id: string;
	bloqueId: string;
	tareaId: string | null;
	status: string;
	minutesPlanned: number;
	minutesActual: number | null;
	localDate: string;
	createdAt: string;
	startedAt: string;
	endedAt: string;
	cyclePosition: number;
	deviceId: string;
}

export interface BreakSyncPayload {
	id: string;
	bloqueId: string;
	tipo: string;
	status: string;
	minutesPlanned: number;
	minutesActual: number | null;
	localDate: string;
	createdAt: string;
	startedAt: string;
	endedAt: string;
	deviceId: string;
}

export type OutboxPayload =
	| TareaSyncPayload
	| PomodoroSyncPayload
	| BreakSyncPayload
	| { id: string };

export interface OutboxItem {
	id: string;
	entity: OutboxEntity;
	operation: OutboxOperation;
	payload: OutboxPayload;
	status: OutboxStatus;
	attempts: number;
	lastError: string | null;
	createdAt: string;
	nextAttemptAt: string;
	leaseUntil?: string;
}

export interface NuevoOutboxItem {
	entity: OutboxEntity;
	operation: OutboxOperation;
	payload: OutboxPayload;
}

export interface ResultadoSync {
	subidos: number;
	fallidos: number;
	pendientes: number;
	muertos: number;
}

// Respuesta de la RPC que aplica un upsert de tarea en el servidor.
export type ResultadoSubidaTarea = "inserted" | "applied" | "stale" | "deleted";
