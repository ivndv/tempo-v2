import type { Plan } from "../domain/plan";
import type { SuscripcionRepository } from "../domain/suscripcion";

export class ObtenerPlan {
	constructor(private readonly suscripciones: SuscripcionRepository) {}

	async execute(): Promise<Plan> {
		const suscripcion = await this.suscripciones.obtener();
		return suscripcion.plan;
	}
}
