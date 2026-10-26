import type { TareaRepository } from "../domain/TareaRepository";
import { validarNombreTarea } from "../domain/tarea";

export class CrearTarea {
	constructor(private readonly tareas: TareaRepository) {}

	execute(nombre: string) {
		return this.tareas.crear(validarNombreTarea(nombre));
	}
}
