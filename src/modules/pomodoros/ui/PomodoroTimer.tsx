"use client";

import { useTranslations } from "next-intl";
import { TodayStats } from "@/modules/analytics/ui/TodayStats";
import { WeeklyChart } from "@/modules/analytics/ui/WeeklyChart";
import { BLOQUES, estaPausada, type SesionActiva, totalSegundos } from "../domain/pomodoro";
import { useTimerActions, useTimerClock, useTimerSession } from "./TimerProvider";

export function PomodoroTimer() {
	const t = useTranslations("Timer");
	const { sesion, duracionMinutos, cargando, error, aviso, bloqueCompletado } = useTimerSession();
	const {
		cambiarDuracion,
		iniciarBloque,
		pausar,
		reanudar,
		saltarBreak,
		cancelar,
		descartarCompletado,
	} = useTimerActions();
	const restante = useTimerClock();

	const pausada = sesion ? estaPausada(sesion) : false;
	const bloque = sesion?.bloque ?? bloqueCompletado;
	const etiqueta = bloque ? etiquetaBloque(bloque.duracionMinutos) : "";

	const estado = sesion
		? pausada
			? t("paused")
			: sesion.modo === "focus"
				? t("focused")
				: t("breaking")
		: null;

	const modo = sesion
		? sesion.modo === "focus"
			? t("focus")
			: sesion.modo === "long"
				? t("longBreak")
				: t("shortBreak")
		: null;

	if (cargando) {
		return (
			<section className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
				{t("loading")}
			</section>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">
						{sesion ? modo : bloqueCompletado ? t("blockCompleted") : t("pomodoro")}
					</p>
					<h2 className="mt-1.5 text-2xl font-semibold tracking-tight">
						{sesion
							? t("blockOf", { label: etiqueta })
							: bloqueCompletado
								? t("completedOf", { label: etiqueta })
								: t("chooseBlock")}
					</h2>
					<p className="mt-1.5 text-sm text-muted">
						{sesion
							? t("cycles", {
									label: etiqueta,
									count: sesion.bloque.ciclosCompletados,
								})
							: bloqueCompletado
								? t("completedSummary", {
										minutes: bloqueCompletado.focoAcumuladoMin,
										cycles: bloqueCompletado.ciclosCompletados,
									})
								: t("blockHint")}
					</p>
				</div>

				{estado ? (
					<span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
						{estado}
					</span>
				) : null}
			</div>

			<section className="rounded-2xl border border-border bg-surface p-6">
				{error ? (
					<p className="mt-4 rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg">
						{error}
					</p>
				) : null}

				{aviso ? (
					<p className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground">
						{aviso}
					</p>
				) : null}

				{sesion ? (
					<div className="mt-8 space-y-6">
						<p
							aria-live="polite"
							className={`py-3 text-center font-mono text-6xl font-semibold leading-none tracking-tighter ${
								sesion.modo === "focus" ? "text-primary" : "text-info"
							}`}
						>
							{formatearTiempo(restante)}
						</p>

						<div key={sesion.id} className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
							<div
								className={`h-full rounded-full transition-[width] duration-500 ${
									sesion.modo === "focus" ? "bg-primary" : "bg-info"
								}`}
								style={{ width: `${progresoFase(sesion, restante)}%` }}
							/>
						</div>

						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={pausada ? reanudar : pausar}
								className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:bg-primary-hover"
							>
								{pausada ? t("resume") : t("pause")}
							</button>

							{sesion.modo !== "focus" ? (
								<button
									type="button"
									onClick={saltarBreak}
									className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition hover:border-info-border hover:text-info"
								>
									{t("skipBreak")}
								</button>
							) : null}

							<button
								type="button"
								onClick={cancelar}
								className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition hover:border-danger-border hover:text-danger-fg"
							>
								{t("cancelBlock")}
							</button>
						</div>
					</div>
				) : bloqueCompletado ? (
					<div className="mt-6">
						<button
							type="button"
							onClick={descartarCompletado}
							className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:bg-primary-hover"
						>
							{t("startAnother")}
						</button>
					</div>
				) : (
					<div className="mt-6 space-y-3">
						<label className="block space-y-1.5">
							<span className="text-xs uppercase tracking-[0.2em] text-muted">
								{t("blockLabel")}
							</span>
							<select
								value={duracionMinutos}
								onChange={(event) => cambiarDuracion(Number(event.target.value))}
								className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
							>
								{BLOQUES.map((opcion) => (
									<option key={opcion.duracionMinutos} value={opcion.duracionMinutos}>
										{opcion.etiqueta}
									</option>
								))}
							</select>
						</label>

						<button
							type="button"
							onClick={iniciarBloque}
							className="rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground transition hover:bg-primary-hover"
						>
							{t("startBlock")}
						</button>
					</div>
				)}
			</section>

			<TodayStats />
			<WeeklyChart />
		</div>
	);
}

function etiquetaBloque(duracionMinutos: number): string {
	return (
		BLOQUES.find((bloque) => bloque.duracionMinutos === duracionMinutos)?.etiqueta ??
		`${duracionMinutos} min`
	);
}

function formatearTiempo(segundos: number): string {
	const minutos = Math.floor(segundos / 60);
	const resto = segundos % 60;
	return `${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function progresoFase(sesion: SesionActiva, restante: number): number {
	const total = totalSegundos(sesion);

	if (total <= 0) {
		return 0;
	}

	return Math.min(100, Math.max(0, ((total - restante) / total) * 100));
}
