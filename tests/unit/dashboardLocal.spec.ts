import { beforeEach, describe, expect, it } from "vitest";
import { DexieDashboardRepository } from "@/modules/analytics/infrastructure/DexieDashboardRepository";
import { fechaLocal, type RegistroPomodoro } from "@/modules/pomodoros/domain/pomodoro";
import { getLocalDb, resetLocalDb } from "@/shared/infrastructure/dexie/db";

const ZONA = "America/Mexico_City";

function registro(
	id: string,
	localDate: string,
	deviceId: string,
	minutos: number,
	tareaId: string | null,
): RegistroPomodoro {
	return {
		id,
		bloqueId: "bloque-1",
		tareaId,
		tareaNombre: null,
		minutos,
		minutosPlanificados: minutos,
		estado: "completed",
		iniciadaEn: `${localDate}T10:00:00.000Z`,
		finalizadaEn: `${localDate}T10:${minutos}:00.000Z`,
		localDate,
		ciclo: 1,
		deviceId,
	};
}

describe("DexieDashboardRepository", () => {
	beforeEach(async () => {
		await resetLocalDb();
	});

	async function sembrar() {
		const hoy = fechaLocal(new Date(), ZONA);
		const ayer = fechaLocal(new Date(Date.now() - 86_400_000), ZONA);
		const db = getLocalDb();

		await db.tareas.put({
			id: "t1",
			userId: "local",
			bloqueId: "bloque-1",
			nombre: "Escribir",
			estado: "done",
			createdAt: `${hoy}T09:00:00.000Z`,
			updatedAt: `${hoy}T09:00:00.000Z`,
			completedAt: null,
			deletedAt: null,
			creadaEnFocusId: null,
			completadaEnFocusId: null,
			eliminadaEnFocusId: null,
		});

		await db.pomodoros.bulkPut([
			registro("p1", hoy, "device-a", 25, "t1"),
			registro("p2", ayer, "device-b", 25, null),
		]);

		return { hoy, ayer };
	}

	it("filtra por dispositivo y resume los periodos", async () => {
		const { hoy } = await sembrar();
		const repo = new DexieDashboardRepository();

		const actual = await repo.obtener({ timezone: ZONA, deviceId: "device-a" });

		expect(actual.today.focusMinutes).toBe(25);
		expect(actual.allTime.focusMinutes).toBe(25);
		expect(actual.devices).toHaveLength(1);
		expect(actual.devices[0]?.deviceId).toBe("device-a");
		expect(actual.daily.at(-1)?.date).toBe(hoy);
		expect(actual.byTask[0]).toMatchObject({ tareaId: "t1", nombre: "Escribir" });
		expect(actual.streak.current).toBe(1);
		expect(actual.bestDay).toMatchObject({ date: hoy, focusMinutes: 25 });
		expect(actual.longestSession).toBe(25);
	});

	it("sin filtro combina todos los dispositivos", async () => {
		await sembrar();
		const repo = new DexieDashboardRepository();

		const todo = await repo.obtener({ timezone: ZONA, deviceId: null });

		expect(todo.allTime.focusMinutes).toBe(50);
		expect(todo.devices).toHaveLength(2);
		expect(todo.daily.at(-1)?.focusMinutes).toBe(25);
		expect(todo.week.focusMinutes).toBe(50);
		expect(todo.streak.current).toBe(2);
		expect(todo.streak.longest).toBe(2);
	});
});
