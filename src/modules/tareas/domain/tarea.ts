import { DomainError } from "@/shared/domain/errors";

export const ESTADOS_TAREA = ["pending", "in_progress", "done", "abandoned"] as const;

export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

export interface Tarea {
	id: string;
	userId: string;
	bloqueId: string | null;
	nombre: string;
	estado: EstadoTarea;
	createdAt: string;
	completedAt: string | null;
	deletedAt: string | null;
}

export function esEstadoTarea(value: string): value is EstadoTarea {
	return (ESTADOS_TAREA as readonly string[]).includes(value);
}

export function validarNombreTarea(nombre: string): string {
	const limpio = nombre.trim();

	if (!limpio || limpio.length > 100) {
		throw new DomainError(
			"El nombre de la tarea debe tener entre 1 y 100 caracteres",
			"tarea_nombre_invalido",
		);
	}

	return limpio;
}
