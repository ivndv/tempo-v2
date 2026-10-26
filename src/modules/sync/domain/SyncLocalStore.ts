import type { CursorSync, EntidadSync } from "./cursor";
import type { BreakRemoto, PomodoroRemoto } from "./registrosRemotos";
import type { TareaRemota } from "./tareaRemota";

export interface SyncLocalStore {
	listarTareaIdsPendientes(): Promise<Set<string>>;
	aplicarTareas(remotas: TareaRemota[]): Promise<void>;
	aplicarPomodoros(remotos: PomodoroRemoto[]): Promise<void>;
	aplicarBreaks(remotos: BreakRemoto[]): Promise<void>;
	leerCursor(entidad: EntidadSync): Promise<CursorSync | null>;
	guardarCursor(entidad: EntidadSync, cursor: CursorSync | null): Promise<void>;
	purgarTombstonesLocales(dias: number): Promise<number>;
}
