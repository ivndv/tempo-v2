import type { EstadisticasRepository } from "../domain/EstadisticasRepository";

export class ObtenerEstadisticasHoy {
	constructor(private readonly estadisticas: EstadisticasRepository) {}

	execute() {
		return this.estadisticas.obtenerHoy();
	}
}
