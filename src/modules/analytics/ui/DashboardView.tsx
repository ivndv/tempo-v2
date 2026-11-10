"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { getClientContainer } from "@/shared/infrastructure/clientContainer";
import { obtenerDeviceId } from "@/shared/infrastructure/device";
import { leerZonaHoraria } from "@/shared/infrastructure/preferences";
import type { PeriodoResumen } from "../domain/dashboard";

interface DispositivoOpcion {
	id: string;
	nombre: string;
}

interface DashboardViewProps {
	plan: "free" | "pro";
	guest: boolean;
	timezone: string | null;
	dispositivos: DispositivoOpcion[];
	offline?: boolean;
}

export function DashboardView({
	plan,
	guest,
	timezone,
	dispositivos,
	offline = false,
}: DashboardViewProps) {
	const t = useTranslations("Dashboard");
	const locale = useLocale();
	const [montado, setMontado] = useState(false);
	const [actualId, setActualId] = useState<string | null>(null);
	const [filtro, setFiltro] = useState<string>(plan === "pro" && !offline ? "todos" : "actual");
	const [rango, setRango] = useState(guest ? 7 : 30);

	useEffect(() => {
		setActualId(obtenerDeviceId());
		setMontado(true);
	}, []);

	const tz = timezone ?? (montado ? leerZonaHoraria() : "America/Mexico_City");
	const deviceId = filtro === "todos" ? null : filtro === "actual" ? (actualId ?? null) : filtro;

	const datos = useLiveQuery(
		() =>
			getClientContainer().analytics.dashboardLocal.execute({
				timezone: tz,
				deviceId,
				dias: rango,
			}),
		[tz, deviceId, rango],
	);

	const rangos = plan === "pro" ? [7, 30, 90, 365] : guest ? [7] : [7, 30];

	if (!montado || !datos) {
		return (
			<section className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
				{t("loading")}
			</section>
		);
	}

	const serie = datos.daily.slice(-rango);
	const maximo = Math.max(...serie.map((dia) => dia.focusMinutes), 60);
	const previo = datos.previousWeek.focusMinutes;
	const variacion =
		previo > 0 ? Math.round(((datos.week.focusMinutes - previo) / previo) * 100) : null;

	const nombres = new Map(dispositivos.map((dispositivo) => [dispositivo.id, dispositivo.nombre]));
	const opcionesDispositivo: DispositivoOpcion[] = [
		{ id: "todos", nombre: t("allDevices") },
		...(plan === "pro" ? dispositivos : []),
	];

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap gap-1.5">
					{rangos.map((opcion) => (
						<button
							key={opcion}
							type="button"
							onClick={() => setRango(opcion)}
							aria-pressed={rango === opcion}
							className={`rounded-lg px-3 py-1.5 text-xs transition ${
								rango === opcion
									? "bg-primary text-primary-foreground"
									: "border border-border text-muted hover:border-foreground/40 hover:text-foreground"
							}`}
						>
							{t(`range${opcion}`)}
						</button>
					))}
				</div>

				{plan === "pro" && !offline ? (
					<div className="flex flex-wrap gap-1.5">
						{opcionesDispositivo.map((opcion) => (
							<button
								key={opcion.id}
								type="button"
								onClick={() => setFiltro(opcion.id)}
								aria-pressed={filtro === opcion.id}
								className={`rounded-lg px-3 py-1.5 text-xs transition ${
									filtro === opcion.id
										? "border border-success-border bg-success-bg text-primary"
										: "border border-border text-muted hover:border-foreground/40 hover:text-foreground"
								}`}
							>
								{opcion.nombre}
							</button>
						))}
					</div>
				) : null}
			</div>

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

			<section className="grid gap-3 sm:grid-cols-3">
				<article className="rounded-2xl border border-border bg-surface p-5">
					<p className="text-[10px] uppercase tracking-[0.18em] text-muted">{t("streak")}</p>
					<p className="mt-2 text-lg font-semibold text-foreground">
						{plan === "pro" ? t("streakValue", { days: datos.streak.current }) : "—"}
					</p>
					{plan !== "pro" ? <Lock size={13} className="mt-1 text-muted" aria-hidden /> : null}
				</article>
				<article className="rounded-2xl border border-border bg-surface p-5">
					<p className="text-[10px] uppercase tracking-[0.18em] text-muted">{t("bestDay")}</p>
					<p className="mt-2 text-lg font-semibold text-foreground">
						{plan === "pro" && datos.bestDay && datos.bestDay.focusMinutes > 0
							? `${formatDate(datos.bestDay.date, locale)} · ${formatMinutes(datos.bestDay.focusMinutes)}`
							: "—"}
					</p>
					{plan !== "pro" ? <Lock size={13} className="mt-1 text-muted" aria-hidden /> : null}
				</article>
				<article className="rounded-2xl border border-border bg-surface p-5">
					<p className="text-[10px] uppercase tracking-[0.18em] text-muted">{t("previousWeek")}</p>
					<p className="mt-2 text-lg font-semibold text-foreground">
						{plan !== "pro"
							? "—"
							: variacion === null
								? "—"
								: variacion === 0
									? t("same")
									: variacion > 0
										? t("better", { percent: variacion })
										: t("worse", { percent: Math.abs(variacion) })}
					</p>
					{plan !== "pro" ? <Lock size={13} className="mt-1 text-muted" aria-hidden /> : null}
				</article>
			</section>

			{offline ? (
				<p className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-fg">
					{plan === "pro" ? t("localFallbackNote") : t("offlineNote")}
				</p>
			) : null}

			{guest ? (
				<p className="rounded-xl border border-success-border bg-success-bg px-4 py-3 text-sm text-success-fg">
					{t("guestNote")}{" "}
					<Link href="/signup" className="underline">
						{t("createAccount")}
					</Link>
				</p>
			) : plan === "free" ? (
				<p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
					{t("freeNote")}
				</p>
			) : null}

			<section className="rounded-2xl border border-border bg-surface p-6">
				<div className="flex items-baseline justify-between gap-4">
					<h2 className="text-sm font-medium text-foreground">{t("focusPerDay")}</h2>
					<p className="text-xs text-muted">
						{t(`range${rango}`)} ·{" "}
						{deviceId ? (nombres.get(deviceId) ?? t("currentDevice")) : t("allDevices")}
					</p>
				</div>

				{serie.every((dia) => dia.focusMinutes === 0) ? (
					<p className="mt-6 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
						{t("empty")}
					</p>
				) : (
					<div className="mt-6">
						<div className="flex h-40 items-end gap-1">
							{serie.map((dia) => {
								const altura = Math.max(4, Math.round((dia.focusMinutes / maximo) * 100));
								const etiqueta = `${formatDate(dia.date, locale)}: ${formatMinutes(dia.focusMinutes)}`;

								return (
									<div
										key={dia.date}
										role="img"
										className="group flex h-full flex-1 flex-col justify-end"
										title={etiqueta}
										aria-label={etiqueta}
									>
										<div
											className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary-hover"
											style={{ height: `${altura}%` }}
										/>
									</div>
								);
							})}
						</div>

						<div className="mt-2 flex justify-between text-[10px] text-muted">
							<span>{formatDate(serie[0]?.date, locale)}</span>
							<span>{formatDate(serie[serie.length - 1]?.date, locale)}</span>
						</div>
					</div>
				)}
			</section>

			<div className="grid gap-4 lg:grid-cols-2">
				<section className="rounded-2xl border border-border bg-surface p-6">
					<h2 className="text-sm font-medium text-foreground">{t("topTasksInRange")}</h2>

					{datos.byTask.length === 0 ? (
						<p className="mt-4 text-sm text-muted">{t("noTaskData")}</p>
					) : (
						<ul className="mt-4 space-y-3">
							{datos.byTask.map((tarea) => {
								const maxTarea = datos.byTask[0]?.focusMinutes || 1;
								const ancho = Math.max(4, Math.round((tarea.focusMinutes / maxTarea) * 100));

								return (
									<li key={tarea.tareaId || "sin-tarea"} className="space-y-1.5">
										<div className="flex items-baseline justify-between gap-3 text-sm">
											<span className="truncate text-foreground">{tarea.nombre || "—"}</span>
											<span className="shrink-0 text-muted">
												{formatMinutes(tarea.focusMinutes)}
											</span>
										</div>
										<div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
											<div
												className="h-full rounded-full bg-primary"
												style={{ width: `${ancho}%` }}
											/>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</section>

				<section className="rounded-2xl border border-border bg-surface p-6">
					<h2 className="text-sm font-medium text-foreground">{t("devicesTitle")}</h2>

					{plan === "pro" ? (
						<ul className="mt-4 space-y-3">
							{datos.devices.length === 0 ? (
								<p className="text-sm text-muted">{t("noDevices")}</p>
							) : (
								datos.devices.map((dispositivo) => (
									<li
										key={dispositivo.deviceId}
										className="flex items-center justify-between gap-3 text-sm"
									>
										<span className="truncate text-foreground">
											{nombres.get(dispositivo.deviceId) ??
												(dispositivo.deviceId === "desconocido"
													? t("unknownDevice")
													: dispositivo.deviceId.slice(0, 8))}
										</span>
										<span className="shrink-0 text-muted">
											{formatMinutes(dispositivo.focusMinutes)}
										</span>
									</li>
								))
							)}
						</ul>
					) : (
						<div className="mt-4 space-y-3 rounded-xl border border-dashed border-border p-4">
							<div className="flex items-center gap-2 text-sm text-foreground">
								<Lock size={15} aria-hidden />
								{t("proTitle")}
							</div>
							<p className="text-xs leading-relaxed text-muted">{t("proText")}</p>
							<Link
								href="/pricing"
								className="inline-flex rounded-lg border border-success-border px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary"
							>
								{t("proCta")}
							</Link>
						</div>
					)}
				</section>
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

function formatDate(fecha: string | undefined, locale: string): string {
	if (!fecha) {
		return "";
	}

	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
	}).format(new Date(`${fecha}T12:00:00`));
}
