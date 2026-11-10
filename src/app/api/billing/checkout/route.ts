import { Checkout } from "@polar-sh/nextjs";
import { NextRequest, NextResponse } from "next/server";
import {
	obtenerAccessTokenPolar,
	obtenerEntornoPolar,
	obtenerProductoPolar,
} from "@/modules/billing/infrastructure/polarConfig";
import { getServerContainer } from "@/shared/infrastructure/container";
import { getUsuarioActual } from "@/shared/infrastructure/getUsuarioActual";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const usuario = await getUsuarioActual();

	if (!usuario) {
		return NextResponse.redirect(new URL("/login?next=/pricing", request.url));
	}

	try {
		const contenedor = await getServerContainer();
		const suscripcion = await contenedor.billing.suscripcion.execute();

		if (
			suscripcion.hasSubscription &&
			suscripcion.hasCustomer &&
			(suscripcion.plan === "pro" ||
				suscripcion.status === "past_due" ||
				suscripcion.status === "paused")
		) {
			return NextResponse.redirect(new URL("/api/billing/portal", request.url));
		}

		const accessToken = obtenerAccessTokenPolar();
		const productId = obtenerProductoPolar();
		const origin = new URL(request.url).origin;
		const handler = Checkout({
			accessToken,
			successUrl: `${origin}/app/settings?tab=billing&checkout=success`,
			returnUrl: `${origin}/pricing`,
			environment: obtenerEntornoPolar(),
		});

		const url = new URL(request.url);
		url.search = "";
		url.searchParams.set("products", productId);
		url.searchParams.set("external_customer_id", usuario.id);
		url.searchParams.set("customer_email", usuario.email);

		return handler(new NextRequest(url, { headers: request.headers }));
	} catch (error) {
		console.error("[billing] error creando checkout", error);
		return NextResponse.json({ error: "No se pudo iniciar el checkout" }, { status: 503 });
	}
}
