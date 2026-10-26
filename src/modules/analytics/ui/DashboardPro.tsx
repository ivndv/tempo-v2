import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { DashboardResumen, PeriodoResumen } from "../domain/dashboard";

const RANGOS = [7, 30, 90, 365, 0] as const;

interface DashboardProProps {
	datos: DashboardResumen;
	rango: number;
	deviceId: string | null;
	dispositivos: { id: string; nombre: string }[];
}

export async function DashboardPro({ datos, rango, deviceId, dispositivos }: DashboardProProps) {
	const t = await getTranslations("Dashboard");
	const locale = await getLocale();

	const serie = rango > 0 ? datos.daily.slice(-rango) : datos.daily;
	const maximo = Math.max(...serie.map((dia) => dia.focusMinutes), 60);
	const previo = datos.previousWeek.focusMinutes;
	const variacion =
		previo > 0 ? Math.round(((datos.week.focusMinutes - previo) / previo) * 100) : null;

	function hrefRango(opcion: number) {
		return {
			pathname: "/app/dashboard" as const,
			query: {
				range: String(opcion),
				...(deviceId ? { device: deviceId } : {}),
			},
		};
	}

	function hrefDispositivo(opcion: string | null) {
		return {
			pathname: "/app/dashboard" as const,
			query: {
				range: String(rango),
				...(opcion ? { device: opcion } : {}),
			},
		};
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap gap-1.5">
					{RANGOS.map((opcion) => (
						<Link
							key={opcion}
							href={hrefRango(opcion)}
							aria-current={rango === opcion ? "page" : undefined}
							className={`rounded-lg px-3 py-1.5 text-xs transition ${
								rango === opcion
									? "bg-primary text-primary-foreground"
									: "border border-border text-muted hover:border-foreground/40 hover:text-foreground"
							}`}
						>
							{opcion === 0 ? t("rangeAll") : t(`range${opcion}`)}
						</Link>
					))}
				</div>

				{dispositivos.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">
						<Link
							href={hrefDispositivo(null)}
							aria-current={deviceId === null ? "page" : undefined}
							className={`rounded-lg px-3 py-1.5 text-xs transition ${
								deviceId === null
									? "border border-success-border bg-success-bg text-success-fg"
									: "border border-border text-muted hover:border-foreground/40 hover:text-foreground"
							}`}
						>
							{t("allDevices")}
						</Link>
						{dispositivos.map((dispositivo) => (
							<Link
								key={dispositivo.id}
								href={hrefDispositivo(dispositivo.id)}
								aria-current={deviceId === dispositivo.id ? "page" : undefined}
								className={`max-w-40 truncate rounded-lg px-3 py-1.5 text-xs transition ${
									deviceId === dispositivo.id
										? "border border-success-border bg-success-bg text-success-fg"
										: "border border-border text-muted hover:border-foreground/40 hover:text-foreground"
								}`}
							>
								{dispositivo.nombre}
							</Link>
						))}
					</div>
				) : null}
			</div>

			<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<PeriodoCard titulo={t("today")} periodo={datos.today} t={t} />
				<PeriodoCard titulo={t("last7")} periodo={datos.week} t={t} />
				<PeriodoCard titulo={t("month")} periodo={datos.month} t={t} />
				<PeriodoCard titulo={t("allTime")} periodo={datos.allTime} t={t} destacado />
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
					<h2 className="text-sm font-medium text-foreground">{t("focusPerDay")}</h2>
					<p className="text-xs text-muted">
						{rango === 0 ? t("rangeAll") : t(`range${rango}`)} ·{" "}
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
											className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary"
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
					<h2 className="text-sm font-medium text-foreground">{t("topTasks")}</h2>

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

					{datos.devices.length === 0 ? (
						<p className="mt-4 text-sm text-muted">{t("noDevices")}</p>
					) : (
						<ul className="mt-4 space-y-3">
							{datos.devices.map((dispositivo) => (
								<li
									key={dispositivo.deviceId}
									className="flex items-center justify-between gap-3 text-sm"
								>
									<span className="truncate text-foreground">
										{dispositivo.nombre ||
											(dispositivo.deviceId === "desconocido"
												? t("unknownDevice")
												: dispositivo.deviceId.slice(0, 8))}
									</span>
									<span className="shrink-0 text-muted">
										{formatMinutes(dispositivo.focusMinutes)}
									</span>
								</li>
							))}
						</ul>
					)}
				</section>
			</div>
		</div>
	);
}

function PeriodoCard({
	titulo,
	periodo,
	t,
	destacado = false,
}: {
	titulo: string;
	periodo: PeriodoResumen;
	t: (clave: string, valores?: Record<string, number>) => string;
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
			<p className="mt-1 text-xs text-muted">
				{t("count", {
					completed: periodo.completed,
					interrupted: periodo.interrupted,
				})}
			</p>
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
