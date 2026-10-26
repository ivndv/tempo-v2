import type { OutboxRepository } from "../domain/OutboxRepository";
import type {
	BreakSyncPayload,
	NuevoOutboxItem,
	OutboxItem,
	PomodoroSyncPayload,
	ResultadoSync,
	TareaSyncPayload,
} from "../domain/outbox";
import type { SyncGateway } from "../domain/SyncGateway";
import type { SyncLocalStore } from "../domain/SyncLocalStore";

const PAGINA = 200;
const MAX_PAGINAS = 10;
const DIAS_TOMBSTONE_LOCAL = 30;

export class SincronizarPendientes {
	constructor(
		private readonly outbox: OutboxRepository,
		private readonly gateway: SyncGateway,
		private readonly local: SyncLocalStore,
	) {}

	async execute(): Promise<ResultadoSync> {
		await this.purgarTombstones();

		if (!(await this.gateway.tieneSesion())) {
			return {
				subidos: 0,
				fallidos: 0,
				pendientes: await this.outbox.contarPendientes(),
				muertos: await this.outbox.contarMuertos(),
			};
		}

		// 1. Trae cambios remotos antes de subir para no pisar lo local pendiente.
		await this.traerCambios();

		const pendientes = await this.outbox.listarPendientes(25);
		let subidos = 0;
		let fallidos = 0;
		let conflictos = 0;

		for (const item of pendientes) {
			await this.outbox.marcarEnProceso(item.id);

			try {
				const huboConflicto = await this.enviar(item);
				await this.outbox.marcarSincronizado(item.id);
				subidos += 1;

				if (huboConflicto) {
					conflictos += 1;
				}
			} catch (cause: unknown) {
				const mensaje = cause instanceof Error ? cause.message : "Error de sincronización";
				await this.outbox.marcarFallido(item.id, mensaje);
				fallidos += 1;
			}
		}

		// 2. Si el servidor rechazó algo por conflicto, recarga desde cero.
		if (conflictos > 0) {
			await this.local.guardarCursor("tareas", null);
			await this.intentar(() => this.traerTareas());
		}

		return {
			subidos,
			fallidos,
			pendientes: await this.outbox.contarPendientes(),
			muertos: await this.outbox.contarMuertos(),
		};
	}

	async encolar(item: NuevoOutboxItem): Promise<void> {
		await this.outbox.encolar(item);
	}

	private async traerCambios(): Promise<void> {
		await this.intentar(() => this.traerTareas());
		await this.intentar(() => this.traerPomodoros());
		await this.intentar(() => this.traerBreaks());
	}

	private async traerTareas(): Promise<void> {
		let cursor = await this.local.leerCursor("tareas");

		for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
			const remotas = await this.gateway.descargarTareas(cursor);

			if (remotas.length === 0) {
				return;
			}

			const conCambiosLocales = await this.local.listarTareaIdsPendientes();
			await this.local.aplicarTareas(remotas.filter((tarea) => !conCambiosLocales.has(tarea.id)));

			const ultima = remotas[remotas.length - 1];

			if (!ultima) {
				return;
			}

			cursor = { updatedAt: ultima.updatedAt, id: ultima.id };
			await this.local.guardarCursor("tareas", cursor);

			if (remotas.length < PAGINA) {
				return;
			}
		}
	}

	private async traerPomodoros(): Promise<void> {
		let cursor = await this.local.leerCursor("pomodoros");

		for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
			const remotos = await this.gateway.descargarPomodoros(cursor);

			if (remotos.length === 0) {
				return;
			}

			await this.local.aplicarPomodoros(remotos);

			const ultimo = remotos[remotos.length - 1];

			if (!ultimo) {
				return;
			}

			cursor = { updatedAt: ultimo.updatedAt, id: ultimo.id };
			await this.local.guardarCursor("pomodoros", cursor);

			if (remotos.length < PAGINA) {
				return;
			}
		}
	}

	private async traerBreaks(): Promise<void> {
		let cursor = await this.local.leerCursor("breaks");

		for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
			const remotos = await this.gateway.descargarBreaks(cursor);

			if (remotos.length === 0) {
				return;
			}

			await this.local.aplicarBreaks(remotos);

			const ultimo = remotos[remotos.length - 1];

			if (!ultimo) {
				return;
			}

			cursor = { updatedAt: ultimo.updatedAt, id: ultimo.id };
			await this.local.guardarCursor("breaks", cursor);

			if (remotos.length < PAGINA) {
				return;
			}
		}
	}

	private async enviar(item: OutboxItem): Promise<boolean> {
		if (item.entity === "tarea") {
			if (item.operation === "delete") {
				await this.gateway.eliminarTarea(item.payload.id);
				return false;
			}

			const resultado = await this.gateway.subirTarea(item.payload as TareaSyncPayload);
			return resultado === "stale" || resultado === "deleted";
		}

		if (item.entity === "pomodoro") {
			await this.gateway.subirPomodoro(item.payload as PomodoroSyncPayload);
			return false;
		}

		await this.gateway.subirBreak(item.payload as BreakSyncPayload);
		return false;
	}

	private async purgarTombstones(): Promise<void> {
		try {
			await this.local.purgarTombstonesLocales(DIAS_TOMBSTONE_LOCAL);
		} catch (cause: unknown) {
			console.warn("[sync] no se pudieron purgar tombstones locales", cause);
		}
	}

	private async intentar(tarea: () => Promise<void>): Promise<void> {
		try {
			await tarea();
		} catch (cause: unknown) {
			console.warn("[sync] fallo al descargar cambios", cause);
		}
	}
}
