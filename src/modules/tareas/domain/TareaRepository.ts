import type { EstadoTarea, Tarea } from "./tarea";

export interface TareaRepository {
	listar(): Promise<Tarea[]>;
	crear(nombre: string): Promise<Tarea>;
	cambiarEstado(id: string, estado: EstadoTarea): Promise<void>;
	eliminar(id: string): Promise<void>;
}
