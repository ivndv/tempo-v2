import { checkRateLimit } from "@/modules/security/rate-limit/application/checkRateLimit";

export async function GET(request: Request) {
	const { resultado, headers } = await checkRateLimit(request, {
		route: "/api/health",
		rule: { limit: 120, windowSeconds: 60 },
	});

	if (!resultado.allowed) {
		return Response.json(
			{ error: "Demasiadas peticiones. Intenta de nuevo en un minuto." },
			{ status: 429, headers },
		);
	}

	return Response.json({ ok: true, timestamp: new Date().toISOString() }, { headers });
}
