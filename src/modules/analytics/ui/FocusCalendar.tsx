import { Fragment } from "react";
import type { CalendarCell } from "../domain/dashboard";

interface FocusCalendarProps {
	cells: CalendarCell[];
	title: string;
	subtitle?: string;
	empty: string;
	locale: string;
	sessionsLabel: (count: number) => string;
}

interface SemanaCalendario {
	start: string;
	days: (CalendarCell | null)[];
}

type ModoCalendario = "semana" | "mes" | "heatmap";

const REFERENCIA_LUNES = Date.UTC(2024, 0, 1, 12);

export function FocusCalendar({
	cells,
	title,
	subtitle,
	empty,
	locale,
	sessionsLabel,
}: FocusCalendarProps) {
	const semanas = construirSemanas(cells);
	const maximo = Math.max(...cells.map((celda) => celda.focusMinutes), 1);
	const diasSemana = Array.from({ length: 7 }, (_, indice) =>
		new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
			new Date(REFERENCIA_LUNES + indice * 86_400_000),
		),
	);
	const mostrarAnio = new Set(cells.map((celda) => celda.date.slice(0, 4))).size > 1;
	const modo: ModoCalendario =
		cells.length <= 7 ? "semana" : semanas.length <= 6 ? "mes" : "heatmap";

	return (
		<section className="rounded-2xl border border-border bg-surface p-6">
			<div className="flex flex-wrap items-baseline justify-between gap-3">
				<h2 className="text-sm font-medium text-foreground">{title}</h2>
				{subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
			</div>

			{cells.length === 0 ? (
				<p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
					{empty}
				</p>
			) : modo === "semana" ? (
				<VistaSemana
					cells={cells}
					locale={locale}
					mostrarAnio={mostrarAnio}
					maximo={maximo}
					sessionsLabel={sessionsLabel}
				/>
			) : modo === "mes" ? (
				<VistaMes
					cells={cells}
					semanas={semanas}
					diasSemana={diasSemana}
					locale={locale}
					mostrarAnio={mostrarAnio}
					maximo={maximo}
					sessionsLabel={sessionsLabel}
				/>
			) : (
				<VistaHeatmap
					semanas={semanas}
					diasSemana={diasSemana}
					locale={locale}
					mostrarAnio={mostrarAnio}
					maximo={maximo}
					sessionsLabel={sessionsLabel}
				/>
			)}
		</section>
	);
}

