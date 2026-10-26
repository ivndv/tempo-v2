import type { Plan } from "./plan";

export interface PlanRepository {
	obtener(): Promise<Plan>;
}
