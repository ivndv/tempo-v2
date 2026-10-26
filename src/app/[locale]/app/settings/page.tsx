import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Dispositivo } from "@/modules/devices/domain/dispositivo";
import { GuestSettingsPanel } from "@/modules/profile/ui/GuestSettingsPanel";
import { SettingsPanel } from "@/modules/profile/ui/SettingsPanel";
import { SettingsTabs } from "@/modules/profile/ui/SettingsTabs";
import type { SettingsSection } from "@/modules/profile/ui/settingsSections";
import { getServerContainer } from "@/shared/infrastructure/container";
import { getPerfilActual } from "@/shared/infrastructure/getPerfilActual";
import { getUsuarioActual } from "@/shared/infrastructure/getUsuarioActual";

interface SettingsPageProps {
	params: Promise<{ locale: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const SECCIONES_CON_SESION: SettingsSection[] = [
	"profile",
	"preferences",
	"devices",
	"security",
	"export",
];
const SECCIONES_INVITADO: SettingsSection[] = ["preferences", "export"];

export default async function SettingsPage({ params, searchParams }: SettingsPageProps) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations("Settings");
	const busqueda = await searchParams;
	const user = await getUsuarioActual();

	const permitidas = user ? SECCIONES_CON_SESION : SECCIONES_INVITADO;
	const tabBruto = Array.isArray(busqueda.tab) ? busqueda.tab[0] : busqueda.tab;
	const seccion = permitidas.includes(tabBruto as SettingsSection)
		? (tabBruto as SettingsSection)
		: user
			? "profile"
			: "preferences";

	const contenedor = user ? await getServerContainer() : null;
	const plan = contenedor ? await contenedor.billing.plan.execute() : "free";
	const perfil = user ? await getPerfilActual() : null;

	let dispositivos: Dispositivo[] = [];

	if (contenedor && seccion === "devices") {
		dispositivos = await contenedor.dispositivos.listar.execute();
	}

	const tabs = user
		? [
				{ key: "profile", label: t("tabsProfile") },
				{ key: "preferences", label: t("tabsPreferences") },
				{ key: "devices", label: t("tabsDevices") },
				{ key: "security", label: t("tabsSecurity") },
				{ key: "export", label: t("tabsExport") },
			]
		: [
				{ key: "preferences", label: t("tabsPreferences") },
				{ key: "export", label: t("tabsExport") },
			];

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
				<p className="text-sm text-muted">{t("subtitle")}</p>
			</div>

			<SettingsTabs tabs={tabs} active={seccion} label={t("sections")} />

			{user ? (
				<SettingsPanel
					email={user.email}
					userId={user.id}
					perfil={
						perfil ?? {
							displayName: null,
							timezone: "America/Mexico_City",
							locale: "en",
						}
					}
					dispositivos={dispositivos}
					seccion={seccion}
					plan={plan}
				/>
			) : (
				<GuestSettingsPanel seccion={seccion} />
			)}
		</main>
	);
}
