import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";
import { esPlanProActivo } from "../domain/planPolicy";
import {
	ESTADOS_SUSCRIPCION,
	type EstadoSuscripcion,
	SUSCRIPCION_VACIA,
	type SuscripcionRepository,
	type SuscripcionResumen,
} from "../domain/suscripcion";

function estado(value: string | null): EstadoSuscripcion | null {
	if (!value) {
		return null;
	}

	return (ESTADOS_SUSCRIPCION as readonly string[]).includes(value)
		? (value as EstadoSuscripcion)
		: null;
}

export class SupabaseSuscripcionRepository implements SuscripcionRepository {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async obtener(): Promise<SuscripcionResumen> {
		const { data, error } = await this.supabase
			.from("subscriptions")
			.select("plan, status, current_period_end, cancel_at_period_end, provider_customer_id")
			.maybeSingle();

		if (error || !data) {
			return SUSCRIPCION_VACIA;
		}

		const activo = esPlanProActivo({
			plan: data.plan,
			status: data.status,
			currentPeriodEnd: data.current_period_end,
		});

		return {
			plan: activo ? "pro" : "free",
			status: estado(data.status),
			currentPeriodEnd: data.current_period_end,
			cancelAtPeriodEnd: data.cancel_at_period_end,
			hasSubscription: true,
			hasCustomer: Boolean(data.provider_customer_id),
		};
	}
}
