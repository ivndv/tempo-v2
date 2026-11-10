import { expect, test } from "@playwright/test";

test("el login en español usa los textos traducidos", async ({ page }) => {
	await page.goto("/es/login");

	await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
	await expect(page.getByLabel("Correo", { exact: true })).toBeVisible();
	await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});
