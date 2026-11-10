import type { BillingEventRepository, EventoPolar } from "../domain/BillingEventRepository";
import type { CambioSuscripcionPolar } from "../domain/polarEvent";

export class ProcesarEventoPolar {
	constructor(private readonly eventos: BillingEventRepository) {}

	execute(evento: EventoPolar, cambio: CambioSuscripcionPolar | null): Promise<boolean> {
		return cambio ? this.eventos.aplicar(cambio, evento) : this.eventos.registrar(evento);
	}
}
