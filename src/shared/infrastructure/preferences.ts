const CLAVE_ZONA = "tempo:timezone";

function zonaValida(zona: string | null): zona is string {
	if (!zona) {
		return false;
	}

	try {
		new Intl.DateTimeFormat("en", { timeZone: zona });
		return true;
	} catch {
		return false;
	}
}

// Zona horaria del invitado: preferencia guardada o la del navegador.
export function leerZonaHoraria(): string {
	if (typeof window === "undefined") {
		return "America/Mexico_City";
	}

	try {
		const guardada = window.localStorage.getItem(CLAVE_ZONA);
		const navegador = Intl.DateTimeFormat().resolvedOptions().timeZone;

		if (zonaValida(guardada)) {
			return guardada;
		}

		return zonaValida(navegador) ? navegador : "America/Mexico_City";
	} catch {
		return "America/Mexico_City";
	}
}

export function guardarZonaHoraria(zona: string): void {
	try {
		window.localStorage.setItem(CLAVE_ZONA, zona);
	} catch {
		// Sin localStorage la preferencia dura solo esta sesión.
	}
}
