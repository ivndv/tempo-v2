import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "**/*.spec.ts",
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	reporter: [["list"]],
	timeout: 60_000,
	expect: {
		timeout: 15_000,
	},
	use: {
		baseURL: "http://127.0.0.1:3000",
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	globalSetup: "./tests/e2e/global-setup.ts",
	globalTeardown: "./tests/e2e/global-teardown.ts",
	webServer: {
		command: "bun run start",
		url: "http://127.0.0.1:3000/api/health",
		reuseExistingServer: true,
		timeout: 120_000,
	},
});
