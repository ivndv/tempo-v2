import type { Perfil } from "./perfil";

export interface PerfilRepository {
	obtener(): Promise<Perfil>;
}
