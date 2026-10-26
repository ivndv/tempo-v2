import type { RegistroBreak, RegistroPomodoro, SesionActiva } from "./pomodoro";

export interface TimerRepository {
	obtenerSesion(): Promise<SesionActiva | null>;
	guardarSesion(sesion: SesionActiva): Promise<void>;
	limpiarSesion(): Promise<void>;
	guardarCierre(
		registro: RegistroPomodoro | RegistroBreak,
		siguiente: SesionActiva | null,
	): Promise<void>;
	obtenerPendiente(tareaId: string): Promise<number | null>;
	guardarPendiente(tareaId: string, segundos: number): Promise<void>;
	limpiarPendiente(tareaId: string): Promise<void>;
}
