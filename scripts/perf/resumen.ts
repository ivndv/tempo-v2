import { readFileSync } from "node:fs";

// Resumen de rendimiento a partir de la salida de:
//   bunx wrangler tail tempo-v2 --format json > perf.ndjson
// Agrupa por `cf-ray` y muestra el desglose por ruta y por operación.

interface Evento {
	t?: string;
	ray?: string;
	op?: string;
	ms?: number;
	status?: number;
	filas?: number;
	ruta?: string;
	authMs?: number;
	logs?: Array<{ message?: unknown[] }>;
	event?: { request?: { url?: string } };
}

interface Peticion {
	ray: string;
	ruta: string;
	middleware: number;
	queries: Array<{ op: string; ms: number }>;
}

function objetosDe(linea: Evento): Evento[] {
	if (linea.t) {
		return [linea];
	}

	const salida: Evento[] = [];

	for (const log of linea.logs ?? []) {
		for (const mensaje of log.message ?? []) {
			if (typeof mensaje !== "string" || !mensaje.startsWith("{")) {
				continue;
			}

			try {
				salida.push(JSON.parse(mensaje) as Evento);
			} catch {
				// Línea que no es nuestra: se ignora.
			}
		}
	}

	return salida;
}

function rutaDe(linea: Evento): string {
	const url = linea.event?.request?.url;

	if (!url) {
		return "";
	}

	try {
		return new URL(url).pathname;
	} catch {
		return "";
	}
}

function percentil(valores: number[], p: number): number {
	if (valores.length === 0) {
		return 0;
	}

	const ordenados = [...valores].sort((a, b) => a - b);
	const indice = Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1);
	return ordenados[Math.max(0, indice)] ?? 0;
}

function principal(): void {
	const archivo = process.argv[2];

	if (!archivo) {
		console.error("Uso: bun scripts/perf/resumen.ts <perf.ndjson>");
		process.exit(1);
	}

	const contenido = readFileSync(archivo, "utf8");
	const peticiones = new Map<string, Peticion>();

	for (const cruda of contenido.split("\n")) {
		const texto = cruda.trim();

		if (!texto) {
			continue;
		}

		let linea: Evento;

		try {
			linea = JSON.parse(texto) as Evento;
		} catch {
			continue;
		}

		const ruta = rutaDe(linea);

		for (const evento of objetosDe(linea)) {
			if (!evento.ray) {
				continue;
			}

			const actual = peticiones.get(evento.ray) ?? {
				ray: evento.ray,
				ruta: evento.ruta ?? ruta,
				middleware: 0,
				queries: [],
			};

			if (evento.t === "mw") {
				actual.middleware = evento.authMs ?? 0;
				actual.ruta = evento.ruta ?? actual.ruta;
			}

			if (evento.t === "q" && evento.op) {
				actual.queries.push({ op: evento.op, ms: evento.ms ?? 0 });
			}

			peticiones.set(evento.ray, actual);
		}
	}

	const lista = [...peticiones.values()].filter(
		(peticion) => peticion.queries.length > 0 || peticion.middleware > 0,
	);

	if (lista.length === 0) {
		console.log("Sin datos. ¿Estaba activo PERF_LOGS=1 y el tail corriendo?");
		return;
	}

	console.log("\n== Peticiones (últimas 25) ==");
	console.log(
		`${"ray".padEnd(22)} ${"ruta".padEnd(24)} ${"mw".padStart(5)} ${"#q".padStart(3)} ${"suma q".padStart(7)} ${"total".padStart(7)}`,
	);

	const ordenadas = [...lista].sort((a, b) => b.ray.localeCompare(a.ray)).slice(0, 25);

	for (const peticion of ordenadas) {
		const suma = peticion.queries.reduce((total, query) => total + query.ms, 0);
		const total = suma + peticion.middleware;

		console.log(
			`${peticion.ray.padEnd(22)} ${(peticion.ruta || "-").padEnd(24)} ${String(peticion.middleware).padStart(5)} ${String(peticion.queries.length).padStart(3)} ${String(suma).padStart(7)} ${String(total).padStart(7)}`,
		);
	}

	const porRuta = new Map<string, number[]>();

	for (const peticion of lista) {
		const suma = peticion.queries.reduce((total, query) => total + query.ms, 0);
		const valores = porRuta.get(peticion.ruta) ?? [];
		valores.push(suma + peticion.middleware);
		porRuta.set(peticion.ruta, valores);
	}

	console.log("\n== Por ruta ==");
	console.log(
		`${"ruta".padEnd(26)} ${"n".padStart(4)} ${"media".padStart(7)} ${"p50".padStart(6)} ${"p95".padStart(6)} ${"max".padStart(6)}`,
	);

	for (const [ruta, valores] of [...porRuta.entries()].sort(
		(a, b) => percentil(b[1], 95) - percentil(a[1], 95),
	)) {
		const media = Math.round(valores.reduce((total, valor) => total + valor, 0) / valores.length);
		const max = Math.max(...valores);

		console.log(
			`${(ruta || "-").padEnd(26)} ${String(valores.length).padStart(4)} ${String(media).padStart(7)} ${String(percentil(valores, 50)).padStart(6)} ${String(percentil(valores, 95)).padStart(6)} ${String(max).padStart(6)}`,
		);
	}

	const porOperacion = new Map<string, number[]>();

	for (const peticion of lista) {
		for (const query of peticion.queries) {
			const valores = porOperacion.get(query.op) ?? [];
			valores.push(query.ms);
			porOperacion.set(query.op, valores);
		}
	}

	console.log("\n== Por operación ==");
	console.log(
		`${"operación".padEnd(28)} ${"n".padStart(4)} ${"media".padStart(7)} ${"p95".padStart(6)} ${"max".padStart(6)}`,
	);

	for (const [op, valores] of [...porOperacion.entries()].sort(
		(a, b) => percentil(b[1], 95) - percentil(a[1], 95),
	)) {
		const media = Math.round(valores.reduce((total, valor) => total + valor, 0) / valores.length);

		console.log(
			`${op.padEnd(28)} ${String(valores.length).padStart(4)} ${String(media).padStart(7)} ${String(percentil(valores, 95)).padStart(6)} ${String(Math.max(...valores)).padStart(6)}`,
		);
	}

	console.log("");
}

principal();
