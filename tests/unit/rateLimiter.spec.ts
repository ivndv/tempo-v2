import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "@/modules/security/rate-limit/infrastructure/MemoryRateLimiter";

describe("MemoryRateLimiter", () => {
	it("permite hasta el límite y bloquea el siguiente", async () => {
		let ahora = 1_000_000;
		const limiter = new MemoryRateLimiter(() => ahora);
		const regla = { limit: 2, windowSeconds: 60 };

		const primera = await limiter.limit("ip:1", regla);
		const segunda = await limiter.limit("ip:1", regla);
		const tercera = await limiter.limit("ip:1", regla);

		expect(primera.allowed).toBe(true);
		expect(segunda.allowed).toBe(true);
		expect(tercera.allowed).toBe(false);
		expect(tercera.remaining).toBe(0);
		expect(tercera.retryAfter).toBe(60);

		ahora += 60_000;
		const despues = await limiter.limit("ip:1", regla);
		expect(despues.allowed).toBe(true);
	});

	it("separa las llaves", async () => {
		const limiter = new MemoryRateLimiter(() => 1_000_000);
		const regla = { limit: 1, windowSeconds: 60 };

		const a = await limiter.limit("ip:1", regla);
		const b = await limiter.limit("ip:2", regla);

		expect(a.allowed).toBe(true);
		expect(b.allowed).toBe(true);
	});
});
