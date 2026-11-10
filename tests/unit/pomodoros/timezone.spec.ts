import { describe, expect, it } from "vitest";
import { fechaLocal } from "@/modules/pomodoros/domain/pomodoro";

describe("fechaLocal", () => {
	it("usa la zona horaria del perfil", () => {
		const instante = new Date("2026-01-01T05:30:00.000Z");

		expect(fechaLocal(instante, "America/Mexico_City")).toBe("2025-12-31");
		expect(fechaLocal(instante, "UTC")).toBe("2026-01-01");
	});

	it("cambia de día a medianoche local", () => {
		expect(fechaLocal(new Date("2026-11-10T05:59:59.000Z"), "America/Mexico_City")).toBe(
			"2026-11-09",
		);
		expect(fechaLocal(new Date("2026-11-10T06:00:00.000Z"), "America/Mexico_City")).toBe(
			"2026-11-10",
		);
	});

	it("respeta el horario de verano de Madrid", () => {
		expect(fechaLocal(new Date("2026-03-29T00:30:00.000Z"), "Europe/Madrid")).toBe("2026-03-29");
		expect(fechaLocal(new Date("2026-03-29T01:30:00.000Z"), "Europe/Madrid")).toBe("2026-03-29");
		expect(fechaLocal(new Date("2026-10-25T00:30:00.000Z"), "Europe/Madrid")).toBe("2026-10-25");
	});
});
