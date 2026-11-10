export async function conBloqueo<T>(tarea: () => Promise<T>): Promise<T> {
	if (typeof navigator === "undefined" || !navigator.locks) {
		return tarea();
	}

	return navigator.locks.request("tempo-sync", () => tarea());
}
