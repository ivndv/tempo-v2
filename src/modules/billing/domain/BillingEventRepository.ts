import type { CambioSuscripcionPolar } from "./polarEvent";

export interface EventoPolar {
	id: string;
	type: string;
	timestamp: string;
	payload: unknown;
}

export interface BillingEventRepository {
	registrar(evento: EventoPolar): Promise<boolean>;
	aplicar(cambio: CambioSuscripcionPolar, evento: EventoPolar): Promise<boolean>;
}
