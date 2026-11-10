import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/shared/infrastructure/db/database.types";
import type { BillingEventRepository, EventoPolar } from "../domain/BillingEventRepository";
import type { CambioSuscripcionPolar } from "../domain/polarEvent";

export class SupabaseBillingEventRepository implements BillingEventRepository {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async registrar(evento: EventoPolar): Promise<boolean> {
		const { data, error } = await this.supabase.rpc("record_billing_event", {
			p_event_id: evento.id,
			p_event_type: evento.type,
			p_event_at: evento.timestamp,
			p_payload: evento.payload as Json,
		});

		if (error) {
			throw new Error(`No se pudo registrar el evento de Polar: ${error.message}`);
		}

		return Boolean(data);
	}

	async aplicar(cambio: CambioSuscripcionPolar, evento: EventoPolar): Promise<boolean> {
		const { data, error } = await this.supabase.rpc("apply_polar_subscription_event", {
			p_event_id: evento.id,
			p_event_type: evento.type,
			p_event_at: cambio.eventAt,
			p_payload: evento.payload as Json,
			p_user_id: cambio.userId,
			p_status: cambio.status,
			p_customer_id: cambio.customerId ?? undefined,
			p_subscription_id: cambio.subscriptionId,
			p_current_period_end: cambio.currentPeriodEnd ?? undefined,
			p_cancel_at_period_end: cambio.cancelAtPeriodEnd,
		});

		if (error) {
			throw new Error(`No se pudo aplicar el evento de Polar: ${error.message}`);
		}

		return Boolean(data);
	}
}
