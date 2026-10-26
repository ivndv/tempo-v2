import type { TareaRepository } from "../domain/TareaRepository";
import type { EstadoTarea } from "../domain/tarea";

export class CambiarEstadoTarea {
	constructor(private readonly tareas: TareaRepository) {}

	execute(id: string, estado: EstadoTarea) {
		return this.tareas.cambiarEstado(id, estado);
	}
}
