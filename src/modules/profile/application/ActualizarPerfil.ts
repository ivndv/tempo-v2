import type { PerfilRepository } from "../domain/PerfilRepository";
import type { Perfil } from "../domain/perfil";

export class ActualizarPerfil {
	constructor(private readonly perfiles: PerfilRepository) {}

	execute(cambios: Partial<Perfil>): Promise<void> {
		return this.perfiles.actualizar(cambios);
	}
}
