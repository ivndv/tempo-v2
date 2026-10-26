import type { TareaRepository } from "../domain/TareaRepository";

export class EliminarTarea {
	constructor(private readonly tareas: TareaRepository) {}

	execute(id: string) {
		return this.tareas.eliminar(id);
	}
}
