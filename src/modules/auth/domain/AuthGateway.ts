export interface Usuario {
	id: string;
	email: string;
}

export interface AuthGateway {
	obtenerUsuario(): Promise<Usuario | null>;
	cerrarSesion(): Promise<void>;
}
