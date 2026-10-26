"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { pedirPersistencia } from "@/shared/infrastructure/storage/persistence";

const CLAVE = "tempo:aviso-almacenamiento";

// Avisa si el navegador puede desalojar los datos locales.
export function StorageNotice() {
	const t = useTranslations("Storage");
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		let activo = true;

		try {
			if (window.localStorage.getItem(CLAVE) === "1") {
				return;
			}
		} catch {
			// Sin localStorage igual mostramos el aviso si aplica.
		}

		void pedirPersistencia().then((estado) => {
			if (activo && estado === "denegado") {
				setVisible(true);
			}
		});

		return () => {
			activo = false;
		};
	}, []);

	if (!visible) {
		return null;
	}

	function ocultar() {
		try {
			window.localStorage.setItem(CLAVE, "1");
		} catch {
			// Si no se puede recordar la decisión, el aviso vuelve en la próxima visita.
		}

		setVisible(false);
	}

	return (
		<div className="mx-auto mt-4 w-full max-w-6xl px-4 sm:px-6">
			<div
				role="status"
				className="flex items-start justify-between gap-3 rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-xs text-warning-fg"
			>
				<p>{t("warning")}</p>
				<button
					type="button"
					onClick={ocultar}
					aria-label={t("dismiss")}
					className="rounded px-1 text-warning-fg transition hover:text-warning-fg"
				>
					×
				</button>
			</div>
		</div>
	);
}
