"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { getClientContainer } from "@/shared/infrastructure/clientContainer";
import { clearLocalData } from "@/shared/infrastructure/dexie/db";

export function useLogout() {
	const t = useTranslations("Session");
	const router = useRouter();
	const queryClient = useQueryClient();
	const [saliendo, setSaliendo] = useState(false);

	async function salir() {
		setSaliendo(true);

		try {
			const contenedor = getClientContainer();
			const resultado = await contenedor.sync.ejecutar();

			if (resultado.pendientes > 0) {
				const confirmar = window.confirm(t("pendingSync", { count: resultado.pendientes }));

				if (!confirmar) {
					setSaliendo(false);
					return;
				}
			}

			await contenedor.auth.cerrarSesion();
			await clearLocalData();
			queryClient.clear();
			router.replace("/login");
			router.refresh();
		} catch {
			setSaliendo(false);
		}
	}

	return { salir, saliendo };
}
