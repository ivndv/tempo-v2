import { setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/layout/AppHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { RegisterDevice } from "@/modules/devices/ui/RegisterDevice";
import { TimerProvider } from "@/modules/pomodoros/ui/TimerProvider";
import { SyncOnLogin } from "@/modules/sync/ui/SyncOnLogin";
import { getPerfilActual } from "@/shared/infrastructure/getPerfilActual";
import { getUsuarioActual } from "@/shared/infrastructure/getUsuarioActual";

export default async function AppLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	const user = await getUsuarioActual();
	const perfil = user ? await getPerfilActual() : null;

	return (
		<TimerProvider timezone={perfil?.timezone ?? null}>
			<AppHeader user={user ? { email: user.email } : null} />
			{user ? <RegisterDevice /> : null}
			<div
				id="contenido"
				className="flex flex-1 flex-col scroll-mt-[var(--header-h)] pt-[var(--header-h)]"
			>
				{children}
			</div>
			<SiteFooter />
			<SyncOnLogin />
		</TimerProvider>
	);
}
