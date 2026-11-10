import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Carga .env.local incluso cuando NODE_ENV=test, donde Next lo ignora.
export function cargarEnvLocal(ruta = resolve(process.cwd(), ".env.local")): void {
	if (!existsSync(ruta)) {
		return;
	}

	const contenido = readFileSync(ruta, "utf8");

	for (const linea of contenido.split(/\r?\n/)) {
		const limpia = linea.trim();

		if (!limpia || limpia.startsWith("#")) {
			continue;
		}

		const indice = limpia.indexOf("=");

		if (indice === -1) {
			continue;
		}

		const clave = limpia.slice(0, indice).trim();
		let valor = limpia.slice(indice + 1).trim();

		if (
			(valor.startsWith('"') && valor.endsWith('"')) ||
			(valor.startsWith("'") && valor.endsWith("'"))
		) {
			valor = valor.slice(1, -1);
		}

		if (!(clave in process.env)) {
			process.env[clave] = valor;
		}
	}
}
