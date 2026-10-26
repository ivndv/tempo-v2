"use client";

import { LoaderCircle, Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/shared/infrastructure/supabase/client";
import { botonPrimario, campo, enlace } from "./styles";
import { Turnstile } from "./Turnstile";

export function RecuperarForm() {
	const t = useTranslations("Auth");
	const locale = useLocale();
	const [email, setEmail] = useState("");
	const [token, setToken] = useState("");
	const [resetSignal, setResetSignal] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [mensaje, setMensaje] = useState<string | null>(null);
	const [cargando, setCargando] = useState(false);
	const resetPath = locale === "es" ? "/es/restablecer" : "/reset-password";

	async function recuperar(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!token) {
			setError(t("captchaRequired"));
			return;
		}

		setError(null);
		setMensaje(null);
		setCargando(true);

		const supabase = createClient();
		const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(resetPath)}`,
			captchaToken: token,
		});

		if (authError && /captcha/i.test(authError.message)) {
			setError(authError.message);
			setResetSignal((valor) => valor + 1);
			setCargando(false);
			return;
		}

		// Respuesta neutra para no revelar si el correo existe.
		setMensaje(t("recoverySent"));
		setCargando(false);
	}

	return (
		<div className="space-y-6">
			<form onSubmit={recuperar} className="space-y-4">
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
							{t("sending")}
						</>
					) : (
						<>
							<Mail size={16} aria-hidden />
							{t("sendLink")}
						</>
					)}
				</button>
			</form>

			<p className="text-center text-sm text-muted">
				<Link href="/login" className={enlace}>
					{t("login")}
				</Link>
			</p>
		</div>
	);
}
