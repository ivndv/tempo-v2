import type { SuscripcionRepository, SuscripcionResumen } from "../domain/suscripcion";

export class ObtenerSuscripcion {
	constructor(private readonly suscripciones: SuscripcionRepository) {}

	execute(): Promise<SuscripcionResumen> {
		return this.suscripciones.obtener();
	}
}
