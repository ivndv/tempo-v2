"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { crearSyncService } from "@/modules/sync/infrastructure/crearSyncService";
import { clearLocalData } from "@/shared/infrastructure/dexie/db";
import { createClient } from "@/shared/infrastructure/supabase/client";

export function useLogout() {
	const t = useTranslations("Session");
	const router = useRouter();
	const [saliendo, setSaliendo] = useState(false);

	async function salir() {
		setSaliendo(true);

		try {
			const servicio = crearSyncService();
			const resultado = await servicio.execute();

			if (resultado.pendientes > 0) {
				const confirmar = window.confirm(t("pendingSync", { count: resultado.pendientes }));

				if (!confirmar) {
					setSaliendo(false);
					return;
				}
			}

			const supabase = createClient();
			await supabase.auth.signOut();
			await clearLocalData();
			router.replace("/login");
			router.refresh();
		} catch {
			setSaliendo(false);
		}
	}

	return { salir, saliendo };
}
