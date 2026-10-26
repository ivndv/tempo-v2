export interface RateLimitRule {
	limit: number;
	windowSeconds: number;
}

export interface RateLimitResult {
	allowed: boolean;
	limit: number;
	remaining: number;
	resetAt: number;
	retryAfter: number;
}

export interface RateLimiter {
	limit(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}
