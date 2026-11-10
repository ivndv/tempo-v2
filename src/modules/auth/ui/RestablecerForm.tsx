"use client";

import { KeyRound, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { getClientContainer } from "@/shared/infrastructure/clientContainer";
import { botonPrimario, campo, enlace } from "./styles";

export function RestablecerForm() {
	const t = useTranslations("Auth");
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [confirmacion, setConfirmacion] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [cargando, setCargando] = useState(false);
	const [sesionValida, setSesionValida] = useState<boolean | null>(null);

	useEffect(() => {
		let activo = true;

		getClientContainer()
			.auth.obtenerSesion()
			.then((usuario) => {
				if (activo) setSesionValida(Boolean(usuario));
			})
			.catch(() => {
				if (activo) setSesionValida(false);
			});

		return () => {
			activo = false;
		};
	}, []);

	async function restablecer(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (password !== confirmacion) {
			setError(t("passwordsMismatch"));
			return;
		}

		if (password.length < 8) {
			setError(t("passwordLength"));
			return;
		}

		setError(null);
		setCargando(true);

		const resultado = await getClientContainer().auth.restablecerPassword(password);

		if (!resultado.ok) {
			setError(resultado.error ?? t("resetError"));
			setCargando(false);
			return;
		}

		router.replace("/app");
		router.refresh();
	}

	if (sesionValida === false) {
		return (
			<div className="space-y-4 text-center text-sm text-muted">
				<p>{t("expired")}</p>
				<Link href="/forgot-password" className={enlace}>
					{t("requestAnother")}
				</Link>
			</div>
		);
	}

	return (
		<form onSubmit={restablecer} className="space-y-4">
			<label htmlFor="password" className="block space-y-1.5 text-sm">
				<span className="text-foreground">{t("newPassword")}</span>
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

			{error ? (
				<p
					role="alert"
					className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg"
				>
					{error}
				</p>
			) : null}

			<button
				type="submit"
				disabled={cargando || sesionValida === null}
				className={`${botonPrimario} w-full`}
			>
				{cargando ? (
					<>
						<LoaderCircle size={16} className="animate-spin" aria-hidden />
						{t("saving")}
					</>
				) : (
					<>
						<KeyRound size={16} aria-hidden />
						{t("savePassword")}
					</>
				)}
			</button>
		</form>
	);
}
