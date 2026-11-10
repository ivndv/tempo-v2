import type { DispositivoRepository } from "../domain/DispositivoRepository";

export class EliminarDispositivo {
	constructor(private readonly dispositivos: DispositivoRepository) {}

	execute(id: string): Promise<void> {
		return this.dispositivos.eliminar(id);
	}
}
