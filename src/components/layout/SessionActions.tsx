"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/shared/infrastructure/supabase/client";
import { botonNavPrimario } from "./styles";
import { UserMenu } from "./UserMenu";

// Acciones del header público según la sesión del navegador.
export function SessionActions() {
	const t = useTranslations("Session");
	const [email, setEmail] = useState<string | null>(null);

	useEffect(() => {
		const supabase = createClient();
		let activo = true;

		void supabase.auth.getSession().then(({ data }) => {
			if (activo) setEmail(data.session?.user.email ?? null);
		});

		const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => {
			if (activo) setEmail(sesion?.user.email ?? null);
		});

		return () => {
			activo = false;
			data.subscription.unsubscribe();
		};
	}, []);

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
