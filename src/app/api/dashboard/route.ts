import { type NextRequest, NextResponse } from "next/server";
import { getServerContainer } from "@/shared/infrastructure/container";
import { getUsuarioActual } from "@/shared/infrastructure/getUsuarioActual";

const RANGOS = new Set([7, 30, 90, 365, 730, 0]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const usuario = await getUsuarioActual();

	if (!usuario) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const rangoBruto = Number(searchParams.get("range") ?? "30");
	const rango = RANGOS.has(rangoBruto) ? rangoBruto : 30;
	const deviceBruto = searchParams.get("device");
	const deviceId = deviceBruto && deviceBruto.length > 0 ? deviceBruto : null;

	const contenedor = await getServerContainer();
	const plan = await contenedor.billing.plan.execute();

	if (plan !== "pro") {
		return NextResponse.json({ error: "Se requiere plan Pro" }, { status: 403 });
	}

	try {
		const datos = await contenedor.analytics.dashboard.execute({
			dias: rango,
			deviceId,
		});

		return NextResponse.json(datos, {
			headers: {
				"Cache-Control": "private, no-store",
			},
		});
	} catch (cause: unknown) {
		const mensaje = cause instanceof Error ? cause.message : "Error al cargar el dashboard";
		const status = mensaje.includes("dispositivo inválido") ? 400 : 500;

		return NextResponse.json({ error: mensaje }, { status });
	}
}
