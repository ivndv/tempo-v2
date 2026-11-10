import { expect, test } from "@playwright/test";
import { E2E_FREE } from "./const";
import { iniciarSesion } from "./helpers";

test("el dashboard sin sesión responde 401", async ({ request }) => {
	const respuesta = await request.get("/api/dashboard?range=30");
	expect(respuesta.status()).toBe(401);
});

test("un usuario Free puede iniciar sesión", async ({ page }) => {
	await iniciarSesion(page, E2E_FREE.email, E2E_FREE.password);

	await expect(page.getByRole("button", { name: "Open user menu" })).toBeVisible();
	await expect(page.getByText(E2E_FREE.email)).toBeVisible();
});

test("credenciales inválidas muestran error y no redirigen", async ({ page }) => {
	await page.goto("/login");
	await page.getByLabel("Email", { exact: true }).fill(E2E_FREE.email);
	await page.getByLabel("Password", { exact: true }).fill("PasswordIncorrecta123!");

	const boton = page.getByRole("button", { name: "Log in" });
	await expect(boton).toBeEnabled();
	await boton.click();

	await expect(page.getByRole("alert")).toBeVisible();
	await expect(page).toHaveURL(/\/login$/);
});
