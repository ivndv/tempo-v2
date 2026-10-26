"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

type Href = Parameters<ReturnType<typeof useRouter>["push"]>[0];

interface VolverAtrasProps {
	fallback?: Href;
}

// Regresa a la página anterior o al destino indicado si no hay historial.
export function VolverAtras({ fallback = "/" }: VolverAtrasProps) {
	const t = useTranslations("Auth");
	const router = useRouter();

	function volver() {
		const referrer = document.referrer;

		if (referrer) {
			try {
				if (new URL(referrer).origin === window.location.origin) {
					router.back();
					return;
				}
			} catch {
				// Referrer inválido: se usa el fallback.
			}
		}

		router.push(fallback);
	}

	return (
		<button
			type="button"
			onClick={volver}
			className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-muted transition hover:text-foreground"
		>
			<ArrowLeft size={16} aria-hidden />
			{t("back")}
		</button>
	);
}
