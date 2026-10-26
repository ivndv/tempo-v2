import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/infrastructure/supabase/server";
import { leerTodas } from "../rows";

export async function GET(_request: NextRequest) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	try {
		const [tareas, pomodoros, breaks] = await Promise.all([
			leerTodas(supabase, "tareas"),
			leerTodas(supabase, "pomodoros"),
			leerTodas(supabase, "breaks"),
		]);

		const exportacion = {
			exportedAt: new Date().toISOString(),
			version: 1,
			user: { id: user.id, email: user.email },
			tareas,
			pomodoros,
			breaks,
		};

		const fecha = new Date().toISOString().slice(0, 10);

		return new NextResponse(JSON.stringify(exportacion, null, 2), {
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Content-Disposition": `attachment; filename="tempo-export-${fecha}.json"`,
				"Cache-Control": "no-store",
			},
		});
	} catch (cause: unknown) {
		return NextResponse.json(
			{ error: cause instanceof Error ? cause.message : "Error al exportar" },
			{ status: 500 },
		);
	}
}
