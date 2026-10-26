import { BarChart3, ListChecks, Timer, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { alternatesDe } from "@/i18n/seo";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "About" });

	return {
		title: t("metaTitle"),
		description: t("metaDescription"),
		alternates: alternatesDe("/about", locale),
	};
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations("About");

	const pasos = [
		{ titulo: t("step1Title"), texto: t("step1Text") },
		{ titulo: t("step2Title"), texto: t("step2Text") },
		{ titulo: t("step3Title"), texto: t("step3Text") },
		{ titulo: t("step4Title"), texto: t("step4Text") },
	];

	const caracteristicas = [
		{ icono: Timer, titulo: t("feature1Title"), texto: t("feature1Text") },
		{ icono: ListChecks, titulo: t("feature2Title"), texto: t("feature2Text") },
		{ icono: BarChart3, titulo: t("feature3Title"), texto: t("feature3Text") },
		{ icono: WifiOff, titulo: t("feature4Title"), texto: t("feature4Text") },
	];

	return (
		<main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
			<section className="space-y-4 text-center">
				<span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
					<Timer size={26} aria-hidden />
				</span>
				<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
				<p className="mx-auto max-w-xl text-lg leading-relaxed text-muted">{t("subtitle")}</p>
			</section>

			<section className="mt-16 space-y-6">
				<h2 className="text-2xl font-semibold tracking-tight">{t("whatTitle")}</h2>

				<div className="space-y-4 rounded-2xl border border-border bg-surface p-6 text-base leading-relaxed text-foreground">
					<p>
						{t.rich("whatP1", {
							name: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
							em: (chunks) => <em>{chunks}</em>,
						})}
					</p>
					<p>
						{t.rich("whatP2", {
							badge: (chunks) => (
								<span className="rounded-full border border-success-border bg-success-bg px-2.5 py-0.5 text-sm font-medium text-primary">
									{chunks}
								</span>
							),
						})}
					</p>
				</div>
			</section>

			<section className="mt-16 space-y-6">
				<h2 className="text-2xl font-semibold tracking-tight">{t("howTitle")}</h2>

				<ol className="grid gap-4 sm:grid-cols-2">
					{pasos.map((paso, indice) => (
						<li
							key={paso.titulo}
							className="flex gap-4 rounded-2xl border border-border bg-surface p-5"
						>
							<span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
								{indice + 1}
							</span>
							<div className="space-y-1">
								<h3 className="text-sm font-medium text-foreground">{paso.titulo}</h3>
								<p className="text-sm leading-relaxed text-muted">{paso.texto}</p>
							</div>
						</li>
					))}
				</ol>
			</section>

			<section className="mt-16 space-y-6">
				<h2 className="text-2xl font-semibold tracking-tight">{t("tempoTitle")}</h2>

				<div className="grid gap-4 sm:grid-cols-2">
					{caracteristicas.map((caracteristica) => (
						<article
							key={caracteristica.titulo}
							className="space-y-3 rounded-2xl border border-border bg-surface p-5"
						>
							<span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
								<caracteristica.icono size={20} aria-hidden />
							</span>
							<h3 className="text-sm font-medium text-foreground">{caracteristica.titulo}</h3>
							<p className="text-sm leading-relaxed text-muted">{caracteristica.texto}</p>
						</article>
					))}
				</div>
			</section>

			<section className="mt-16 space-y-4 rounded-3xl border border-success-border bg-success-bg px-6 py-10 text-center">
				<h2 className="text-2xl font-semibold tracking-tight">{t("ctaTitle")}</h2>
				<p className="mx-auto max-w-md text-sm leading-relaxed text-success-fg">{t("ctaText")}</p>
				<div className="flex justify-center pt-2">
					<Link
						href="/app"
						className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
					>
						{t("ctaButton")}
					</Link>
				</div>
			</section>
		</main>
	);
}
