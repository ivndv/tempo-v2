import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Brand } from "./Brand";
import { HeaderNav, type NavItem } from "./HeaderNav";
import { HeaderShell } from "./HeaderShell";
import { botonNavPrimario } from "./styles";
import { UserMenu } from "./UserMenu";

interface AppHeaderProps {
	user: { email: string } | null;
}

// Header de la aplicación: muestra la sesión y el acceso al dashboard.
export async function AppHeader({ user }: AppHeaderProps) {
	const t = await getTranslations("Nav");
	const sesion = await getTranslations("Session");

	const items: NavItem[] = [
		{ href: "/", label: t("home") },
		{ href: "/app", label: t("focus") },
	];

	if (user) {
		items.push({ href: "/app/dashboard", label: t("dashboard") });
	} else {
		items.push({ href: "/about", label: t("about") });
	}

	const acciones = user ? (
		<UserMenu email={user.email} />
	) : (
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
				<Brand href="/app" />
			</div>
			<HeaderNav items={items} desktopActions={acciones} mobileActions={acciones} />
		</HeaderShell>
	);
}
