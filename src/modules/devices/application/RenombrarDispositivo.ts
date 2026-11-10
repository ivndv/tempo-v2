import type { DispositivoRepository } from "../domain/DispositivoRepository";

export class RenombrarDispositivo {
	constructor(private readonly dispositivos: DispositivoRepository) {}

	execute(id: string, nombre: string): Promise<void> {
		return this.dispositivos.renombrar(id, nombre);
	}
}
