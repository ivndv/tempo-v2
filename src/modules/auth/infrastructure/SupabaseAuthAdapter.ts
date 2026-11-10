import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";
import type {
	AuthGateway,
	CredencialesInicioSesion,
	DatosRegistro,
	ResultadoAuth,
	Usuario,
} from "../domain/AuthGateway";

function mapearUsuario(user: User | null | undefined): Usuario | null {
	if (!user) {
		return null;
	}

	return { id: user.id, email: user.email ?? "" };
}

export class SupabaseAuthAdapter implements AuthGateway {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async obtenerUsuario(): Promise<Usuario | null> {
		// Con ES256 getClaims verifica la firma localmente (sin red).
		// Si el proyecto vuelve a HS256, cae solo a getUser.
		const { data, error } = await this.supabase.auth.getClaims();

		if (error || !data?.claims) {
			return null;
		}

		const sub = data.claims.sub;

		if (typeof sub !== "string") {
			return null;
		}

		let email = typeof data.claims.email === "string" ? data.claims.email : "";

		// Algunos proveedores no incluyen email en el token: se pide el usuario.
		if (!email) {
			const { data: completo } = await this.supabase.auth.getUser();
			email = completo.user?.email ?? "";
		}

		return { id: sub, email };
	}

	async obtenerSesion(): Promise<Usuario | null> {
		const { data } = await this.supabase.auth.getSession();
		return mapearUsuario(data.session?.user);
	}

	observarSesion(callback: (usuario: Usuario | null) => void): () => void {
		let activo = true;

		void this.obtenerSesion().then((usuario) => {
			if (activo) {
				callback(usuario);
			}
		});

		const { data } = this.supabase.auth.onAuthStateChange((_evento, sesion) => {
			if (activo) {
				callback(mapearUsuario(sesion?.user));
			}
		});

		return () => {
			activo = false;
			data.subscription.unsubscribe();
		};
	}

	async iniciarSesion({
		email,
		password,
		captchaToken,
	}: CredencialesInicioSesion): Promise<ResultadoAuth> {
		const { error } = await this.supabase.auth.signInWithPassword({
			email,
			password,
			options: { captchaToken },
		});

		return error ? { ok: false, error: error.message } : { ok: true };
	}

	async registrar({
		email,
		password,
		captchaToken,
		redirectTo,
	}: DatosRegistro): Promise<ResultadoAuth> {
		const { data, error } = await this.supabase.auth.signUp({
			email,
			password,
			options: { emailRedirectTo: redirectTo, captchaToken },
		});

		if (error) {
			return { ok: false, error: error.message };
		}

		if (!data.user) {
			return { ok: false, error: "No se pudo crear la cuenta" };
		}

		return { ok: true, requiereVerificacion: !data.session };
	}

	async iniciarConGoogle(redirectTo: string): Promise<ResultadoAuth> {
		const { error } = await this.supabase.auth.signInWithOAuth({
			provider: "google",
			options: { redirectTo },
		});

		return error ? { ok: false, error: error.message } : { ok: true };
	}

	async solicitarRecuperacion(
		email: string,
		redirectTo: string,
		captchaToken?: string,
	): Promise<ResultadoAuth> {
		const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
			redirectTo,
			captchaToken,
		});

		return error ? { ok: false, error: error.message } : { ok: true };
	}

	async restablecerPassword(password: string): Promise<ResultadoAuth> {
		const { error } = await this.supabase.auth.updateUser({ password });
		return error ? { ok: false, error: error.message } : { ok: true };
	}

	async cambiarEmail(email: string, redirectTo: string): Promise<ResultadoAuth> {
		const { error } = await this.supabase.auth.updateUser(
			{ email },
			{ emailRedirectTo: redirectTo },
		);

		return error ? { ok: false, error: error.message } : { ok: true };
	}

	async cambiarPassword(password: string): Promise<ResultadoAuth> {
		const { error } = await this.supabase.auth.updateUser({ password });
		return error ? { ok: false, error: error.message } : { ok: true };
	}

	async cerrarSesion(): Promise<void> {
		await this.supabase.auth.signOut();
	}
}
