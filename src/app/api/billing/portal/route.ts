import { CustomerPortal } from "@polar-sh/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import {
	obtenerAccessTokenPolar,
	obtenerEntornoPolar,
} from "@/modules/billing/infrastructure/polarConfig";
import { getServerContainer } from "@/shared/infrastructure/container";
import { getUsuarioActual } from "@/shared/infrastructure/getUsuarioActual";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const usuario = await getUsuarioActual();

	if (!usuario) {
		return NextResponse.redirect(new URL("/login?next=/app/settings?tab=billing", request.url));
	}

	try {
		const contenedor = await getServerContainer();
		const suscripcion = await contenedor.billing.suscripcion.execute();

		if (!suscripcion.hasSubscription || !suscripcion.hasCustomer) {
			return NextResponse.redirect(new URL("/pricing", request.url));
		}

		const origin = new URL(request.url).origin;
		const handler = CustomerPortal({
			accessToken: obtenerAccessTokenPolar(),
			getExternalCustomerId: async () => usuario.id,
			returnUrl: `${origin}/app/settings?tab=billing`,
			environment: obtenerEntornoPolar(),
		});

		return handler(request);
	} catch (error) {
		console.error("[billing] error abriendo portal", error);
		return NextResponse.json({ error: "No se pudo abrir el portal" }, { status: 503 });
	}
}
