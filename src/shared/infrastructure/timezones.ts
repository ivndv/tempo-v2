const FALLBACK = [
	"America/Mexico_City",
	"America/Tijuana",
	"America/Cancun",
	"America/Monterrey",
	"America/Bogota",
	"America/Lima",
	"America/Santiago",
	"America/Argentina/Buenos_Aires",
	"America/New_York",
	"America/Los_Angeles",
	"Europe/Madrid",
	"Europe/London",
	"UTC",
];

// Zonas IANA disponibles, con la actual siempre incluida.
export function zonasHorarias(actual: string): string[] {
	const soportadas =
		(Intl as unknown as { supportedValuesOf?: (clave: string) => string[] }).supportedValuesOf?.(
			"timeZone",
		) ?? [];

	const base = soportadas.length > 0 ? soportadas : FALLBACK;

	return Array.from(new Set([actual, ...base]));
}
