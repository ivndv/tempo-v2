import type { DiaResumen } from "../domain/dashboard";

interface WeeklyFocusChartProps {
	serie: DiaResumen[];
	title: string;
	subtitle?: string;
	empty: string;
	locale: string;
}

export function WeeklyFocusChart({ serie, title, subtitle, empty, locale }: WeeklyFocusChartProps) {
	const maximo = Math.max(...serie.map((dia) => dia.focusMinutes), 60);
	const vacio = serie.every((dia) => dia.focusMinutes === 0);

	return (
		<section className="rounded-2xl border border-border bg-surface p-6">
			<div className="flex flex-wrap items-baseline justify-between gap-3">
				<h2 className="text-sm font-medium text-foreground">{title}</h2>
				{subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
			</div>

			{vacio ? (
				<p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
					{empty}
				</p>
			) : (
				<div className="mt-4 overflow-x-auto">
					<div className="flex h-32 min-w-full items-end gap-1">
						{serie.map((dia) => {
							const altura = Math.max(4, Math.round((dia.focusMinutes / maximo) * 100));
							const etiqueta = `${formatDate(dia.date, locale)}: ${formatMinutes(dia.focusMinutes)}`;

							return (
								<div
									key={dia.date}
									role="img"
									className="group flex h-full min-w-[6px] flex-1 flex-col justify-end"
									title={etiqueta}
									aria-label={etiqueta}
								>
									<div
										className="w-full rounded-t bg-info/70 transition group-hover:bg-info"
										style={{ height: `${altura}%` }}
									/>
								</div>
							);
						})}
					</div>

					<div className="mt-2 flex justify-between text-[10px] text-muted">
						<span>{formatDate(serie[0]?.date, locale)}</span>
						<span>{formatDate(serie.at(-1)?.date, locale)}</span>
					</div>
				</div>
			)}
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

function formatDate(fecha: string | undefined, locale: string): string {
	if (!fecha) {
		return "";
	}

	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
	}).format(new Date(`${fecha}T12:00:00`));
}
