import { expect, test } from "@playwright/test";
import { E2E_FREE } from "./const";
import { iniciarSesion } from "./helpers";

test("el dashboard Free es local, limitado a 7/30 y no llama a la API Pro", async ({ page }) => {
	const peticionesDashboard: string[] = [];
	page.on("request", (request) => {
		if (request.url().includes("/api/dashboard")) {
			peticionesDashboard.push(request.url());
		}
	});

	await iniciarSesion(page, E2E_FREE.email, E2E_FREE.password);
	await page.goto("/app/dashboard");

	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	await expect(page.getByRole("button", { name: "7 days" })).toBeVisible();
	await expect(page.getByRole("button", { name: "30 days" })).toBeVisible();
	await expect(page.getByRole("button", { name: "90 days" })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "1 year" })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "2 years" })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "All-time" })).toHaveCount(0);

	await expect(page.getByText("Free shows 30 days from this device.")).toBeVisible();
	await expect(page.getByText("Focus calendar")).toHaveCount(0);
	await expect(page.getByText("Weekly focus")).toHaveCount(0);

	expect(peticionesDashboard).toHaveLength(0);

	const respuesta = await page.request.get("/api/dashboard?range=730");
	expect(respuesta.status()).toBe(403);

	await page.goto("/app/settings?tab=billing");
	await expect(page.getByText("Upgrade to Pro", { exact: true })).toBeVisible();
});
