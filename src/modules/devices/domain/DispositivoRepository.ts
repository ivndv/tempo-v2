import type { Dispositivo } from "./dispositivo";

export interface DatosRegistroDispositivo {
	id: string;
	nombre: string;
	plataforma: string | null;
	tema?: string | null;
}

export interface ResultadoRegistroDispositivo {
	tema: string | null;
}

export interface DispositivoRepository {
	listar(): Promise<Dispositivo[]>;
	registrar(datos: DatosRegistroDispositivo): Promise<ResultadoRegistroDispositivo>;
	renombrar(id: string, nombre: string): Promise<void>;
	eliminar(id: string): Promise<void>;
	actualizarTema(id: string, tema: string): Promise<void>;
}
