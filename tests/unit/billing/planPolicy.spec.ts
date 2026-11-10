import { describe, expect, it } from "vitest";
import { type EstadoPlan, esPlanProActivo } from "@/modules/billing/domain/planPolicy";

const AHORA = Date.parse("2026-06-01T12:00:00.000Z");
const FUTURO = "2026-06-01T12:00:01.000Z";
const PASADO = "2026-06-01T11:59:59.000Z";

function estado(overrides: Partial<EstadoPlan> = {}): EstadoPlan {
	return {
		plan: "pro",
		status: "active",
		currentPeriodEnd: FUTURO,
		...overrides,
	};
}

describe("esPlanProActivo", () => {
	it("considera Pro a un plan pro activo con periodo futuro", () => {
		expect(esPlanProActivo(estado(), AHORA)).toBe(true);
	});

	it("considera Free a un plan pro con periodo vencido", () => {
		expect(esPlanProActivo(estado({ currentPeriodEnd: PASADO }), AHORA)).toBe(false);
	});

	it("considera Free exactamente al terminar el periodo", () => {
		expect(esPlanProActivo(estado({ currentPeriodEnd: "2026-06-01T12:00:00.000Z" }), AHORA)).toBe(
			false,
		);
	});

	it("mantiene Pro mientras el periodo no vence aunque esté cancelado", () => {
		expect(esPlanProActivo(estado({ status: "canceled" }), AHORA)).toBe(true);
	});

	it("quita Pro a un cancelado con periodo vencido", () => {
		expect(esPlanProActivo(estado({ status: "canceled", currentPeriodEnd: PASADO }), AHORA)).toBe(
			false,
		);
	});

	it("considera Pro a un trial vigente", () => {
		expect(esPlanProActivo(estado({ status: "trialing" }), AHORA)).toBe(true);
	});

	it("quita Pro a un trial vencido", () => {
		expect(esPlanProActivo(estado({ status: "trialing", currentPeriodEnd: PASADO }), AHORA)).toBe(
			false,
		);
	});

	it("considera Free a un plan free", () => {
		expect(esPlanProActivo(estado({ plan: "free" }), AHORA)).toBe(false);
	});

	it("considera Free a un plan nulo", () => {
		expect(esPlanProActivo(estado({ plan: null }), AHORA)).toBe(false);
	});

	it("considera Free a un estado nulo", () => {
		expect(esPlanProActivo(estado({ status: null }), AHORA)).toBe(false);
	});

	it("considera Free a un estado no permitido", () => {
		for (const status of ["past_due", "paused", "unpaid", "incomplete", "incomplete_expired"]) {
			expect(esPlanProActivo(estado({ status }), AHORA)).toBe(false);
		}
	});

	it("considera Pro a un periodo nulo si el estado es válido", () => {
		expect(esPlanProActivo(estado({ currentPeriodEnd: null }), AHORA)).toBe(true);
	});

	it("considera Free a una fecha inválida", () => {
		expect(esPlanProActivo(estado({ currentPeriodEnd: "no-es-fecha" }), AHORA)).toBe(false);
	});

	it("acepta fechas con offset de zona horaria", () => {
		expect(esPlanProActivo(estado({ currentPeriodEnd: "2026-06-01T06:00:01-06:00" }), AHORA)).toBe(
			true,
		);
	});
});
