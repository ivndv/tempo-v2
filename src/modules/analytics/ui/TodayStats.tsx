"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { ObtenerEstadisticasHoy } from "../application/ObtenerEstadisticasHoy";
import { ESTADISTICAS_HOY_VACIAS, type EstadisticasHoy } from "../domain/estadisticas";
import { DexieEstadisticasRepository } from "../infrastructure/DexieEstadisticasRepository";

export function TodayStats() {
	const t = useTranslations("Stats");
	const servicio = useMemo(() => new ObtenerEstadisticasHoy(new DexieEstadisticasRepository()), []);
	const datos = useLiveQuery<EstadisticasHoy>(async () => {
		try {
			return await servicio.execute();
		} catch {
			return ESTADISTICAS_HOY_VACIAS;
		}
	}, [servicio]);

	const stats = datos ?? ESTADISTICAS_HOY_VACIAS;

	return (
		<section className="rounded-2xl border border-border bg-surface p-5">
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="text-xs font-medium uppercase tracking-[0.25em] text-muted">{t("today")}</h2>
				<p className="text-xs text-muted">
					{t("todayCount", {
						completed: stats.pomodorosCompletados,
						interrupted: stats.pomodorosInterrumpidos,
					})}
				</p>
			</div>

			<div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
				<Stat etiqueta={t("focus")} valor={formatMinutes(stats.focusMinutos)} />
				<Stat etiqueta={t("shortBreak")} valor={formatMinutes(stats.breaksCortosMinutos)} />
				<Stat etiqueta={t("longBreak")} valor={formatMinutes(stats.breaksLargosMinutos)} />
				<Stat
					etiqueta={t("breaks")}
					valor={`${stats.breaksCompletados} / ${stats.breaksSaltados}`}
				/>
			</div>
		</section>
	);
}

function Stat({ etiqueta, valor }: { etiqueta: string; valor: string }) {
	return (
		<div>
			<p className="text-[10px] uppercase tracking-[0.18em] text-muted">{etiqueta}</p>
			<p className="mt-1 text-lg font-semibold text-foreground">{valor}</p>
		</div>
	);
}

function formatMinutes(minutos: number): string {
	if (minutos < 60) {
		return `${minutos} min`;
	}

	const horas = Math.floor(minutos / 60);
	const resto = minutos % 60;
	return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
