"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { getPathname, Link } from "@/i18n/navigation";
import { guardarZonaHoraria, leerZonaHoraria } from "@/shared/infrastructure/preferences";
import { zonasHorarias } from "@/shared/infrastructure/timezones";
import { ExportSection } from "./ExportSection";
import type { SettingsSection } from "./settingsSections";

// Preferencias de invitado: viven en este navegador.
export function GuestSettingsPanel({ seccion }: { seccion: SettingsSection }) {
	const t = useTranslations("Settings");
	const locale = useLocale();
	const [timezone, setTimezone] = useState("America/Mexico_City");
	const [guardado, setGuardado] = useState(false);

	useEffect(() => {
		setTimezone(leerZonaHoraria());
	}, []);

	const zonas = zonasHorarias(timezone);

	if (seccion === "export") {
		return <ExportSection guest plan="free" />;
	}

	function guardar() {
		guardarZonaHoraria(timezone);
		setGuardado(true);
	}

	function cambiarIdioma(destino: "en" | "es") {
		window.location.assign(
			`${getPathname({ locale: destino, href: "/app/settings" })}?tab=preferences`,
		);
	}

	return (
		<div className="space-y-6">
			<section className="rounded-2xl border border-border bg-surface p-6">
				<h2 className="text-sm font-medium text-foreground">{t("preferences")}</h2>

				<div className="mt-4 grid gap-4 sm:grid-cols-2">
					<label className="space-y-1.5 text-sm">
						<span className="text-foreground">{t("timezone")}</span>
						<select
							value={timezone}
							onChange={(event) => {
								setTimezone(event.target.value);
								setGuardado(false);
							}}
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

					<div className="space-y-1.5 text-sm">
						<span className="text-foreground">{t("language")}</span>
						<div className="flex gap-2">
							{(["en", "es"] as const).map((opcion) => (
								<button
									key={opcion}
									type="button"
									onClick={() => cambiarIdioma(opcion)}
									aria-pressed={locale === opcion}
									className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
										locale === opcion
											? "border-primary bg-primary/10 text-primary"
											: "border-border text-muted hover:border-foreground/40 hover:text-foreground"
									}`}
								>
									{opcion === "en" ? "English" : "Español"}
								</button>
							))}
						</div>
						<span className="text-xs text-muted">{t("languageHint")}</span>
					</div>
				</div>

				{guardado ? (
					<p className="mt-4 rounded-lg border border-success-border bg-success-bg px-3 py-2 text-sm text-success-fg">
						{t("saved")}
					</p>
				) : null}

				<button
					type="button"
					onClick={guardar}
					className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
				>
					{t("save")}
				</button>
			</section>

			<section className="space-y-3 rounded-2xl border border-success-border bg-success-bg p-6">
				<p className="text-sm leading-relaxed text-success-fg">{t("guestText")}</p>
				<Link
					href="/signup"
					className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
				>
					{t("guestCta")}
				</Link>
			</section>
		</div>
	);
}
