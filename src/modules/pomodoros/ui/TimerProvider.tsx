"use client";

import { useTranslations } from "next-intl";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getClientContainer } from "@/shared/infrastructure/clientContainer";
import {
	actualizarTitulo,
	notificar,
	pedirPermisoNotificaciones,
	reproducirBeep,
} from "@/shared/infrastructure/notifications/browser";
import { leerZonaHoraria } from "@/shared/infrastructure/preferences";
import {
	BLOQUES,
	type BloqueActivo,
	estaPausada,
	restanteSegundos,
	type SesionActiva,
} from "../domain/pomodoro";

const VEINTICUATRO_HORAS = 24 * 60 * 60 * 1000;

interface TimerSessionValue {
	sesion: SesionActiva | null;
	duracionMinutos: number;
	cargando: boolean;
	error: string | null;
	aviso: string | null;
	bloqueCompletado: BloqueActivo | null;
}

interface TimerActionsValue {
	cambiarDuracion: (minutos: number) => void;
	iniciarBloque: () => Promise<void>;
	pausar: () => Promise<void>;
	reanudar: () => Promise<void>;
	saltarBreak: () => Promise<void>;
	cancelar: () => Promise<void>;
	descartarCompletado: () => void;
}

const TimerSessionContext = createContext<TimerSessionValue | null>(null);
const TimerActionsContext = createContext<TimerActionsValue | null>(null);
const TimerClockContext = createContext<number>(0);

export function useTimerSession(): TimerSessionValue {
	const contexto = useContext(TimerSessionContext);
	if (!contexto) throw new Error("useTimerSession debe usarse dentro de TimerProvider");
	return contexto;
}

export function useTimerActions(): TimerActionsValue {
	const contexto = useContext(TimerActionsContext);
	if (!contexto) throw new Error("useTimerActions debe usarse dentro de TimerProvider");
	return contexto;
}

export function useTimerClock(): number {
	return useContext(TimerClockContext);
}

