import type { Perfil } from "./perfil";

export interface PerfilRepository {
	obtener(): Promise<Perfil>;
	actualizar(cambios: Partial<Perfil>): Promise<void>;
}
