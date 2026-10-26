import type { PerfilRepository } from "../domain/PerfilRepository";
import type { Perfil } from "../domain/perfil";

export class ObtenerPerfil {
	constructor(private readonly perfiles: PerfilRepository) {}

	execute(): Promise<Perfil> {
		return this.perfiles.obtener();
	}
}
