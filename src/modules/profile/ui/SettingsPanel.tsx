"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { getPathname } from "@/i18n/navigation";
import type { Plan } from "@/modules/billing/domain/plan";
import type { Dispositivo } from "@/modules/devices/domain/dispositivo";
import type { Perfil } from "@/modules/profile/domain/perfil";
import { obtenerDeviceId } from "@/shared/infrastructure/device";
import { createClient } from "@/shared/infrastructure/supabase/client";
import { zonasHorarias } from "@/shared/infrastructure/timezones";
import { ExportSection } from "./ExportSection";
import { SecuritySection } from "./SecuritySection";
import type { SettingsSection } from "./settingsSections";

interface SettingsPanelProps {
	email: string;
	userId: string;
	perfil: Perfil;
	dispositivos: Dispositivo[];
	seccion: SettingsSection;
	plan: Plan;
}

export function SettingsPanel({
	email,
	userId,
	perfil,
	dispositivos,
	seccion,
	plan,
}: SettingsPanelProps) {
	const t = useTranslations("Settings");
	const locale = useLocale();
	const router = useRouter();
	const [timezone, setTimezone] = useState(perfil.timezone);
	const [idioma, setIdioma] = useState<"en" | "es">(perfil.locale);
	const [guardando, setGuardando] = useState(false);
	const [mensaje, setMensaje] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [lista, setLista] = useState(dispositivos);
	const [actualId, setActualId] = useState<string | null>(null);
	const [editando, setEditando] = useState<string | null>(null);
	const [nombreEditado, setNombreEditado] = useState("");
	const [nombre, setNombre] = useState(perfil.displayName ?? "");
	const [guardandoPerfil, setGuardandoPerfil] = useState(false);
	const [perfilEstado, setPerfilEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(
		null,
	);
	const [cargandoDispositivos, setCargandoDispositivos] = useState(false);

	useEffect(() => {
		setActualId(obtenerDeviceId());
	}, []);

	useEffect(() => {
		if (seccion !== "devices") {
			return;
		}

		let activo = true;
		setCargandoDispositivos(true);
		const supabase = createClient();

		void supabase
			.from("devices")
			.select("id, name, platform, last_seen_at")
			.order("last_seen_at", { ascending: false })
			.then(({ data, error: fetchError }) => {
				if (!activo) return;

				if (fetchError) {
					setError(fetchError.message);
				} else if (data) {
					setLista(
						data.map((fila) => ({
							id: fila.id,
							nombre: fila.name,
							plataforma: fila.platform,
							ultimaConexion: fila.last_seen_at,
						})),
					);
				}

				setCargandoDispositivos(false);
			});

		return () => {
			activo = false;
		};
	}, [seccion]);

	const zonas = zonasHorarias(timezone);

	async function guardarPerfil(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const limpio = nombre.trim();

		if (limpio.length > 80) {
			setPerfilEstado({ tipo: "error", texto: t("profileError") });
			return;
		}

		setGuardandoPerfil(true);
		setPerfilEstado(null);

		const supabase = createClient();
		const { error: updateError } = await supabase
			.from("profiles")
			.update({ display_name: limpio || null })
			.eq("id", userId);

		if (updateError) {
			setPerfilEstado({ tipo: "error", texto: updateError.message });
		} else {
			setPerfilEstado({ tipo: "ok", texto: t("profileSaved") });
		}

		setGuardandoPerfil(false);
	}

	async function guardarPreferencias() {
		setGuardando(true);
		setError(null);
		setMensaje(null);

		const supabase = createClient();
		const { error: updateError } = await supabase
			.from("profiles")
			.update({ timezone, locale: idioma })
			.eq("id", userId);

		if (updateError) {
			setError(updateError.message);
			setGuardando(false);
			return;
		}

		setMensaje(t("saved"));
		setGuardando(false);

		if (idioma !== locale) {
			const ruta = getPathname({ locale: idioma, href: "/app/settings" });
			window.location.assign(`${ruta}?tab=preferences`);
		}
	}

	async function renombrar(id: string) {
		const nombre = nombreEditado.trim();

		if (!nombre) {
			return;
		}

		const supabase = createClient();
		const { error: renameError } = await supabase
			.from("devices")
			.update({ name: nombre })
			.eq("id", id);

		if (renameError) {
			setError(renameError.message);
			return;
		}

		setLista((actual) =>
			actual.map((dispositivo) =>
				dispositivo.id === id ? { ...dispositivo, nombre } : dispositivo,
			),
		);
		setEditando(null);
		router.refresh();
	}

	async function eliminar(id: string) {
		if (!window.confirm(t("deleteConfirm"))) {
			return;
		}

		const supabase = createClient();
		const { error: deleteError } = await supabase.from("devices").delete().eq("id", id);

		if (deleteError) {
			setError(deleteError.message);
			return;
		}

		setLista((actual) => actual.filter((dispositivo) => dispositivo.id !== id));
		router.refresh();
	}

	return (
		<div className="space-y-6">
			{seccion === "profile" ? (
				<form
					onSubmit={guardarPerfil}
					className="space-y-4 rounded-2xl border border-border bg-surface p-6"
				>
					<h2 className="text-sm font-medium text-foreground">{t("profile")}</h2>

					<label htmlFor="perfil-nombre" className="block space-y-1.5 text-sm">
						<span className="text-foreground">{t("name")}</span>
						<input
							id="perfil-nombre"
							value={nombre}
							onChange={(event) => setNombre(event.target.value)}
							maxLength={80}
							placeholder={t("namePlaceholder")}
							className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary"
						/>
					</label>

					<div className="space-y-1 text-sm">
						<p className="text-[10px] uppercase tracking-[0.18em] text-muted">{t("email")}</p>
						<p className="text-foreground">{email}</p>
					</div>

					{perfilEstado ? (
						<p
							className={`rounded-lg border px-3 py-2 text-sm ${
								perfilEstado.tipo === "ok"
									? "border-success-border bg-success-bg text-success-fg"
									: "border-danger-border bg-danger-bg text-danger-fg"
							}`}
						>
							{perfilEstado.texto}
						</p>
					) : null}

					<button
						type="submit"
						disabled={guardandoPerfil}
						className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
					>
						{guardandoPerfil ? t("saving") : t("saveProfile")}
					</button>
				</form>
			) : null}

			{seccion === "preferences" ? (
				<section className="rounded-2xl border border-border bg-surface p-6">
					<h2 className="text-sm font-medium text-foreground">{t("preferences")}</h2>

					<div className="mt-4 grid gap-4 sm:grid-cols-2">
						<label className="space-y-1.5 text-sm">
							<span className="text-foreground">{t("timezone")}</span>
							<select
								value={timezone}
								onChange={(event) => setTimezone(event.target.value)}
								className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
							>
								{zonas.map((zona) => (
									<option key={zona} value={zona}>
										{zona}
									</option>
								))}
							</select>
							<span className="text-xs text-muted">{t("timezoneHint")}</span>
						</label>

						<label className="space-y-1.5 text-sm">
							<span className="text-foreground">{t("language")}</span>
							<select
								value={idioma}
								onChange={(event) => setIdioma(event.target.value === "es" ? "es" : "en")}
								className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
							>
								<option value="en">English</option>
								<option value="es">Español</option>
							</select>
							<span className="text-xs text-muted">{t("languageHint")}</span>
						</label>
					</div>

					{error ? (
						<p className="mt-4 rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg">
							{error}
						</p>
					) : null}

					{mensaje ? (
						<p className="mt-4 rounded-lg border border-success-border bg-success-bg px-3 py-2 text-sm text-success-fg">
							{mensaje}
						</p>
					) : null}

					<button
						type="button"
						onClick={guardarPreferencias}
						disabled={guardando}
						className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
					>
						{guardando ? t("saving") : t("save")}
					</button>
				</section>
			) : null}

			{seccion === "devices" ? (
				<section className="rounded-2xl border border-border bg-surface p-6">
					<h2 className="text-sm font-medium text-foreground">{t("devices")}</h2>

					{cargandoDispositivos ? (
						<p className="mt-4 text-sm text-muted">{t("loadingDevices")}</p>
					) : lista.length === 0 ? (
						<p className="mt-4 text-sm text-muted">{t("noDevices")}</p>
					) : (
						<ul className="mt-4 space-y-3">
							{lista.map((dispositivo) => (
								<li
									key={dispositivo.id}
									className="rounded-xl border border-border bg-surface-muted px-4 py-3"
								>
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div className="space-y-0.5">
											{editando === dispositivo.id ? (
												<div className="flex items-center gap-2">
													<input
														value={nombreEditado}
														onChange={(event) => setNombreEditado(event.target.value)}
														aria-label={t("deviceName")}
														className="w-48 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
													/>
													<button
														type="button"
														onClick={() => renombrar(dispositivo.id)}
														className="text-xs text-primary hover:underline"
													>
														{t("saveName")}
													</button>
													<button
														type="button"
														onClick={() => setEditando(null)}
														className="text-xs text-muted hover:text-foreground"
													>
														{t("cancel")}
													</button>
												</div>
											) : (
												<p className="text-sm text-foreground">
													{dispositivo.nombre}
													{dispositivo.id === actualId ? (
														<span className="ml-2 rounded-full border border-success-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
															{t("current")}
														</span>
													) : null}
												</p>
											)}
											<p className="text-xs text-muted">
												{dispositivo.plataforma ?? "web"} ·{" "}
												{t("lastSeen", {
													date: new Intl.DateTimeFormat(locale, {
														dateStyle: "medium",
														timeStyle: "short",
													}).format(new Date(dispositivo.ultimaConexion)),
												})}
											</p>
										</div>

										<div className="flex items-center gap-3 text-xs">
											<button
												type="button"
												onClick={() => {
													setEditando(dispositivo.id);
													setNombreEditado(dispositivo.nombre);
												}}
												className="text-muted transition hover:text-foreground"
											>
												{t("rename")}
											</button>
											<button
												type="button"
												onClick={() => eliminar(dispositivo.id)}
												className="text-muted transition hover:text-danger-fg"
											>
												{t("delete")}
											</button>
										</div>
									</div>
								</li>
							))}
						</ul>
					)}
				</section>
			) : null}

			{seccion === "security" ? <SecuritySection email={email} /> : null}

			{seccion === "export" ? <ExportSection guest={false} plan={plan} /> : null}
		</div>
	);
}
