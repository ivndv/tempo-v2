const ZONA_POR_DEFECTO = "America/Mexico_City";

// Fecha YYYY-MM-DD en la zona indicada.
export function fechaEnZona(ahora = new Date(), zona = ZONA_POR_DEFECTO): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: zona,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(ahora);
}

// Suma días a una fecha YYYY-MM-DD sin depender de la zona del proceso.
export function sumarDiasClave(fecha: string, dias: number): string {
	const [anio, mes, dia] = fecha.split("-").map(Number);
	const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia, 12));
	fechaUtc.setUTCDate(fechaUtc.getUTCDate() + dias);
	return fechaUtc.toISOString().slice(0, 10);
}
