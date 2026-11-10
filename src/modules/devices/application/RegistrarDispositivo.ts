import type {
	DatosRegistroDispositivo,
	DispositivoRepository,
	ResultadoRegistroDispositivo,
} from "../domain/DispositivoRepository";

export class RegistrarDispositivo {
	constructor(private readonly dispositivos: DispositivoRepository) {}

	execute(datos: DatosRegistroDispositivo): Promise<ResultadoRegistroDispositivo> {
		return this.dispositivos.registrar(datos);
	}
}
