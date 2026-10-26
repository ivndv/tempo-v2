import "server-only";

import { Redis } from "@upstash/redis";
import type { RateLimiter } from "../domain/RateLimiter";
import { MemoryRateLimiter } from "./MemoryRateLimiter";
import { UpstashRateLimiter } from "./UpstashRateLimiter";

let instancia: RateLimiter | null = null;

function construir(): RateLimiter {
	const url = process.env.UPSTASH_REDIS_REST_URL;
	const token = process.env.UPSTASH_REDIS_REST_TOKEN;
	const entorno = process.env.APP_ENV ?? "local";
	const namespace = process.env.APP_NAMESPACE ?? "tempo";

	// Si hay credenciales, siempre usa Upstash (también en local).
	// La memoria queda solo como fallback si faltan credenciales.
	if (!url || !token) {
		return new MemoryRateLimiter();
	}

	const redis = new Redis({ url, token });

	return new UpstashRateLimiter(redis, `${namespace}:${entorno}:rl`, new MemoryRateLimiter());
}

export function getRateLimiter(): RateLimiter {
	instancia ??= construir();
	return instancia;
}
