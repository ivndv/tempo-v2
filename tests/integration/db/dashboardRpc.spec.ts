import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fechaEnZona, sumarDiasClave } from "../../helpers/fechas";
import {
	borrarUsuario,
	crearSuscripcionPro,
	crearUsuarioPrueba,
	integracionDisponible,
	type UsuarioPrueba,
} from "../helpers";

interface PeriodoRpc {
	focus_minutes: number;
	completed: number;
	interrupted: number;
}

interface DiaRpc {
	date: string;
	focus_minutes: number;
	completed: number;
	interrupted: number;
}

interface CalendarRpc {
	date: string;
	focus_minutes: number;
	sessions: number;
}

interface TareaRpc {
	tarea_id: string;
	nombre: string;
	focus_minutes: number;
	sessions: number;
	completed: number;
	last_worked: string | null;
}

interface DispositivoRpc {
	device_id: string | null;
	nombre: string;
	focus_minutes: number;
	completed: number;
}

interface DashboardRpc {
	today: PeriodoRpc;
	week: PeriodoRpc;
	month: PeriodoRpc;
	all_time: PeriodoRpc;
	previous_week: PeriodoRpc;
	daily: DiaRpc[];
	weekly: DiaRpc[];
	calendar: CalendarRpc[];
	granularity: "day" | "week" | "month";
	range_days: number;
	by_task: TareaRpc[];
	devices: DispositivoRpc[];
}

const HOY = fechaEnZona();
const AYER = sumarDiasClave(HOY, -1);
const ANTIGUO = sumarDiasClave(HOY, -729);

async function crearTarea(usuario: UsuarioPrueba, nombre: string): Promise<string> {
	const { data, error } = await usuario.client
		.from("tareas")
		.insert({ nombre })
		.select("id")
		.single();

	if (error || !data) {
		throw new Error(`No se pudo crear la tarea: ${error?.message ?? "sin id"}`);
	}

	return data.id;
}

async function crearPomodoro(
	usuario: UsuarioPrueba,
	tareaId: string,
	localDate: string,
	minutos: number,
	deviceId?: string,
): Promise<void> {
	const { error } = await usuario.client.from("pomodoros").insert({
		tarea_id: tareaId,
		status: "completed",
		minutes_planned: minutos,
		minutes_actual: minutos,
		local_date: localDate,
		device_id: deviceId ?? null,
		started_at: `${localDate}T15:00:00.000Z`,
		ended_at: `${localDate}T15:${String(minutos).padStart(2, "0")}:00.000Z`,
		cycle_position: 1,
	});

	if (error) {
		throw new Error(`No se pudo crear el pomodoro: ${error.message}`);
	}
}

async function dashboard(
	usuario: UsuarioPrueba,
	args: { p_dias: number; p_device_id?: string },
): Promise<DashboardRpc> {
	const { data, error } = await usuario.client.rpc("get_dashboard", args);

	if (error) {
		throw new Error(error.message);
	}

	return data as unknown as DashboardRpc;
}

function suma(serie: Array<{ focus_minutes: number }>): number {
	return serie.reduce((total, item) => total + item.focus_minutes, 0);
}

