import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";
import type { PlanRepository } from "../domain/PlanRepository";
import type { Plan } from "../domain/plan";

export class SupabasePlanRepository implements PlanRepository {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async obtener(): Promise<Plan> {
		const { data, error } = await this.supabase
			.from("subscriptions")
			.select("plan, status")
			.maybeSingle();

		if (error) {
			return "free";
		}

		const activa = data?.status === "active" || data?.status === "trialing";

		return data?.plan === "pro" && activa ? "pro" : "free";
	}
}
