"use client";

import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { getPathname } from "@/i18n/navigation";
import { getClientContainer } from "@/shared/infrastructure/clientContainer";

interface SecuritySectionProps {
	email: string;
}

export function SecuritySection({ email }: SecuritySectionProps) {
	const t = useTranslations("Settings");
	const locale = useLocale();
	const [nuevoCorreo, setNuevoCorreo] = useState("");
	const [password, setPassword] = useState("");
	const [confirmacion, setConfirmacion] = useState("");
	const [correoEstado, setCorreoEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(
		null,
	);
	const [passwordEstado, setPasswordEstado] = useState<{
		tipo: "ok" | "error";
		texto: string;
	} | null>(null);
	const [guardandoCorreo, setGuardandoCorreo] = useState(false);
	const [guardandoPassword, setGuardandoPassword] = useState(false);

	function rutaSeguridad(): string {
		return `${getPathname({ locale, href: "/app/settings" })}?tab=security`;
	}

	async function cambiarCorreo(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (nuevoCorreo.trim().toLowerCase() === email.toLowerCase()) {
			setCorreoEstado({ tipo: "error", texto: t("emailSame") });
			return;
		}

		setGuardandoCorreo(true);
		setCorreoEstado(null);

		const resultado = await getClientContainer().auth.cambiarEmail(
			nuevoCorreo.trim(),
			`${window.location.origin}/auth/callback?next=${encodeURIComponent(rutaSeguridad())}`,
		);

		if (!resultado.ok) {
			setCorreoEstado({ tipo: "error", texto: resultado.error ?? t("securityError") });
		} else {
			setCorreoEstado({ tipo: "ok", texto: t("emailSent") });
			setNuevoCorreo("");
		}

		setGuardandoCorreo(false);
	}

	async function cambiarPassword(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (password.length < 8) {
			setPasswordEstado({ tipo: "error", texto: t("passwordLength") });
			return;
		}

		if (password !== confirmacion) {
			setPasswordEstado({ tipo: "error", texto: t("passwordsMismatch") });
			return;
		}

		setGuardandoPassword(true);
		setPasswordEstado(null);

		const resultado = await getClientContainer().auth.cambiarPassword(password);

		if (!resultado.ok) {
			setPasswordEstado({ tipo: "error", texto: resultado.error ?? t("securityError") });
		} else {
			setPasswordEstado({ tipo: "ok", texto: t("passwordUpdated") });
			setPassword("");
			setConfirmacion("");
		}

		setGuardandoPassword(false);
	}

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">{t("securityTitle")}</h2>
				<p className="text-sm text-muted">{t("securitySubtitle")}</p>
			</div>

			<form
				onSubmit={cambiarCorreo}
				className="space-y-4 rounded-2xl border border-border bg-surface p-6"
			>
				<h3 className="text-sm font-medium text-foreground">{t("emailTitle")}</h3>

				<div className="space-y-1 text-sm">
					<p className="text-[10px] uppercase tracking-[0.18em] text-muted">{t("currentEmail")}</p>
					<p className="text-foreground">{email}</p>
				</div>

				<label htmlFor="nuevo-correo" className="block space-y-1.5 text-sm">
					<span className="text-foreground">{t("newEmail")}</span>
					<input
						id="nuevo-correo"
						type="email"
						required
						autoComplete="email"
						value={nuevoCorreo}
						onChange={(event) => setNuevoCorreo(event.target.value)}
						className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary"
					/>
				</label>

				<p className="text-xs text-muted">{t("emailNote")}</p>

				{correoEstado ? (
					<p
						className={`rounded-lg border px-3 py-2 text-sm ${
							correoEstado.tipo === "ok"
								? "border-success-border bg-success-bg text-success-fg"
								: "border-danger-border bg-danger-bg text-danger-fg"
						}`}
					>
						{correoEstado.texto}
					</p>
				) : null}

				<button
					type="submit"
					disabled={guardandoCorreo}
					className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
				>
					{guardandoCorreo ? t("saving") : t("updateEmail")}
				</button>
			</form>

			<form
				onSubmit={cambiarPassword}
				className="space-y-4 rounded-2xl border border-border bg-surface p-6"
			>
				<h3 className="text-sm font-medium text-foreground">{t("passwordTitle")}</h3>

				<label htmlFor="nueva-password" className="block space-y-1.5 text-sm">
					<span className="text-foreground">{t("newPassword")}</span>
					<input
						id="nueva-password"
						type="password"
						required
						minLength={8}
						autoComplete="new-password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary"
					/>
				</label>

				<label htmlFor="confirmar-password" className="block space-y-1.5 text-sm">
					<span className="text-foreground">{t("confirmPassword")}</span>
					<input
						id="confirmar-password"
						type="password"
						required
						minLength={8}
						autoComplete="new-password"
						value={confirmacion}
						onChange={(event) => setConfirmacion(event.target.value)}
						className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary"
					/>
				</label>

				<p className="text-xs text-muted">{t("passwordNote")}</p>

				{passwordEstado ? (
					<p
						className={`rounded-lg border px-3 py-2 text-sm ${
							passwordEstado.tipo === "ok"
								? "border-success-border bg-success-bg text-success-fg"
								: "border-danger-border bg-danger-bg text-danger-fg"
						}`}
					>
						{passwordEstado.texto}
					</p>
				) : null}

				<button
					type="submit"
					disabled={guardandoPassword}
					className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
				>
					{guardandoPassword ? t("saving") : t("updatePassword")}
				</button>
			</form>
		</div>
	);
}
