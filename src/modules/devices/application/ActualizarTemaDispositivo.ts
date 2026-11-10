import type { DispositivoRepository } from "../domain/DispositivoRepository";

export class ActualizarTemaDispositivo {
	constructor(private readonly dispositivos: DispositivoRepository) {}

	execute(id: string, tema: string): Promise<void> {
		return this.dispositivos.actualizarTema(id, tema);
	}
}
