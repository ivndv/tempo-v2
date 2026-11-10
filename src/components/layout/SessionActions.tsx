"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuthSession } from "@/modules/auth/ui/useAuthSession";
import { botonNavPrimario } from "./styles";
import { UserMenu } from "./UserMenu";

// Acciones del header público según la sesión del navegador.
export function SessionActions() {
	const t = useTranslations("Session");
	const usuario = useAuthSession();
	const email = usuario?.email ?? null;

	if (!email) {
		return (
			<>
				<Link href="/login" className={botonNavPrimario}>
					{t("login")}
				</Link>
				<UserMenu />
			</>
		);
	}

	return <UserMenu email={email} />;
}
