export type EstadoPersistencia = "persistido" | "denegado" | "no-soportado";

// Pide al navegador que no desaloje IndexedDB si le falta espacio.
export async function pedirPersistencia(): Promise<EstadoPersistencia> {
	if (typeof navigator === "undefined" || !navigator.storage?.persist) {
		return "no-soportado";
	}

	try {
		if (await navigator.storage.persisted()) {
			return "persistido";
		}

		return (await navigator.storage.persist()) ? "persistido" : "denegado";
	} catch {
		return "denegado";
	}
}
