import type { DispositivoRepository } from "../domain/DispositivoRepository";
import type { Dispositivo } from "../domain/dispositivo";

export class ListarDispositivos {
	constructor(private readonly dispositivos: DispositivoRepository) {}

	execute(): Promise<Dispositivo[]> {
		return this.dispositivos.listar();
	}
}
