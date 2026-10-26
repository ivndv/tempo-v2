import type { DiaResumen, EstadisticasHoy } from "./estadisticas";

export interface EstadisticasRepository {
	obtenerHoy(): Promise<EstadisticasHoy>;
	obtenerUltimosDias(dias: number): Promise<DiaResumen[]>;
}