describe.skipIf(!integracionDisponible)("RPC get_dashboard", () => {
	let free: UsuarioPrueba;
	let pro: UsuarioPrueba;

	beforeAll(async () => {
		free = await crearUsuarioPrueba("dash-free");
		pro = await crearUsuarioPrueba("dash-pro");

		await crearSuscripcionPro(pro.id);

		const tareaFree = await crearTarea(free, "Free task");
		await crearPomodoro(free, tareaFree, HOY, 25);

		const tareaPro = await crearTarea(pro, "Pro task");

		const { error: devicesError } = await pro.client.from("devices").insert([
			{ id: "dash-mac", name: "Dashboard Mac", platform: "macOS", theme: "dark" },
			{ id: "dash-linux", name: "Dashboard Linux", platform: "Linux", theme: "light" },
		]);
		if (devicesError) {
			throw new Error(devicesError.message);
		}

		await crearPomodoro(pro, tareaPro, HOY, 50, "dash-mac");
		await crearPomodoro(pro, tareaPro, HOY, 25, "dash-linux");
		await crearPomodoro(pro, tareaPro, AYER, 30, "dash-mac");
		await crearPomodoro(pro, tareaPro, ANTIGUO, 25, "dash-mac");
	});

	afterAll(async () => {
		await borrarUsuario(free);
		await borrarUsuario(pro);
	});

	it("limita a 30 días a un usuario Free aunque pida 730", async () => {
		const data = await dashboard(free, { p_dias: 730 });

		expect(data.range_days).toBe(30);
		expect(data.granularity).toBe("day");
		expect(data.calendar).toHaveLength(30);
		expect(data.devices).toEqual([]);
		expect(data.today.focus_minutes).toBe(25);
		expect(data.all_time.focus_minutes).toBe(25);
	});

	it("ignora el filtro de dispositivo para Free", async () => {
		const data = await dashboard(free, { p_dias: 30, p_device_id: "dash-mac" });

		expect(data.range_days).toBe(30);
		expect(data.devices).toEqual([]);
		expect(data.today.focus_minutes).toBe(25);
	});

	it("devuelve 730 días completos para Pro con granularidad mensual", async () => {
		const data = await dashboard(pro, { p_dias: 730 });

		expect(data.range_days).toBe(730);
		expect(data.granularity).toBe("month");
		expect(data.calendar).toHaveLength(730);
		expect(data.calendar[0]?.date).toBe(ANTIGUO);
		expect(data.calendar.at(-1)?.date).toBe(HOY);
		expect(data.daily.length).toBeGreaterThanOrEqual(24);
		expect(data.weekly.length).toBeGreaterThanOrEqual(104);
		expect(data.all_time.focus_minutes).toBe(130);
		expect(data.today.focus_minutes).toBe(75);
		expect(data.week.focus_minutes).toBe(105);
	});

	it("calcula la serie diaria para 7 días", async () => {
		const data = await dashboard(pro, { p_dias: 7 });

		expect(data.range_days).toBe(7);
		expect(data.granularity).toBe("day");
		expect(data.calendar).toHaveLength(7);
		expect(data.daily).toHaveLength(7);
		expect(data.calendar.at(-1)).toEqual({
			date: HOY,
			focus_minutes: 75,
			sessions: 2,
		});
		expect(suma(data.daily)).toBe(suma(data.calendar));
	});

	it("calcula la serie semanal para 90 días", async () => {
		const data = await dashboard(pro, { p_dias: 90 });

		expect(data.range_days).toBe(90);
		expect(data.granularity).toBe("week");
		expect(data.calendar).toHaveLength(90);
		expect(suma(data.daily)).toBe(suma(data.calendar));
	});

	it("devuelve el historial completo con all-time", async () => {
		const data = await dashboard(pro, { p_dias: 0 });

		expect(data.range_days).toBe(0);
		expect(data.granularity).toBe("month");
		expect(data.calendar).toHaveLength(730);
		expect(data.calendar[0]?.date).toBe(ANTIGUO);
		expect(data.all_time.focus_minutes).toBe(130);
	});

	it("filtra por dispositivo y recalcula tareas y dispositivos", async () => {
		const data = await dashboard(pro, { p_dias: 730, p_device_id: "dash-mac" });

		expect(data.range_days).toBe(730);
		expect(data.calendar).toHaveLength(730);
		expect(data.devices).toHaveLength(1);
		expect(data.devices[0]).toMatchObject({
			device_id: "dash-mac",
			nombre: "Dashboard Mac",
		});
		expect(data.all_time.focus_minutes).toBe(105);
		expect(data.by_task[0]?.focus_minutes).toBe(105);
	});

	it("rechaza un dispositivo que no pertenece al usuario", async () => {
		const { error } = await pro.client.rpc("get_dashboard", {
			p_dias: 30,
			p_device_id: "no-existe",
		});

		expect(error).not.toBeNull();
		expect(error?.message).toContain("dispositivo inválido");
	});

	it("no permite llamar a la firma vieja de 3 argumentos", async () => {
		const { error } = await pro.client.rpc("get_dashboard", {
			p_dias: 30,
			p_granularidad: "day",
		} as never);

		expect(error).not.toBeNull();
	});
});
