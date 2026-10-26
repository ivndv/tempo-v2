import "server-only";

// Observabilidad mínima del servidor: un log JSON por cada llamada saliente a
// Supabase, correlacionado por `cf-ray`. Se apaga con PERF_LOGS=0.
export interface Observador {
	ray: string;
}

// Convierte la ruta de Supabase en un nombre legible.
function nombreOperacion(pathname: string): string {
	const rpc = "/rest/v1/rpc/";

	if (pathname.startsWith(rpc)) {
		return `rpc:${pathname.slice(rpc.length)}`;
	}

	if (pathname.startsWith("/rest/v1/")) {
		return pathname.slice("/rest/v1/".length);
	}

	if (pathname.startsWith("/auth/v1/")) {
		return `auth:${pathname.slice("/auth/v1/".length)}`;
	}

	return pathname;
}

// Envuelve fetch para medir cada consulta del cliente de Supabase.
export function fetchObservado(observador: Observador): typeof fetch {
	if (process.env.PERF_LOGS !== "1") {
		return fetch;
	}

	return async (input, init) => {
		const url = new URL(
			typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
		);
		const op = nombreOperacion(url.pathname);
		const inicio = performance.now();

		try {
			const respuesta = await fetch(input, init);
			const rango = respuesta.headers.get("content-range");
			const filas = rango?.includes("/") ? rango.split("/")[1] : undefined;

			console.log(
				JSON.stringify({
					t: "q",
					ray: observador.ray,
					op,
					status: respuesta.status,
					ms: Math.round(performance.now() - inicio),
					...(filas && filas !== "*" ? { filas: Number(filas) } : {}),
				}),
			);

			return respuesta;
		} catch (error) {
			console.log(
				JSON.stringify({
					t: "q",
					ray: observador.ray,
					op,
					status: 0,
					ms: Math.round(performance.now() - inicio),
				}),
			);

			throw error;
		}
	};
}
