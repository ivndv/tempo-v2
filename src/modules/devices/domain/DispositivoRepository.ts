import type { Dispositivo } from "./dispositivo";

export interface DispositivoRepository {
	listar(): Promise<Dispositivo[]>;
	renombrar(id: string, nombre: string): Promise<void>;
	eliminar(id: string): Promise<void>;
}
