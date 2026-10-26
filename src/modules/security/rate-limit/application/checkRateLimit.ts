import type { RateLimitResult, RateLimitRule } from "../domain/RateLimiter";
import { getRateLimiter } from "../infrastructure/createRateLimiter";

interface CheckRateLimitOptions {
	route: string;
	rule: RateLimitRule;
	identifier?: string;
}

function ipDelRequest(request: Request): string {
	return (
		request.headers.get("cf-connecting-ip") ||
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		"unknown"
	);
}

export async function checkRateLimit(
	request: Request,
	opciones: CheckRateLimitOptions,
): Promise<{ resultado: RateLimitResult; headers: Record<string, string> }> {
	const identificador = opciones.identifier ?? ipDelRequest(request);
	const resultado = await getRateLimiter().limit(
		`${opciones.route}:${identificador}`,
		opciones.rule,
	);

	const resetAfter = Math.max(0, Math.ceil((resultado.resetAt - Date.now()) / 1000));

	const headers: Record<string, string> = {
		"RateLimit-Limit": String(resultado.limit),
		"RateLimit-Remaining": String(resultado.remaining),
		"RateLimit-Reset": String(resetAfter),
	};

	if (!resultado.allowed) {
		headers["Retry-After"] = String(resultado.retryAfter);
	}

	return { resultado, headers };
}
