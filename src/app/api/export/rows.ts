import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";

type TablaExport = "tareas" | "pomodoros" | "breaks";

const PAGINA = 1000;

// Supabase corta en 1000 filas por defecto; pagina hasta traer todo.
export async function leerTodas(
	supabase: SupabaseClient<Database>,
	tabla: TablaExport,
): Promise<Record<string, unknown>[]> {
	const filas: Record<string, unknown>[] = [];
	let desde = 0;

	while (true) {
		const { data, error } = await supabase
			.from(tabla)
			.select("*")
			.range(desde, desde + PAGINA - 1);

		if (error) {
			throw new Error(error.message);
		}

		if (!data || data.length === 0) {
			break;
		}

		filas.push(...(data as unknown as Record<string, unknown>[]));

		if (data.length < PAGINA) {
			break;
		}

		desde += PAGINA;
	}

	return filas;
}
