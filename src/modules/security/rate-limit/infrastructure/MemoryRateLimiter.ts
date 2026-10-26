import type { RateLimiter, RateLimitResult, RateLimitRule } from "../domain/RateLimiter";

interface Bucket {
	count: number;
	resetAt: number;
}

// Limiter de ventana fija para desarrollo/tests. No usar en producción.
export class MemoryRateLimiter implements RateLimiter {
	private readonly buckets = new Map<string, Bucket>();

	constructor(private readonly ahora: () => number = Date.now) {}

	async limit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
		const ahora = this.ahora();
		const reinicio = ahora + rule.windowSeconds * 1000;
		const actual = this.buckets.get(key);
		const bucket: Bucket =
			!actual || actual.resetAt <= ahora
				? { count: 1, resetAt: reinicio }
				: { ...actual, count: actual.count + 1 };

		this.buckets.set(key, bucket);

		if (this.buckets.size > 10_000) {
			for (const [clave, valor] of this.buckets) {
				if (valor.resetAt <= ahora) this.buckets.delete(clave);
			}
		}

		const retryAfter = Math.max(0, Math.ceil((bucket.resetAt - ahora) / 1000));

		return {
			allowed: bucket.count <= rule.limit,
			limit: rule.limit,
			remaining: Math.max(0, rule.limit - bucket.count),
			resetAt: bucket.resetAt,
			retryAfter: bucket.count <= rule.limit ? 0 : retryAfter,
		};
	}
}
