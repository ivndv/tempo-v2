"use client";

import { LoaderCircle, UserPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/shared/infrastructure/supabase/client";
import { botonPrimario, botonSecundario, campo, enlace } from "./styles";
import { Turnstile } from "./Turnstile";

export function RegistroForm() {
	const t = useTranslations("Auth");
	const locale = useLocale();
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmacion, setConfirmacion] = useState("");
	const [token, setToken] = useState("");
	const [resetSignal, setResetSignal] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [mensaje, setMensaje] = useState<string | null>(null);
	const [cargando, setCargando] = useState(false);
	const googleHabilitado = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
	const appPath = locale === "es" ? "/es/app" : "/app";

	async function registrar(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (password !== confirmacion) {
			setError(t("passwordsMismatch"));
			return;
		}

		if (!token) {
			setError(t("captchaRequired"));
			return;
		}

		setError(null);
		setMensaje(null);
		setCargando(true);

		const supabase = createClient();
		const { data, error: authError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(appPath)}`,
				captchaToken: token,
			},
		});

		if (authError) {
			setError(authError.message);
			setResetSignal((valor) => valor + 1);
			setCargando(false);
			return;
		}

		if (data.session) {
			router.replace("/app");
			router.refresh();
			return;
		}

		setMensaje(t("signupSent"));
		setCargando(false);
	}

	async function iniciarConGoogle() {
		if (!googleHabilitado) {
			setError(t("googleDisabled"));
			return;
		}

		setError(null);
		const supabase = createClient();
		const { error: authError } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(appPath)}`,
			},
		});

		if (authError) {
			setError(authError.message);
		}
	}

	return (
		<div className="space-y-6">
			<form onSubmit={registrar} className="space-y-4">
				<label htmlFor="email" className="block space-y-1.5 text-sm">
					<span className="text-foreground">{t("email")}</span>
					<input
						id="email"
						name="email"
						type="email"
						required
						autoComplete="email"
						placeholder={t("emailPlaceholder")}
						className={campo}
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>
				</label>

				<label htmlFor="password" className="block space-y-1.5 text-sm">
					<span className="text-foreground">{t("password")}</span>
					<input
						id="password"
						name="password"
						type="password"
						required
						minLength={8}
						autoComplete="new-password"
						placeholder={t("newPasswordPlaceholder")}
						className={campo}
						value={password}
						onChange={(event) => setPassword(event.target.value)}
					/>
				</label>

				<label htmlFor="confirmPassword" className="block space-y-1.5 text-sm">
					<span className="text-foreground">{t("confirmPassword")}</span>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						required
						minLength={8}
						autoComplete="new-password"
						placeholder={t("confirmPlaceholder")}
						className={campo}
						value={confirmacion}
						onChange={(event) => setConfirmacion(event.target.value)}
					/>
				</label>

				<Turnstile onToken={setToken} resetSignal={resetSignal} />

				{error ? (
					<p
						role="alert"
						className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg"
					>
						{error}
					</p>
				) : null}

				{mensaje ? (
					<p className="rounded-lg border border-success-border bg-success-bg px-3 py-2 text-sm text-success-fg">
						{mensaje}
					</p>
				) : null}

				<button type="submit" disabled={cargando || !token} className={`${botonPrimario} w-full`}>
					{cargando ? (
						<>
							<LoaderCircle size={16} className="animate-spin" aria-hidden />
							{t("signingUp")}
						</>
					) : (
						<>
							<UserPlus size={16} aria-hidden />
							{t("signup")}
						</>
					)}
				</button>
			</form>

			<div className="flex items-center gap-3">
				<span className="h-px flex-1 bg-surface-muted" />
				<span className="text-[10px] uppercase tracking-wide text-muted">{t("or")}</span>
				<span className="h-px flex-1 bg-surface-muted" />
			</div>

			<button
				type="button"
				onClick={iniciarConGoogle}
				disabled={!googleHabilitado}
				title={googleHabilitado ? t("google") : t("googleDisabled")}
				className={`${botonSecundario} w-full`}
			>
				{t("google")}
			</button>

			<p className="text-center text-sm text-muted">
				<Link href="/login" className={enlace}>
					{t("login")}
				</Link>
			</p>
		</div>
	);
}
