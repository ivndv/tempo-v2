import type { EstadisticasRepository } from "../domain/EstadisticasRepository";

export class ObtenerUltimosDias {
	constructor(private readonly estadisticas: EstadisticasRepository) {}

	execute(dias: number) {
		return this.estadisticas.obtenerUltimosDias(dias);
	}
}
