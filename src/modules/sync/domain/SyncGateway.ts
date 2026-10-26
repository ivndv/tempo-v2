import type { CursorSync } from "./cursor";
import type {
	BreakSyncPayload,
	PomodoroSyncPayload,
	ResultadoSubidaTarea,
	TareaSyncPayload,
} from "./outbox";
import type { BreakRemoto, PomodoroRemoto } from "./registrosRemotos";
import type { TareaRemota } from "./tareaRemota";

export interface SyncGateway {
	tieneSesion(): Promise<boolean>;
	descargarTareas(desde: CursorSync | null): Promise<TareaRemota[]>;
	descargarPomodoros(desde: CursorSync | null): Promise<PomodoroRemoto[]>;
	descargarBreaks(desde: CursorSync | null): Promise<BreakRemoto[]>;
	subirTarea(payload: TareaSyncPayload): Promise<ResultadoSubidaTarea>;
	eliminarTarea(id: string): Promise<void>;
	subirPomodoro(payload: PomodoroSyncPayload): Promise<void>;
	subirBreak(payload: BreakSyncPayload): Promise<void>;
}
