import { expect, type Page } from "@playwright/test";

// Inicia sesión por la UI y espera a que la app quede montada.
export async function iniciarSesion(page: Page, email: string, password: string): Promise<void> {
	await page.goto("/login");
	await page.getByLabel("Email", { exact: true }).fill(email);
	await page.getByLabel("Password", { exact: true }).fill(password);

	const boton = page.getByRole("button", { name: "Log in" });
	await expect(boton).toBeEnabled();
	await boton.click();
	await expect(page).toHaveURL(/\/app$/);
}
