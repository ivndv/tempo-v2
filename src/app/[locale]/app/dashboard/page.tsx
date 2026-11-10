import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { DashboardResumen } from "@/modules/analytics/domain/dashboard";
import { DashboardPro } from "@/modules/analytics/ui/DashboardPro";
import { DashboardView } from "@/modules/analytics/ui/DashboardView";
import type { Plan } from "@/modules/billing/domain/plan";
import { getServerContainer } from "@/shared/infrastructure/container";
import { getPerfilActual } from "@/shared/infrastructure/getPerfilActual";
import { getUsuarioActual } from "@/shared/infrastructure/getUsuarioActual";

const RANGOS_PRO = [7, 30, 90, 365, 730, 0];
const RANGOS_FREE = [7, 30];

interface DashboardPageProps {
	params: Promise<{ locale: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations("Dashboard");
	const busqueda = await searchParams;

	const user = await getUsuarioActual();
	const contenedor = user ? await getServerContainer() : null;

	// Perfil y plan son independientes: se piden en paralelo.
	const [perfil, plan] = await Promise.all([
		user ? getPerfilActual() : Promise.resolve(null),
		contenedor ? contenedor.billing.plan.execute() : Promise.resolve<Plan>("free"),
	]);

	const rangoBruto = Array.isArray(busqueda.range) ? busqueda.range[0] : busqueda.range;
	const dispositivoBruto = Array.isArray(busqueda.device) ? busqueda.device[0] : busqueda.device;
	const permitidos = plan === "pro" ? RANGOS_PRO : RANGOS_FREE;
	const rangoSolicitado = Number(rangoBruto);
	const rango = permitidos.includes(rangoSolicitado) ? rangoSolicitado : 30;
	const deviceId = plan === "pro" && dispositivoBruto ? dispositivoBruto : null;

	let dispositivos: { id: string; nombre: string }[] = [];

	let datosPro: DashboardResumen | null = null;
	let offline = false;
	let devicesUnavailable = false;

	if (contenedor && plan === "pro") {
		// Ambos dependen del plan, pero no entre sí: se piden en paralelo.
		const [resDispositivos, resDatos] = await Promise.allSettled([
			contenedor.dispositivos.listar.execute(),
			contenedor.analytics.dashboard.execute({ dias: rango, deviceId }),
		]);

		if (resDispositivos.status === "fulfilled") {
			dispositivos = resDispositivos.value.map((dispositivo) => ({
				id: dispositivo.id,
				nombre: dispositivo.nombre,
			}));
		} else {
			devicesUnavailable = true;
		}

		if (resDatos.status === "fulfilled") {
			datosPro = resDatos.value;
		} else {
			offline = true;
		}
	}

	return (
		<main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
					<p className="text-sm text-muted">{t("subtitle")}</p>
				</div>

				<Link
					href="/app"
					className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition hover:border-foreground/40"
				>
					{t("back")}
				</Link>
			</div>

			{devicesUnavailable ? (
				<p className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-fg">
					{t("devicesUnavailable")}
				</p>
			) : null}

			{datosPro && user ? (
				<DashboardPro
					userId={user.id}
					datosIniciales={datosPro}
					rangoInicial={rango}
					deviceInicial={deviceId}
					dispositivos={dispositivos}
				/>
			) : (
				<DashboardView
					plan={plan}
					guest={!user}
					timezone={perfil?.timezone ?? null}
					dispositivos={dispositivos}
					offline={offline}
				/>
			)}
		</main>
	);
}
