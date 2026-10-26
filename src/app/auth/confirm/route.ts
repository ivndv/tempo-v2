import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/modules/security/rate-limit/application/checkRateLimit";
import { createClient } from "@/shared/infrastructure/supabase/server";

// Confirma links de email (verificación o recuperación) y deja la sesión en cookies.
export async function GET(request: NextRequest) {
	const limite = await checkRateLimit(request, {
		route: "/auth/confirm",
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
	const tokenHash = searchParams.get("token_hash");
	const type = searchParams.get("type") as EmailOtpType | null;
	const requestedNext = searchParams.get("next") ?? "/app";
	const next = requestedNext.startsWith("/") ? requestedNext : "/app";

	const supabase = await createClient();

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			return NextResponse.redirect(`${origin}${next}`);
		}
	}

	if (tokenHash && type) {
		const { error } = await supabase.auth.verifyOtp({
			type,
			token_hash: tokenHash,
		});
		if (!error) {
			return NextResponse.redirect(`${origin}${next}`);
		}
	}

	return NextResponse.redirect(`${origin}/login?error=auth`);
}
