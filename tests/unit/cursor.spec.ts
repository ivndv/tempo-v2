import { describe, expect, it } from "vitest";
import { despuesDe } from "@/modules/sync/infrastructure/SupabaseSyncGateway";

describe("despuesDe", () => {
	it("incluye todo cuando no hay cursor", () => {
		expect(despuesDe("2026-10-25T10:00:00.000Z", "a", null)).toBe(true);
	});

	it("incluye filas con el mismo updated_at pero id mayor", () => {
		const cursor = { updatedAt: "2026-10-25T10:00:00.000Z", id: "b" };

		expect(despuesDe("2026-10-25T10:00:00.000Z", "c", cursor)).toBe(true);
		expect(despuesDe("2026-10-25T10:00:00.000Z", "a", cursor)).toBe(false);
		expect(despuesDe("2026-10-25T10:00:00.000Z", "b", cursor)).toBe(false);
	});

	it("incluye filas más nuevas por fecha", () => {
		expect(
			despuesDe("2026-10-25T11:00:00.000Z", "a", {
				updatedAt: "2026-10-25T10:00:00.000Z",
				id: "z",
			}),
		).toBe(true);
	});
});
