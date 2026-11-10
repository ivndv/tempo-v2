"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { DashboardResumen, GranularidadDashboard, PeriodoResumen } from "../domain/dashboard";
import { DeviceFocusChart } from "./DeviceFocusChart";
import { FocusCalendar } from "./FocusCalendar";
import { useDashboard } from "./useDashboard";
import { WeeklyFocusChart } from "./WeeklyFocusChart";

const RANGOS = [7, 30, 90, 365, 730, 0] as const;

interface DashboardProProps {
	userId: string;
	datosIniciales: DashboardResumen;
	rangoInicial: number;
	deviceInicial: string | null;
	dispositivos: { id: string; nombre: string }[];
}

export function DashboardPro({
	userId,
	datosIniciales,
	rangoInicial,
	deviceInicial,
	dispositivos,
}: DashboardProProps) {
	const t = useTranslations("Dashboard");
	const locale = useLocale();
	const [rango, setRango] = useState(rangoInicial);
	const [deviceId, setDeviceId] = useState(deviceInicial);

	const initialData =
		rango === rangoInicial && deviceId === deviceInicial ? datosIniciales : undefined;
	const { data, isFetching, isError, error, refetch } = useDashboard({
		userId,
		range: rango,
		deviceId,
		initialData,
	});
	const datos = data ?? datosIniciales;

	useEffect(() => {
		function alVolver() {
			const params = new URLSearchParams(window.location.search);
			const bruto = Number(params.get("range") ?? "30");
			const permitido = RANGOS.some((opcion) => opcion === bruto);
			setRango(permitido ? bruto : 30);
			setDeviceId(params.get("device"));
		}

		window.addEventListener("popstate", alVolver);
		return () => window.removeEventListener("popstate", alVolver);
	}, []);

	function actualizarUrl(nextRango: number, nextDevice: string | null) {
		const params = new URLSearchParams(window.location.search);
		params.set("range", String(nextRango));

		if (nextDevice) {
			params.set("device", nextDevice);
		} else {
			params.delete("device");
		}

		const query = params.toString();
		window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
	}

	function cambiarRango(nextRango: number) {
		setRango(nextRango);
		actualizarUrl(nextRango, deviceId);
	}

	function cambiarDispositivo(nextDevice: string | null) {
		setDeviceId(nextDevice);
		actualizarUrl(rango, nextDevice);
	}

	const serie = datos.daily;
	const maximo = Math.max(...serie.map((dia) => dia.focusMinutes), 60);
	const previo = datos.previousWeek.focusMinutes;
	const variacion =
		previo > 0 ? Math.round(((datos.week.focusMinutes - previo) / previo) * 100) : null;
	const rangoLabel = rango === 0 ? t("rangeAll") : t(`range${rango}`);
	const granularidadLabel =
		datos.granularity === "month"
			? t("granularityMonth")
			: datos.granularity === "week"
				? t("granularityWeek")
				: t("granularityDay");
	const errorTexto = error instanceof Error ? error.message : t("loadError");

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap gap-1.5">
					{RANGOS.map((opcion) => (
						<button
							key={opcion}
							type="button"
							onClick={() => cambiarRango(opcion)}
							aria-pressed={rango === opcion}
							className={`rounded-lg px-3 py-1.5 text-xs transition ${
								rango === opcion
									? "bg-primary text-primary-foreground"
									: "border border-border text-muted hover:border-foreground/40 hover:text-foreground"
							}`}
						>
							{opcion === 0 ? t("rangeAll") : t(`range${opcion}`)}
						</button>
					))}
				</div>

				{dispositivos.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">
						<button
							type="button"
							onClick={() => cambiarDispositivo(null)}
							aria-pressed={deviceId === null}
							className={`rounded-lg px-3 py-1.5 text-xs transition ${
								deviceId === null
									? "border border-success-border bg-success-bg text-success-fg"
									: "border border-border text-muted hover:border-foreground/40 hover:text-foreground"
							}`}
						>
							{t("allDevices")}
						</button>
						{dispositivos.map((dispositivo) => (
							<button
								key={dispositivo.id}
								type="button"
								onClick={() => cambiarDispositivo(dispositivo.id)}
								aria-pressed={deviceId === dispositivo.id}
								className={`max-w-40 truncate rounded-lg px-3 py-1.5 text-xs transition ${
									deviceId === dispositivo.id
										? "border border-success-border bg-success-bg text-success-fg"
										: "border border-border text-muted hover:border-foreground/40 hover:text-foreground"
								}`}
							>
								{dispositivo.nombre}
							</button>
						))}
					</div>
				) : null}

				{isFetching ? <span className="text-xs text-muted">{t("updating")}</span> : null}
			</div>

			{isError ? (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg">
					<p>{errorTexto}</p>
					<button
						type="button"
						onClick={() => void refetch()}
						className="rounded-lg border border-danger-border px-3 py-1.5 text-xs font-medium transition hover:bg-danger-bg/60"
					>
						{t("retry")}
					</button>
				</div>
			) : null}

			<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<PeriodoCard
					titulo={t("today")}
					periodo={datos.today}
					detalle={t("count", {
						completed: datos.today.completed,
						interrupted: datos.today.interrupted,
					})}
				/>
				<PeriodoCard
					titulo={t("last7")}
					periodo={datos.week}
					detalle={t("count", {
						completed: datos.week.completed,
						interrupted: datos.week.interrupted,
					})}
				/>
				<PeriodoCard
					titulo={t("month")}
					periodo={datos.month}
					detalle={t("count", {
						completed: datos.month.completed,
						interrupted: datos.month.interrupted,
					})}
				/>
				<PeriodoCard
					titulo={t("allTime")}
					periodo={datos.allTime}
					detalle={t("count", {
						completed: datos.allTime.completed,
						interrupted: datos.allTime.interrupted,
					})}
					destacado
				/>
			</section>

			<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<article className="rounded-2xl border border-border bg-surface p-5">
					<p className="text-[10px] uppercase tracking-[0.18em] text-muted">{t("streak")}</p>
					<p className="mt-2 text-lg font-semibold text-foreground">
						{t("streakValue", { days: datos.streak.current })}
					</p>
					<p className="mt-1 text-xs text-muted">
						{t("streakLongest", { days: datos.streak.longest })}
					</p>
				</article>
				<article className="rounded-2xl border border-border bg-surface p-5">
					<p className="text-[10px] uppercase tracking-[0.18em] text-muted">{t("bestDay")}</p>
					<p className="mt-2 text-lg font-semibold text-foreground">
						{datos.bestDay && datos.bestDay.focusMinutes > 0
							? `${formatDate(datos.bestDay.date, locale)} · ${formatMinutes(datos.bestDay.focusMinutes)}`
							: "—"}
					</p>
				</article>
				<article className="rounded-2xl border border-border bg-surface p-5">
					<p className="text-[10px] uppercase tracking-[0.18em] text-muted">{t("previousWeek")}</p>
					<p className="mt-2 text-lg font-semibold text-foreground">
						{variacion === null
							? "—"
							: variacion === 0
								? t("same")
								: variacion > 0
									? t("better", { percent: variacion })
									: t("worse", { percent: Math.abs(variacion) })}
					</p>
				</article>
				<article className="rounded-2xl border border-border bg-surface p-5">
					<p className="text-[10px] uppercase tracking-[0.18em] text-muted">
						{t("longestSession")}
					</p>
					<p className="mt-2 text-lg font-semibold text-foreground">
						{formatMinutes(datos.longestSession)}
					</p>
				</article>
			</section>

			<section className="rounded-2xl border border-border bg-surface p-6">
				<div className="flex items-baseline justify-between gap-4">
					<h2 className="text-sm font-medium text-foreground">{t("focusOverTime")}</h2>
					<p className="text-xs text-muted">
						{rangoLabel} · {granularidadLabel} ·{" "}
						{deviceId
							? (dispositivos.find((dispositivo) => dispositivo.id === deviceId)?.nombre ??
								deviceId.slice(0, 8))
							: t("allDevices")}
					</p>
				</div>

				{serie.every((dia) => dia.focusMinutes === 0) ? (
					<p className="mt-6 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
						{t("empty")}
					</p>
				) : (
					<div className="mt-6 overflow-x-auto">
						<div
							className="flex h-40 items-end gap-1"
							style={{ minWidth: `${Math.max(serie.length * 6, 100)}px` }}
						>
							{serie.map((dia) => {
								const altura = Math.max(4, Math.round((dia.focusMinutes / maximo) * 100));
								const etiqueta = `${formatDate(dia.date, locale, datos.granularity)}: ${formatMinutes(dia.focusMinutes)}`;

								return (
									<div
										key={dia.date}
										role="img"
										className="group flex h-full flex-1 flex-col justify-end"
										title={etiqueta}
										aria-label={etiqueta}
									>
										<div
											className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary"
											style={{ height: `${altura}%` }}
										/>
									</div>
								);
							})}
						</div>

						<div className="mt-2 flex justify-between text-[10px] text-muted">
							<span>{formatDate(serie[0]?.date, locale, datos.granularity)}</span>
							<span>{formatDate(serie[serie.length - 1]?.date, locale, datos.granularity)}</span>
						</div>
					</div>
				)}
			</section>

			<WeeklyFocusChart
				serie={datos.weekly}
				title={t("weeklyFocus")}
				subtitle={rangoLabel}
				empty={t("noWeeklyData")}
				locale={locale}
			/>

			<FocusCalendar
				cells={datos.calendar}
				title={t("calendarTitle")}
				subtitle={rangoLabel}
				empty={t("calendarEmpty")}
				locale={locale}
				sessionsLabel={(count) => t("calendarSessions", { count })}
			/>

			<div className="grid gap-4 lg:grid-cols-2">
				<section className="rounded-2xl border border-border bg-surface p-6">
					<div className="flex items-baseline justify-between gap-3">
						<h2 className="text-sm font-medium text-foreground">{t("topTasksInRange")}</h2>
						<p className="text-xs text-muted">{rangoLabel}</p>
					</div>

					{datos.byTask.length === 0 ? (
						<p className="mt-4 text-sm text-muted">{t("noTaskData")}</p>
					) : (
						<div className="mt-4 overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead>
									<tr className="text-[10px] uppercase tracking-[0.16em] text-muted">
										<th className="pb-2 pr-3 font-medium">{t("taskName")}</th>
										<th className="pb-2 pr-3 font-medium">{t("taskFocus")}</th>
										<th className="pb-2 pr-3 font-medium">{t("taskSessions")}</th>
										<th className="pb-2 pr-3 font-medium">{t("taskCompletion")}</th>
										<th className="pb-2 font-medium">{t("taskLastWorked")}</th>
									</tr>
								</thead>
								<tbody>
									{datos.byTask.map((tarea) => {
										const porcentaje =
											tarea.sessions > 0 ? Math.round((tarea.completed / tarea.sessions) * 100) : 0;

										return (
											<tr key={tarea.tareaId || "sin-tarea"} className="border-t border-border/60">
												<td className="max-w-40 truncate py-2 pr-3 text-foreground">
													{tarea.nombre || "—"}
												</td>
												<td className="py-2 pr-3 text-muted">
													{formatMinutes(tarea.focusMinutes)}
												</td>
												<td className="py-2 pr-3 text-muted">{tarea.sessions}</td>
												<td className="py-2 pr-3 text-muted">{porcentaje}%</td>
												<td className="py-2 text-muted">
													{tarea.lastWorked ? formatDate(tarea.lastWorked, locale) : "—"}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</section>

				<DeviceFocusChart
					devices={datos.devices}
					title={t("devicesTitle")}
					subtitle={rangoLabel}
					empty={t("noDevices")}
				/>
			</div>
		</div>
	);
}

function PeriodoCard({
	titulo,
	periodo,
	detalle,
	destacado = false,
}: {
	titulo: string;
	periodo: PeriodoResumen;
	detalle: string;
	destacado?: boolean;
}) {
	return (
		<article
			className={`rounded-2xl border p-5 ${
				destacado ? "border-success-border bg-success-bg" : "border-border bg-surface"
			}`}
		>
			<p className="text-xs uppercase tracking-[0.2em] text-muted">{titulo}</p>
			<p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
				{formatMinutes(periodo.focusMinutes)}
			</p>
			<p className="mt-1 text-xs text-muted">{detalle}</p>
		</article>
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

function formatDate(
	fecha: string | undefined,
	locale: string,
	granularidad: GranularidadDashboard = "day",
): string {
	if (!fecha) {
		return "";
	}

	const opciones: Intl.DateTimeFormatOptions =
		granularidad === "month"
			? { month: "short", year: "numeric" }
			: { day: "numeric", month: "short" };

	return new Intl.DateTimeFormat(locale, opciones).format(new Date(`${fecha}T12:00:00`));
}
