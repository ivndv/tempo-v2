import type { NuevoOutboxItem, OutboxItem } from "./outbox";

export interface OutboxRepository {
	encolar(item: NuevoOutboxItem): Promise<void>;
	listarPendientes(limite?: number): Promise<OutboxItem[]>;
	marcarEnProceso(id: string): Promise<void>;
	marcarSincronizado(id: string): Promise<void>;
	marcarFallido(id: string, error: string): Promise<void>;
	contarPendientes(): Promise<number>;
	contarMuertos(): Promise<number>;
}
