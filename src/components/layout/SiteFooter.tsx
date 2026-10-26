import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Brand } from "./Brand";

interface EnlaceFooter {
	href: "/app" | "/app/dashboard" | "/pricing" | "/about" | "/privacy" | "/terms";
	label: string;
}

// Footer compartido por la landing, el about y la aplicación.
export async function SiteFooter() {
	const t = await getTranslations("Footer");
	const anio = new Date().getFullYear();

	const producto: EnlaceFooter[] = [
		{ href: "/app", label: t("focus") },
		{ href: "/app/dashboard", label: t("dashboard") },
		{ href: "/pricing", label: t("pricing") },
		{ href: "/about", label: t("about") },
	];

	const legal: EnlaceFooter[] = [
		{ href: "/privacy", label: t("privacy") },
		{ href: "/terms", label: t("terms") },
	];

	return (
		<footer className="mt-auto border-t border-border bg-background">
			<div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
				<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
					<div className="space-y-2">
						<Brand />
						<p className="max-w-xs text-sm text-muted">{t("tagline")}</p>
					</div>

					<GrupoEnlaces titulo={t("product")} enlaces={producto} />
					<GrupoEnlaces titulo={t("legal")} enlaces={legal} />
				</div>

				<div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
					<p>
						© {anio} Tempo · {t("madeBy")}
					</p>
					<p>{t("stack")}</p>
				</div>
			</div>
		</footer>
	);
}

function GrupoEnlaces({ titulo, enlaces }: { titulo: string; enlaces: EnlaceFooter[] }) {
	return (
		<div className="space-y-3">
			<h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted">{titulo}</h2>

			<ul className="space-y-2 text-sm">
				{enlaces.map((enlace) => (
					<li key={enlace.href}>
						<Link href={enlace.href} className="text-muted transition-colors hover:text-foreground">
							{enlace.label}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
