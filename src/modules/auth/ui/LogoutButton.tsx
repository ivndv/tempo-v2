"use client";

import { useTranslations } from "next-intl";
import { useLogout } from "./useLogout";

export function LogoutButton() {
	const t = useTranslations("Session");
	const { salir, saliendo } = useLogout();

	return (
		<button
			type="button"
			onClick={salir}
			disabled={saliendo}
			className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition hover:border-foreground/40 disabled:opacity-60"
		>
			{saliendo ? t("loggingOut") : t("logout")}
		</button>
	);
}
