export interface Usuario {
	id: string;
	email: string;
}

export interface CredencialesInicioSesion {
	email: string;
	password: string;
	captchaToken?: string;
}

export interface DatosRegistro {
	email: string;
	password: string;
	captchaToken?: string;
	redirectTo: string;
}

export interface ResultadoAuth {
	ok: boolean;
	error?: string;
	requiereVerificacion?: boolean;
}

export interface AuthGateway {
	obtenerUsuario(): Promise<Usuario | null>;
	obtenerSesion(): Promise<Usuario | null>;
	observarSesion(callback: (usuario: Usuario | null) => void): () => void;
	iniciarSesion(credenciales: CredencialesInicioSesion): Promise<ResultadoAuth>;
	registrar(datos: DatosRegistro): Promise<ResultadoAuth>;
	iniciarConGoogle(redirectTo: string): Promise<ResultadoAuth>;
	solicitarRecuperacion(
		email: string,
		redirectTo: string,
		captchaToken?: string,
	): Promise<ResultadoAuth>;
	restablecerPassword(password: string): Promise<ResultadoAuth>;
	cambiarEmail(email: string, redirectTo: string): Promise<ResultadoAuth>;
	cambiarPassword(password: string): Promise<ResultadoAuth>;
	cerrarSesion(): Promise<void>;
}
