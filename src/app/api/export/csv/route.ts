import { strToU8, zipSync } from "fflate";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/shared/infrastructure/supabase/server";
import { leerTodas } from "../rows";

const COLUMNAS_POMODOROS = [
	"id",
	"bloque_id",
	"tarea_id",
	"status",
	"minutes_planned",
	"minutes_actual",
	"local_date",
	"started_at",
	"ended_at",
	"cycle_position",
	"device_id",
	"created_at",
	"updated_at",
];

const COLUMNAS_BREAKS = [
	"id",
	"bloque_id",
	"tipo",
	"status",
	"minutes_planned",
	"minutes_actual",
	"local_date",
	"started_at",
	"ended_at",
	"device_id",
	"created_at",
	"updated_at",
];

const COLUMNAS_TAREAS = [
	"id",
	"nombre",
	"estado",
	"bloque_id",
	"created_at",
	"completed_at",
	"deleted_at",
	"creada_en_focus_id",
	"completada_en_focus_id",
	"eliminada_en_focus_id",
	"updated_at",
];

function celda(valor: unknown): string {
	if (valor === null || valor === undefined) {
		return "";
	}

	const texto = String(valor);
	return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function aCsv(filas: Record<string, unknown>[], columnas: string[]): string {
	const encabezado = columnas.join(",");
	const cuerpo = filas.map((fila) => columnas.map((columna) => celda(fila[columna])).join(","));
	return [encabezado, ...cuerpo].join("\n");
}

function esPro(plan: string | null, status: string | null, fin: string | null): boolean {
	if (plan !== "pro" || !status) {
		return false;
	}

	if (!["active", "trialing", "canceled"].includes(status)) {
		return false;
	}

	return !fin || new Date(fin).getTime() > Date.now();
}

export async function GET(_request: NextRequest) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const { data: suscripcion, error: errorPlan } = await supabase
		.from("subscriptions")
		.select("plan, status, current_period_end")
		.maybeSingle();

	if (errorPlan) {
		return NextResponse.json({ error: errorPlan.message }, { status: 500 });
	}

	if (
		!esPro(
			suscripcion?.plan ?? null,
			suscripcion?.status ?? null,
			suscripcion?.current_period_end ?? null,
		)
	) {
		return NextResponse.json({ error: "Se requiere plan Pro" }, { status: 403 });
	}

	try {
		const [tareas, pomodoros, breaks] = await Promise.all([
			leerTodas(supabase, "tareas"),
			leerTodas(supabase, "pomodoros"),
			leerTodas(supabase, "breaks"),
		]);

		const zip = zipSync({
			"pomodoros.csv": strToU8(aCsv(pomodoros, COLUMNAS_POMODOROS)),
			"breaks.csv": strToU8(aCsv(breaks, COLUMNAS_BREAKS)),
			"tareas.csv": strToU8(aCsv(tareas, COLUMNAS_TAREAS)),
		});

		const fecha = new Date().toISOString().slice(0, 10);

		return new NextResponse(new Blob([zip], { type: "application/zip" }), {
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": `attachment; filename="tempo-export-${fecha}.zip"`,
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
