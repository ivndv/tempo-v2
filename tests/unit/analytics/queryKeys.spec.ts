import { describe, expect, it } from "vitest";
import { dashboardKeys } from "@/modules/analytics/ui/useDashboard";
import { crearQueryClient } from "@/shared/infrastructure/query/queryClient";

describe("dashboardKeys", () => {
	it("incluye usuario, rango y dispositivo", () => {
		expect(dashboardKeys.detalle("usuario-a", 30, null)).toEqual([
			"dashboard",
			"usuario-a",
			30,
			"all",
		]);
		expect(dashboardKeys.detalle("usuario-a", 730, "mac")).toEqual([
			"dashboard",
			"usuario-a",
			730,
			"mac",
		]);
	});

	it("separa usuarios, rangos y dispositivos", () => {
		const base = dashboardKeys.detalle("usuario-a", 30, null);

		expect(dashboardKeys.detalle("usuario-b", 30, null)).not.toEqual(base);
		expect(dashboardKeys.detalle("usuario-a", 90, null)).not.toEqual(base);
		expect(dashboardKeys.detalle("usuario-a", 30, "mac")).not.toEqual(base);
	});
});

describe("crearQueryClient", () => {
	it("usa la política de caché esperada", () => {
		const cliente = crearQueryClient();

		expect(cliente.getDefaultOptions().queries?.staleTime).toBe(30_000);
		expect(cliente.getDefaultOptions().queries?.gcTime).toBe(5 * 60_000);
		expect(cliente.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
	});

	it("permite invalidar todas las entradas del dashboard", () => {
		const cliente = crearQueryClient();
		const key = dashboardKeys.detalle("usuario-a", 30, null);

		cliente.setQueryData(key, { ok: true });
		expect(cliente.getQueryData(key)).toEqual({ ok: true });

		cliente.removeQueries({ queryKey: dashboardKeys.all });
		expect(cliente.getQueryData(key)).toBeUndefined();
	});
});