// Mantiene el bloque vivo en todas las rutas de la app.
export function TimerProvider({
	children,
	timezone,
}: {
	children: React.ReactNode;
	timezone?: string | null;
}) {
	const t = useTranslations("Timer");
	const servicio = useMemo(() => getClientContainer().timer.crear(), []);
	const [sesion, setSesion] = useState<SesionActiva | null>(null);
	const [restante, setRestante] = useState(0);
	const [duracionMinutos, setDuracionMinutos] = useState(60);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [aviso, setAviso] = useState<string | null>(null);
	const [bloqueCompletado, setBloqueCompletado] = useState<BloqueActivo | null>(null);
	const transicionando = useRef(false);

	useEffect(() => {
		let activo = true;

		servicio
			.recuperar()
			.then(async (guardada) => {
				if (!activo) return;

				if (
					guardada &&
					estaPausada(guardada) &&
					Date.now() - guardada.bloque.iniciadoEn > VEINTICUATRO_HORAS
				) {
					await servicio.descartar();
					if (activo) {
						setAviso(t("restoredDiscarded"));
					}
					return;
				}

				setSesion(guardada);

				if (guardada) {
					setRestante(restanteSegundos(guardada));
					setDuracionMinutos(guardada.bloque.duracionMinutos);
				}
			})
			.catch((cause: unknown) => {
				if (activo) {
					setError(cause instanceof Error ? cause.message : t("errorRecover"));
				}
			})
			.finally(() => {
				if (activo) {
					setCargando(false);
				}
			});

		return () => {
			activo = false;
		};
	}, [servicio, t]);

	useEffect(() => {
		if (!sesion) return;

		const tick = () => {
			setRestante(restanteSegundos(sesion));
		};

		tick();
		const intervalo = window.setInterval(tick, 500);

		return () => window.clearInterval(intervalo);
	}, [sesion]);

	// Auto-transición al terminar focus o break. Nunca corre si está pausado.
	useEffect(() => {
		if (!sesion || restante > 0 || estaPausada(sesion) || transicionando.current) {
			return;
		}

		transicionando.current = true;

		void (async () => {
			try {
				if (sesion.modo === "focus") {
					const resultado = await servicio.completarFocus(sesion);

					if (resultado.bloqueCompletado) {
						setSesion(null);
						setRestante(0);
						setBloqueCompletado(resultado.bloque);
						setAviso(t("blockDonePartial"));
						notificar(t("notifyBlockDoneTitle"), t("notifyBlockDoneBody"));
						actualizarTitulo(t("titleBlockDone"));
						reproducirBeep();
						return;
					}

					if (resultado.sesion) {
						setSesion(resultado.sesion);
						setRestante(restanteSegundos(resultado.sesion));
						const etiquetaDescanso =
							resultado.sesion.modo === "long" ? t("longBreak") : t("shortBreak");
						setAviso(resultado.sesion.modo === "long" ? t("focusDoneLong") : t("focusDoneShort"));
						notificar(t("notifyFocusDone"), etiquetaDescanso);
						actualizarTitulo(t("titleBreak", { label: etiquetaDescanso }));
						reproducirBeep();
					}
					return;
				}

				const resultado = await servicio.completarBreak(sesion);

				if (resultado.bloqueCompletado) {
					setSesion(null);
					setRestante(0);
					setBloqueCompletado(resultado.bloque);
					setAviso(t("blockDone"));
					notificar(t("notifyBlockDoneTitle"), t("notifyGoodWork"));
					actualizarTitulo(t("titleBlockDone"));
					reproducirBeep();
					return;
				}

				if (resultado.sesion) {
					setSesion(resultado.sesion);
					setRestante(restanteSegundos(resultado.sesion));
					setAviso(t("breakDoneNext"));
					notificar(t("notifyBreakDone"), t("notifyBreakDoneBody"));
					actualizarTitulo(t("titleFocus"));
					reproducirBeep();
				}
			} catch (cause: unknown) {
				setError(cause instanceof Error ? cause.message : t("errorAdvance"));
			} finally {
				transicionando.current = false;
			}
		})();
	}, [sesion, restante, servicio, t]);

	async function iniciarBloque() {
		setError(null);
		await pedirPermisoNotificaciones();

		try {
			const nueva = await servicio.iniciarBloque(duracionMinutos, timezone ?? leerZonaHoraria());
			setSesion(nueva);
			setRestante(restanteSegundos(nueva));
			setBloqueCompletado(null);
			setAviso(t("focusStarted", { label: etiquetaBloque(duracionMinutos) }));
			notificar(
				t("notifyFocusStarted"),
				t("notifyBlock", { label: etiquetaBloque(duracionMinutos) }),
			);
			actualizarTitulo(t("titleFocus"));
			reproducirBeep();
		} catch (cause: unknown) {
			setError(cause instanceof Error ? cause.message : t("errorStart"));
		}
	}

	async function pausar() {
		if (!sesion) return;
		const pausadaSesion = await servicio.pausar(sesion);
		setSesion(pausadaSesion);
		setAviso(t("sessionPaused"));
		actualizarTitulo(t("titlePaused"));
	}

	async function reanudar() {
		if (!sesion) return;
		const reanudada = await servicio.reanudar(sesion);
		setSesion(reanudada);
		setAviso(t("sessionResumed"));
		actualizarTitulo(t("titleTempo"));
	}

	async function saltarBreak() {
		if (!sesion || sesion.modo === "focus") return;
		const resultado = await servicio.saltarBreak(sesion);

		if (resultado.bloqueCompletado) {
			setSesion(null);
			setRestante(0);
			setBloqueCompletado(resultado.bloque);
			setAviso(t("blockDoneSkipped"));
			notificar(t("notifyBlockDoneTitle"), t("notifyFinalSkipped"));
			reproducirBeep();
			return;
		}

		if (resultado.sesion) {
			setSesion(resultado.sesion);
			setRestante(restanteSegundos(resultado.sesion));
			setAviso(t("breakSkippedNext"));
			notificar(t("notifySkipped"), t("notifySkippedBody"));
			reproducirBeep();
		}
	}

	async function cancelar() {
		if (!sesion) return;
		await servicio.cancelar(sesion);
		setSesion(null);
		setRestante(0);
		setBloqueCompletado(null);
		setAviso(t("blockCancelled"));
		actualizarTitulo(t("titleTempo"));
	}

	function descartarCompletado() {
		setBloqueCompletado(null);
		setAviso(null);
	}

	const valorSesion = useMemo(
		() => ({
			sesion,
			duracionMinutos,
			cargando,
			error,
			aviso,
			bloqueCompletado,
		}),
		[sesion, duracionMinutos, cargando, error, aviso, bloqueCompletado],
	);

	const valorAcciones: TimerActionsValue = {
		cambiarDuracion: setDuracionMinutos,
		iniciarBloque,
		pausar,
		reanudar,
		saltarBreak,
		cancelar,
		descartarCompletado,
	};

	return (
		<TimerSessionContext.Provider value={valorSesion}>
			<TimerActionsContext.Provider value={valorAcciones}>
				<TimerClockContext.Provider value={restante}>{children}</TimerClockContext.Provider>
			</TimerActionsContext.Provider>
		</TimerSessionContext.Provider>
	);
}

function etiquetaBloque(duracionMinutos: number): string {
	return (
		BLOQUES.find((bloque) => bloque.duracionMinutos === duracionMinutos)?.etiqueta ??
		`${duracionMinutos} min`
	);
}
