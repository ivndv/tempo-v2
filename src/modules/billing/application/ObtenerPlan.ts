import type { PlanRepository } from "../domain/PlanRepository";
import type { Plan } from "../domain/plan";

export class ObtenerPlan {
	constructor(private readonly planes: PlanRepository) {}

	execute(): Promise<Plan> {
		return this.planes.obtener();
	}
}
