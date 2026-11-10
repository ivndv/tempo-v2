import { expect, test } from "@playwright/test";
import { E2E_PRO } from "./const";
import { iniciarSesion } from "./helpers";

test("el dashboard Pro responde a rangos, dispositivos y caché", async ({ page }) => {
	await iniciarSesion(page, E2E_PRO.email, E2E_PRO.password);
	await page.goto("/app/dashboard?range=30");

	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	await expect(page.getByText("Focus calendar")).toBeVisible();

	for (const rango of ["7 days", "30 days", "90 days", "1 year", "2 years", "All-time"]) {
		await expect(page.getByRole("button", { name: rango })).toBeVisible();
	}

	await expect(page.getByRole("button", { name: "All devices" })).toBeVisible();
	await expect(page.getByRole("button", { name: "E2E Mac" })).toBeVisible();
	await expect(page.getByRole("button", { name: "E2E Linux" })).toBeVisible();

	const calendario = page.locator("section").filter({ hasText: "Focus calendar" });
	const celdas = calendario.locator("[title]");
	await expect(celdas).toHaveCount(30);

	const peticiones: string[] = [];
	page.on("request", (request) => {
		if (request.url().includes("/api/dashboard")) {
			peticiones.push(request.url());
		}
	});

	await page.getByRole("button", { name: "90 days" }).click();
	await expect(celdas).toHaveCount(90);

	await page.getByRole("button", { name: "30 days" }).click();
	await expect(celdas).toHaveCount(30);

	expect(peticiones.filter((url) => url.includes("range=90"))).toHaveLength(1);
	expect(peticiones.filter((url) => url.includes("range=30"))).toHaveLength(0);

	await page.getByRole("button", { name: "7 days" }).click();
	await expect(celdas).toHaveCount(7);
	const columnasSemana = await calendario
		.locator(".grid")
		.first()
		.evaluate((elemento) => getComputedStyle(elemento).gridTemplateColumns.split(" ").length);
	expect(columnasSemana).toBe(7);

	await page.getByRole("button", { name: "1 year" }).click();
	await expect(celdas).toHaveCount(365);

	await page.getByRole("button", { name: "2 years" }).click();
	await expect(celdas).toHaveCount(730);

	const scroll = calendario.locator(".overflow-x-auto").first();
	const puedeScrollear = await scroll.evaluate(
		(elemento) => elemento.scrollWidth > elemento.clientWidth,
	);
	expect(puedeScrollear).toBe(true);

	await page.getByRole("button", { name: "All-time" }).click();
	await expect(celdas).toHaveCount(730);

	await page.getByRole("button", { name: "E2E Mac" }).click();
	await expect(page).toHaveURL(/device=e2e-mac/);
	await expect(celdas).toHaveCount(730);

	const seccionDispositivos = page.locator("section").filter({
		has: page.getByRole("heading", { name: "Devices" }),
	});
	await expect(seccionDispositivos.getByText("E2E Mac")).toBeVisible();
	await expect(seccionDispositivos.getByText("E2E Linux")).toHaveCount(0);

	const respuesta = await page.request.get("/api/dashboard?range=730");
	expect(respuesta.status()).toBe(200);
	const cuerpo = (await respuesta.json()) as { calendar?: unknown[] };
	expect(Array.isArray(cuerpo.calendar)).toBe(true);
	expect(cuerpo.calendar).toHaveLength(730);

	const respuestaInvalida = await page.request.get("/api/dashboard?range=730&device=no-existe");
	expect(respuestaInvalida.status()).toBe(400);

	await page.goto("/app/settings?tab=billing");
	await expect(page.getByText("Manage subscription", { exact: true })).toBeVisible();
	await expect(page.getByText(/Renews on/)).toBeVisible();
});
