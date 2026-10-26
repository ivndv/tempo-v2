import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/modules/security/rate-limit/application/checkRateLimit";
import { createClient } from "@/shared/infrastructure/supabase/server";

export async function GET(request: NextRequest) {
	const limite = await checkRateLimit(request, {
		route: "/auth/callback",
		rule: { limit: 30, windowSeconds: 60 },
	});

	if (!limite.resultado.allowed) {
		return NextResponse.json(
			{ error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
			{ status: 429, headers: limite.headers },
		);
	}

	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");
	const nextParam = searchParams.get("next") ?? "/app";
	const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/app";

	if (code) {
		const supabase = await createClient();
		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			return NextResponse.redirect(`${origin}${next}`);
		}
	}

	return NextResponse.redirect(`${origin}/login?error=auth`);
}
