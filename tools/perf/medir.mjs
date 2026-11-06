import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

// Mide el dashboard con Chrome real vía CDP (Turnstile bloquea Playwright puro).
// 1. google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/tempo-cdp \
//      https://tempo-v2.liuma.app/login
// 2. Inicia sesión a mano en esa ventana.
// 3. node tools/perf/medir.mjs

const BASE = "https://tempo-v2.liuma.app";
const SALIDA = "/tmp/opencode/medicion.json";
const RECARGAS = 12;
const PAUSA_MS = 8000;

const navegador = await chromium.connectOverCDP("http://127.0.0.1:9222");
const contexto = navegador.contexts()[0];

async function paginaTempo() {
	const paginas = contexto.pages().filter((p) => p.url().includes("tempo-v2.liuma.app"));
	return paginas[0] ?? contexto.pages()[0];
}

async function haySesion() {
	const cookies = await contexto.cookies(BASE);
	return cookies.some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

let page = await paginaTempo();
console.log(">> Inicia sesión en la ventana de Chrome. Esperando...");

const inicio = Date.now();
while (!(await haySesion())) {
	if (Date.now() - inicio > 10 * 60 * 1000) {
		console.error("Timeout esperando login.");
		process.exit(1);
	}
	await new Promise((r) => setTimeout(r, 2000));
}

page = await paginaTempo();
console.log(">> Sesión detectada. Calentando...");
await page.goto(`${BASE}/app/dashboard`, { waitUntil: "load" });

for (let i = 0; i < 2; i++) {
	await page.waitForTimeout(3000);
	await page.reload({ waitUntil: "load" });
}

const muestras = [];
for (let i = 0; i < RECARGAS; i++) {
	const t0 = Date.now();
	await page.reload({ waitUntil: "load" });
	const nav = await page.evaluate(() => {
		const n = performance.getEntriesByType("navigation")[0];
		return {
			ttfb: Math.round(n.responseStart),
			dom: Math.round(n.domContentLoadedEventEnd),
			load: Math.round(n.loadEventEnd),
			bytes: n.transferSize,
		};
	});
	muestras.push({ i: i + 1, inicio: new Date(t0).toISOString(), ...nav });
	console.log(`>> recarga ${i + 1}/${RECARGAS}: ttfb=${nav.ttfb}ms load=${nav.load}ms`);
	await page.waitForTimeout(PAUSA_MS);
}

let rsc = 0;
page.on("request", (req) => {
	if (req.url().includes("_rsc")) rsc += 1;
});

const suaves = [];
for (let i = 0; i < 5; i++) {
	await page.locator('a[href="/app"]').first().click();
	await page.waitForTimeout(1500);
	await page.locator('a[href="/app/dashboard"]').first().click();
	await page.waitForTimeout(1500);
	suaves.push({ i: i + 1, rsc });
	console.log(`>> soft ${i + 1}/5: _rsc acumulados=${rsc}`);
}

writeFileSync(SALIDA, JSON.stringify({ muestras, suaves, rscTotal: rsc }, null, 2));
console.log(`>> Guardado en ${SALIDA}`);
process.exit(0);
