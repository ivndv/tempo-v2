import { webhooks } from "@polar-sh/sdk/2026-10";
import { type NextRequest, NextResponse } from "next/server";
import { ProcesarEventoPolar } from "@/modules/billing/application/ProcesarEventoPolar";
import { obtenerWebhookSecretPolar } from "@/modules/billing/infrastructure/polarConfig";
import { mapearPayloadPolar } from "@/modules/billing/infrastructure/polarWebhook";
import { SupabaseBillingEventRepository } from "@/modules/billing/infrastructure/SupabaseBillingEventRepository";
import { createAdminClient } from "@/shared/infrastructure/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
	let secret: string;

	try {
		secret = obtenerWebhookSecretPolar();
	} catch {
		return NextResponse.json({ error: "Polar no configurado" }, { status: 503 });
	}

	const body = await request.text();
	let payload: webhooks.WebhookPayload;

	try {
		payload = await webhooks.validateEvent(
			body,
			Object.fromEntries(request.headers.entries()),
			secret,
		);
	} catch (error) {
		if (error instanceof webhooks.PolarWebhookVerificationError) {
			return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
		}

		if (error instanceof webhooks.PolarWebhookUnknownTypeError) {
			return NextResponse.json({ received: true });
		}

		return NextResponse.json({ error: "Webhook inválido" }, { status: 400 });
	}

	const eventId = request.headers.get("webhook-id") ?? `${payload.type}:${payload.timestamp}`;
	const { evento, cambio } = mapearPayloadPolar(payload, eventId);

	try {
		const procesar = new ProcesarEventoPolar(
			new SupabaseBillingEventRepository(createAdminClient()),
		);
		await procesar.execute(evento, cambio);

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("[billing] error procesando webhook de Polar", error);
		return NextResponse.json({ error: "No se pudo procesar el webhook" }, { status: 500 });
	}
}
