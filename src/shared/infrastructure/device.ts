const CLAVE = "tempo:device-id";

let memoria: string | null = null;

// Identificador estable del navegador; no identifica a la persona.
export function obtenerDeviceId(): string {
	if (typeof window === "undefined") {
		return "server";
	}

	try {
		const guardado = window.localStorage.getItem(CLAVE);

		if (guardado) {
			return guardado;
		}

		const nuevo = crypto.randomUUID();
		window.localStorage.setItem(CLAVE, nuevo);
		return nuevo;
	} catch {
		memoria ??= crypto.randomUUID();
		return memoria;
	}
}

// Nombre legible a partir del navegador; el usuario puede editarlo después.
export function detectarDispositivo(): { nombre: string; plataforma: string } {
	if (typeof navigator === "undefined") {
		return { nombre: "Dispositivo", plataforma: "web" };
	}

	const ua = navigator.userAgent;
	const plataforma = /iPhone|iPad|iPod/.test(ua)
		? "iOS"
		: /Android/.test(ua)
			? "Android"
			: /Macintosh|Mac OS X/.test(ua)
				? "macOS"
				: /Windows/.test(ua)
					? "Windows"
					: /Linux/.test(ua)
						? "Linux"
						: "Web";

	const navegador = /Edg\//.test(ua)
		? "Edge"
		: /Firefox\//.test(ua)
			? "Firefox"
			: /Chrome\//.test(ua)
				? "Chrome"
				: /Safari\//.test(ua)
					? "Safari"
					: "Browser";

	return { nombre: `${plataforma} · ${navegador}`, plataforma };
}
