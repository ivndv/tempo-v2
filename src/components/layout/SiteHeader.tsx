import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Brand } from "./Brand";
import { HeaderNav, type NavItem } from "./HeaderNav";
import { HeaderShell } from "./HeaderShell";
import { botonNavPrimario } from "./styles";
import { UserMenu } from "./UserMenu";

interface SiteHeaderProps {
	acciones?: ReactNode;
}

// Header público: acciones estáticas o isla de sesión según la página.
export async function SiteHeader({ acciones }: SiteHeaderProps) {
	const t = await getTranslations("Nav");
	const sesion = await getTranslations("Session");

	const items: NavItem[] = [
		{ href: "/", label: t("home") },
		{ href: "/app", label: t("focus") },
		{ href: "/about", label: t("about") },
	];

	const contenido = acciones ?? (
		<>
			<Link href="/login" className={botonNavPrimario}>
				{sesion("login")}
			</Link>
			<UserMenu />
		</>
	);

	return (
		<HeaderShell skipLabel={t("skip")}>
			<div className="justify-self-start">
				<Brand />
			</div>
			<HeaderNav items={items} desktopActions={contenido} mobileActions={contenido} />
		</HeaderShell>
	);
}
