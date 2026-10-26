"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { crearSyncService } from "@/modules/sync/infrastructure/crearSyncService";
import { createClient } from "@/shared/infrastructure/supabase/client";

type EstadoSync = "idle" | "syncing" | "ok" | "pending" | "error";

export function SyncOnLogin() {
	const t = useTranslations("Sync");
	const router = useRouter();
	const [estado, setEstado] = useState<EstadoSync>("idle");
	const [pendientes, setPendientes] = useState(0);
	const [muertos, setMuertos] = useState(0);
	const ejecutando = useRef(false);

	useEffect(() => {
		let activo = true;
		let ultima = 0;
		// Sincroniza al montar, cada minuto y al volver a la pestaña (con throttle).
		const INTERVALO_MS = 60_000;

		const ejecutar = async (forzar = false) => {
			if (!navigator.onLine || ejecutando.current) {
				return;
			}

			if (!forzar && Date.now() - ultima < INTERVALO_MS) {
				return;
			}

			ultima = Date.now();
			ejecutando.current = true;

			try {
				const supabase = createClient();
				// getSession lee la cookie sin ir a GoTrue; el sync fallará si expiró.
				const {
					data: { session },
				} = await supabase.auth.getSession();

				if (!session) {
					if (activo) {
						setEstado("idle");
						setPendientes(0);
						setMuertos(0);
					}
					return;
				}

				if (activo) {
					setEstado("syncing");
				}

				const servicio = crearSyncService();
				const resultado = await servicio.execute();

				if (!activo) {
					return;
				}

				setPendientes(resultado.pendientes);
				setMuertos(resultado.muertos);

				if (resultado.muertos > 0 || resultado.fallidos > 0) {
					setEstado("error");
				} else if (resultado.pendientes === 0) {
					setEstado("ok");
				} else {
					setEstado("pending");
				}

				if (resultado.subidos > 0) {
					router.refresh();
				}
			} catch {
				if (activo) {
					setEstado("error");
				}
			} finally {
				ejecutando.current = false;
			}
		};

		void ejecutar(true);
		const intervalo = window.setInterval(() => void ejecutar(true), INTERVALO_MS);

		const onOnline = () => {
			void ejecutar(true);
		};
		const onVisibility = () => {
			if (document.visibilityState === "visible") {
				void ejecutar();
			}
		};

		window.addEventListener("online", onOnline);
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			activo = false;
			window.clearInterval(intervalo);
			window.removeEventListener("online", onOnline);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [router]);

	if (estado === "idle") {
		return null;
	}

	const texto =
		estado === "syncing"
			? t("syncing")
			: estado === "ok"
				? t("synced")
				: estado === "error"
					? muertos > 0
						? t("dead", { count: muertos })
						: t("error", { count: pendientes })
					: t("pending", { count: pendientes });

	return (
		<div
			aria-live="polite"
			className={`fixed right-4 bottom-4 z-50 rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur ${
				estado === "error"
					? "border-danger-border bg-danger-bg text-danger-fg"
					: "border-border bg-background/80 text-foreground"
			}`}
		>
			{texto}
		</div>
	);
}