function VistaSemana({
	cells,
	locale,
	mostrarAnio,
	maximo,
	sessionsLabel,
}: {
	cells: CalendarCell[];
	locale: string;
	mostrarAnio: boolean;
	maximo: number;
	sessionsLabel: (count: number) => string;
}) {
	return (
		<div className="mt-5">
			<p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted">
				{formatRango(cells, locale)}
			</p>

			<div className="overflow-x-auto pb-1">
				<div
					className="grid min-w-[560px] gap-1.5"
					style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
				>
					{cells.map((celda) => {
						const etiqueta = etiquetaDia(celda, locale, mostrarAnio, sessionsLabel);
						const intensidad = celda.focusMinutes / maximo;

						return (
							<div key={celda.date} className="min-w-0">
								<p className="mb-1 text-center text-[10px] uppercase tracking-[0.12em] text-muted">
									{weekdayShort(celda.date, locale)}
								</p>
								<div
									role="img"
									aria-label={etiqueta}
									title={etiqueta}
									className="relative flex min-h-28 min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface-muted p-2.5 transition hover:border-foreground/30"
								>
									{celda.focusMinutes > 0 ? (
										<div
											aria-hidden
											className="absolute inset-x-0 bottom-0 bg-primary"
											style={{
												height: `${Math.max(6, Math.round(intensidad * 100))}%`,
												opacity: 0.35,
											}}
										/>
									) : null}
									<span className="relative text-sm font-semibold text-foreground">
										{etiquetaDiaCorta(celda.date, locale)}
									</span>
									<span className="relative text-[11px] text-muted">
										{formatMinutes(celda.focusMinutes)}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function VistaMes({
	cells,
	semanas,
	diasSemana,
	locale,
	mostrarAnio,
	maximo,
	sessionsLabel,
}: {
	cells: CalendarCell[];
	semanas: SemanaCalendario[];
	diasSemana: string[];
	locale: string;
	mostrarAnio: boolean;
	maximo: number;
	sessionsLabel: (count: number) => string;
}) {
	return (
		<div className="mt-5">
			<p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted">
				{formatRango(cells, locale)}
			</p>

			<div className="overflow-x-auto pb-1">
				<div className="min-w-[560px]">
					<div className="grid grid-cols-7 gap-1.5">
						{diasSemana.map((dia) => (
							<span
								key={dia}
								className="pb-1 text-center text-[10px] uppercase tracking-[0.12em] text-muted"
							>
								{dia}
							</span>
						))}

						{semanas.flatMap((semana) =>
							semana.days.map((celda, indice) => {
								const fecha = claveFecha(sumarDias(fechaUtc(semana.start), indice));

								if (!celda) {
									return (
										<div
											key={fecha}
											aria-hidden
											className="min-h-16 rounded-lg bg-surface-muted/20"
										/>
									);
								}

								const etiqueta = etiquetaDia(celda, locale, mostrarAnio, sessionsLabel);
								const intensidad = celda.focusMinutes / maximo;

								return (
									<div
										key={fecha}
										role="img"
										aria-label={etiqueta}
										title={etiqueta}
										className="relative flex min-h-16 min-w-0 flex-col justify-between overflow-hidden rounded-lg border border-border bg-surface-muted p-2 transition hover:border-foreground/30"
									>
										{celda.focusMinutes > 0 ? (
											<div
												aria-hidden
												className="absolute inset-x-0 bottom-0 bg-primary"
												style={{
													height: `${Math.max(6, Math.round(intensidad * 100))}%`,
													opacity: 0.35,
												}}
											/>
										) : null}
										<span className="relative text-xs font-semibold text-foreground">
											{etiquetaDiaCorta(celda.date, locale)}
										</span>
										<span className="relative text-[10px] text-muted">
											{formatMinutes(celda.focusMinutes)}
										</span>
									</div>
								);
							}),
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function VistaHeatmap({
	semanas,
	diasSemana,
	locale,
	mostrarAnio,
	maximo,
	sessionsLabel,
}: {
	semanas: SemanaCalendario[];
	diasSemana: string[];
	locale: string;
	mostrarAnio: boolean;
	maximo: number;
	sessionsLabel: (count: number) => string;
}) {
	const conScroll = semanas.length > 53;
	const columnas = conScroll
		? `28px repeat(${semanas.length}, 12px)`
		: `28px repeat(${semanas.length}, minmax(0, 1fr))`;

	return (
		<div className="mt-5 overflow-x-auto pb-1">
			<div className={conScroll ? "w-max" : "w-full"}>
				<div className="grid gap-[2px]" style={{ gridTemplateColumns: columnas }}>
					<div className="h-4" />
					{semanas.map((semana, indice) => {
						const etiqueta = etiquetaMes(semana, indice, locale, mostrarAnio);

						return (
							<div key={semana.start} className="relative h-4 min-w-0">
								{etiqueta ? (
									<span className="absolute top-0 left-0 whitespace-nowrap text-[10px] leading-none text-muted">
										{etiqueta}
									</span>
								) : null}
							</div>
						);
					})}

					{diasSemana.map((dia, fila) => (
						<Fragment key={dia}>
							<span className="flex items-center text-[10px] leading-none text-muted">{dia}</span>
							{semanas.map((semana) => {
								const celda = semana.days[fila];
								const fecha = claveFecha(sumarDias(fechaUtc(semana.start), fila));

								if (!celda) {
									return <div key={fecha} aria-hidden className="aspect-square w-full" />;
								}

								const etiqueta = etiquetaDia(celda, locale, mostrarAnio, sessionsLabel);

								if (celda.focusMinutes === 0) {
									return (
										<div
											key={fecha}
											title={etiqueta}
											className="aspect-square w-full rounded-[3px] bg-surface-muted"
										/>
									);
								}

								const intensidad = 0.18 + 0.82 * (celda.focusMinutes / maximo);

								return (
									<div
										key={fecha}
										role="img"
										aria-label={etiqueta}
										title={etiqueta}
										className="aspect-square w-full rounded-[3px] bg-primary transition hover:ring-1 hover:ring-foreground/30"
										style={{ opacity: intensidad }}
									/>
								);
							})}
						</Fragment>
					))}
				</div>
			</div>
		</div>
	);
}

function construirSemanas(cells: CalendarCell[]): SemanaCalendario[] {
	const primeraCelda = cells[0];
	const ultimaCelda = cells.at(-1);

	if (!primeraCelda || !ultimaCelda) {
		return [];
	}

	const porFecha = new Map(cells.map((celda) => [celda.date, celda]));
	const inicio = inicioDeSemana(fechaUtc(primeraCelda.date));
	const fin = sumarDias(inicioDeSemana(fechaUtc(ultimaCelda.date)), 6);
	const semanas: SemanaCalendario[] = [];
	let cursor = inicio;

	while (cursor <= fin) {
		const days = Array.from({ length: 7 }, (_, indice) => {
			const fecha = sumarDias(cursor, indice);
			return porFecha.get(claveFecha(fecha)) ?? null;
		});

		semanas.push({ start: claveFecha(cursor), days });
		cursor = sumarDias(cursor, 7);
	}

	return semanas;
}

function etiquetaMes(
	semana: SemanaCalendario,
	indice: number,
	locale: string,
	mostrarAnio: boolean,
): string | null {
	const primero = semana.days.find((celda) => celda?.date.endsWith("-01"));
	const celda = primero ?? (indice === 0 ? semana.days.find((dia) => dia !== null) : undefined);

	if (!celda) {
		return null;
	}

	const [anio, mes] = celda.date.split("-").map(Number);
	const conAnio = mostrarAnio && (indice === 0 || mes === 1);
	const opciones: Intl.DateTimeFormatOptions = conAnio
		? { month: "short", year: "numeric" }
		: { month: "short" };

	return new Intl.DateTimeFormat(locale, opciones).format(
		new Date(Date.UTC(anio, mes - 1, 15, 12)),
	);
}

function etiquetaDia(
	celda: CalendarCell,
	locale: string,
	mostrarAnio: boolean,
	sessionsLabel: (count: number) => string,
): string {
	return `${formatDate(celda.date, locale, mostrarAnio)} · ${formatMinutes(celda.focusMinutes)} · ${sessionsLabel(celda.sessions)}`;
}

function formatRango(cells: CalendarCell[], locale: string): string {
	const primera = cells[0];
	const ultima = cells.at(-1);

	if (!primera || !ultima) {
		return "";
	}

	const mismoAnio = primera.date.slice(0, 4) === ultima.date.slice(0, 4);
	const mismoMes = primera.date.slice(0, 7) === ultima.date.slice(0, 7);
	const inicio = fechaUtc(primera.date);
	const fin = fechaUtc(ultima.date);

	if (mismoMes) {
		return new Intl.DateTimeFormat(locale, {
			month: "short",
			year: "numeric",
		}).format(inicio);
	}

	const inicioTexto = new Intl.DateTimeFormat(
		locale,
		mismoAnio ? { month: "short" } : { month: "short", year: "numeric" },
	).format(inicio);
	const finTexto = new Intl.DateTimeFormat(locale, {
		month: "short",
		year: "numeric",
	}).format(fin);

	return `${inicioTexto} – ${finTexto}`;
}

function weekdayShort(fecha: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(fechaUtc(fecha));
}

function etiquetaDiaCorta(fecha: string, locale: string): string {
	const dia = String(Number(fecha.slice(8, 10)));

	if (!fecha.endsWith("-01")) {
		return dia;
	}

	const mes = new Intl.DateTimeFormat(locale, { month: "short" }).format(fechaUtc(fecha));
	return `${dia} ${mes}`;
}

function fechaUtc(fecha: string): Date {
	return new Date(`${fecha}T12:00:00Z`);
}

function sumarDias(fecha: Date, dias: number): Date {
	const copia = new Date(fecha);
	copia.setUTCDate(copia.getUTCDate() + dias);
	return copia;
}

function inicioDeSemana(fecha: Date): Date {
	const dia = fecha.getUTCDay();
	return sumarDias(fecha, -((dia + 6) % 7));
}

function claveFecha(fecha: Date): string {
	return fecha.toISOString().slice(0, 10);
}

function formatDate(fecha: string, locale: string, mostrarAnio: boolean): string {
	const [anio, mes, dia] = fecha.split("-").map(Number);
	const opciones: Intl.DateTimeFormatOptions = {
		weekday: "short",
		day: "numeric",
		month: "short",
		...(mostrarAnio ? { year: "numeric" } : {}),
	};

	return new Intl.DateTimeFormat(locale, opciones).format(
		new Date(Date.UTC(anio, mes - 1, dia, 12)),
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
