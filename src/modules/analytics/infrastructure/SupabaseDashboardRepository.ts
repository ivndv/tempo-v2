import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";
import type { DashboardRepository } from "../domain/DashboardRepository";
import type {
	CalendarCell,
	DashboardResumen,
	DiaRecord,
	DiaResumen,
	DispositivoResumen,
	OpcionesDashboard,
	PeriodoResumen,
	SemanaRecord,
	TareaResumen,
} from "../domain/dashboard";

interface PeriodoRpc {
	focus_minutes?: number;
	completed?: number;
	interrupted?: number;
}

interface DiaRpc {
	date?: string;
	focus_minutes?: number;
	completed?: number;
	interrupted?: number;
}

interface TareaRpc {
	tarea_id?: string;
	nombre?: string;
	focus_minutes?: number;
	sessions?: number;
	completed?: number;
	last_worked?: string | null;
}

interface CalendarRpc {
	date?: string;
	focus_minutes?: number;
	sessions?: number;
}

interface DispositivoRpc {
	device_id?: string | null;
	nombre?: string;
	focus_minutes?: number;
	completed?: number;
}

interface DashboardRpc {
	today?: PeriodoRpc | null;
	week?: PeriodoRpc | null;
	month?: PeriodoRpc | null;
	all_time?: PeriodoRpc | null;
	previous_week?: PeriodoRpc | null;
	daily?: DiaRpc[] | null;
	weekly?: DiaRpc[] | null;
	calendar?: CalendarRpc[] | null;
	granularity?: string | null;
	range_days?: number | null;
	by_task?: TareaRpc[] | null;
	devices?: DispositivoRpc[] | null;
	streak?: { current?: number; longest?: number } | null;
	best_day?: { date?: string; focus_minutes?: number } | null;
	best_week?: { week_start?: string; focus_minutes?: number } | null;
	longest_session?: number;
}

const vacio: PeriodoResumen = {
	focusMinutes: 0,
	completed: 0,
	interrupted: 0,
};

function numero(value: number | undefined): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function mapPeriodo(value: PeriodoRpc | null | undefined): PeriodoResumen {
	if (!value) {
		return vacio;
	}

	return {
		focusMinutes: numero(value.focus_minutes),
		completed: numero(value.completed),
		interrupted: numero(value.interrupted),
	};
}

function mapDia(value: DiaRpc): DiaResumen {
	return {
		date: value.date ?? "",
		focusMinutes: numero(value.focus_minutes),
		completed: numero(value.completed),
		interrupted: numero(value.interrupted),
	};
}

function mapTarea(value: TareaRpc): TareaResumen {
	return {
		tareaId: value.tarea_id ?? "",
		nombre: value.nombre ?? "",
		focusMinutes: numero(value.focus_minutes),
		sessions: numero(value.sessions),
		completed: numero(value.completed),
		lastWorked: value.last_worked ?? null,
	};
}

function mapCalendar(value: CalendarRpc): CalendarCell {
	return {
		date: value.date ?? "",
		focusMinutes: numero(value.focus_minutes),
		sessions: numero(value.sessions),
	};
}

function mapDispositivo(value: DispositivoRpc): DispositivoResumen {
	return {
		deviceId: value.device_id ?? "desconocido",
		nombre: value.nombre ?? "",
		focusMinutes: numero(value.focus_minutes),
		completed: numero(value.completed),
	};
}

function mapMejorDia(
	value: { date?: string; focus_minutes?: number } | null | undefined,
): DiaRecord | null {
	if (!value?.date) {
		return null;
	}

	return { date: value.date, focusMinutes: numero(value.focus_minutes) };
}

function mapMejorSemana(
	value: { week_start?: string; focus_minutes?: number } | null | undefined,
): SemanaRecord | null {
	if (!value?.week_start) {
		return null;
	}

	return { weekStart: value.week_start, focusMinutes: numero(value.focus_minutes) };
}

export class SupabaseDashboardRepository implements DashboardRepository {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async obtener(opciones: OpcionesDashboard = {}): Promise<DashboardResumen> {
		const { data, error } = await this.supabase.rpc("get_dashboard", {
			p_dias: opciones.dias ?? 30,
			p_device_id: opciones.deviceId ?? undefined,
		});

		if (error) {
			throw new Error(error.message);
		}

		const rpc = (data ?? {}) as unknown as DashboardRpc;
		const granularity =
			rpc.granularity === "week" ? "week" : rpc.granularity === "month" ? "month" : "day";
		const rangeDays = typeof rpc.range_days === "number" ? rpc.range_days : 30;

		return {
			today: mapPeriodo(rpc.today),
			week: mapPeriodo(rpc.week),
			month: mapPeriodo(rpc.month),
			allTime: mapPeriodo(rpc.all_time),
			previousWeek: mapPeriodo(rpc.previous_week),
			daily: (rpc.daily ?? []).map(mapDia),
			weekly: (rpc.weekly ?? []).map(mapDia),
			calendar: (rpc.calendar ?? []).map(mapCalendar),
			granularity,
			rangeDays,
			byTask: (rpc.by_task ?? []).map(mapTarea),
			devices: (rpc.devices ?? []).map(mapDispositivo),
			streak: {
				current: numero(rpc.streak?.current),
				longest: numero(rpc.streak?.longest),
			},
			bestDay: mapMejorDia(rpc.best_day),
			bestWeek: mapMejorSemana(rpc.best_week),
			longestSession: numero(rpc.longest_session),
		};
	}
}
