"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useLocale, useTranslations } from "next-intl";
import { getClientContainer } from "@/shared/infrastructure/clientContainer";
import type { DiaResumen } from "../domain/estadisticas";

export function WeeklyChart() {
	const t = useTranslations("Stats");
	const locale = useLocale();
	const dias = useLiveQuery<DiaResumen[]>(async () => {
		try {
			return await getClientContainer().analytics.ultimosDias.execute(7);
		} catch {
			return [];
		}
	}, []);

	const lista = dias ?? [];
	const total = lista.reduce((suma, dia) => suma + dia.minutos, 0);
	const promedio = lista.length > 0 ? Math.round(total / lista.length) : 0;
	const maximo = Math.max(...lista.map((dia) => dia.minutos), 60);

	return (
		<section className="rounded-2xl border border-border bg-surface p-5">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="text-xs font-medium uppercase tracking-[0.25em] text-muted">{t("last7")}</h2>
				<p className="text-xs text-muted">
					{t("total", {
						total: formatMinutes(total),
						average: formatMinutes(promedio),
					})}
				</p>
			</div>

			<div className="mt-5 flex h-36 items-end gap-2">
				{lista.map((dia) => {
					const altura = Math.max(3, Math.round((dia.minutos / maximo) * 100));
					const etiqueta = `${formatDate(dia.fecha, locale)}: ${formatMinutes(dia.minutos)} · ${dia.sesiones}`;

					return (
						<div
							key={dia.fecha}
							role="img"
							aria-label={etiqueta}
							title={etiqueta}
							className="flex h-full flex-1 flex-col items-center justify-end gap-2"
						>
							<div className="flex w-full flex-1 items-end">
								<div
									className="w-full rounded-t bg-primary/70 transition hover:bg-primary-hover"
									style={{ height: `${altura}%` }}
								/>
							</div>
							<span className="text-[10px] uppercase text-muted">
								{formatWeekday(dia.fecha, locale)}
							</span>
						</div>
					);
				})}
			</div>
		</section>
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

function formatDate(fecha: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
	}).format(new Date(`${fecha}T12:00:00`));
}

function formatWeekday(fecha: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, { weekday: "short" })
		.format(new Date(`${fecha}T12:00:00`))
		.replace(".", "")
		.slice(0, 3);
}
