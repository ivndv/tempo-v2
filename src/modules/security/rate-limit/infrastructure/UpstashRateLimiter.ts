import { Ratelimit } from "@upstash/ratelimit";
import type { Redis } from "@upstash/redis";
import type { RateLimiter, RateLimitResult, RateLimitRule } from "../domain/RateLimiter";

export class UpstashRateLimiter implements RateLimiter {
	private readonly limiters = new Map<string, Ratelimit>();

	constructor(
		private readonly redis: Redis,
		private readonly prefix: string,
		private readonly fallback?: RateLimiter,
	) {}

	async limit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
		try {
			const limiter = this.obtenerLimiter(rule);
			const resultado = await limiter.limit(key);
			const ahora = Date.now();

			return {
				allowed: resultado.success,
				limit: resultado.limit,
				remaining: resultado.remaining,
				resetAt: resultado.reset,
				retryAfter: resultado.success
					? 0
					: Math.max(0, Math.ceil((resultado.reset - ahora) / 1000)),
			};
		} catch (error) {
			if (this.fallback) {
				return this.fallback.limit(key, rule);
			}

			throw error;
		}
	}

	private obtenerLimiter(rule: RateLimitRule): Ratelimit {
		const cacheKey = `${rule.limit}:${rule.windowSeconds}`;
		const existente = this.limiters.get(cacheKey);
		if (existente) return existente;

		const limiter = new Ratelimit({
			redis: this.redis,
			limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSeconds} s`),
			prefix: this.prefix,
			timeout: 1500,
		});

		this.limiters.set(cacheKey, limiter);
		return limiter;
	}
}
