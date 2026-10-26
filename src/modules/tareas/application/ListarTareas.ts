import type { TareaRepository } from "../domain/TareaRepository";

export class ListarTareas {
	constructor(private readonly tareas: TareaRepository) {}

	execute() {
		return this.tareas.listar();
	}
}
