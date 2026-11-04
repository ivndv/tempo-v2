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
	const t = await getTranslations({ locale, namespace: "Home" });

	return {
		title: t("metaTitle"),
		description: t("metaDescription"),
		alternates: alternatesDe("/", locale),
	};
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations("Home");

	const pasos = [
		{ titulo: t("step1Title"), texto: t("step1Text") },
		{ titulo: t("step2Title"), texto: t("step2Text") },
		{ titulo: t("step3Title"), texto: t("step3Text") },
	];

	return (
		<main className="flex flex-1 flex-col">
			{/* Hero a viewport completo; el fondo sube por debajo del header fijo */}
			<section className="relative -mt-[var(--header-h)] flex min-h-[100svh] items-center overflow-hidden pt-[var(--header-h)] pb-12">
				<div aria-hidden className="hero-glow pointer-events-none absolute inset-0" />

				<div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 text-center">
					<p className="text-xs font-medium uppercase tracking-[0.35em] text-primary">
						{t("eyebrow")}
					</p>

					<h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
						{t("title")}
					</h1>

					<p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
						{t.rich("description", {
							coding: (chunks) => <span className="font-semibold text-primary">{chunks}</span>,
							studying: (chunks) => (
								<span className="font-semibold text-teal-600 dark:text-teal-300">{chunks}</span>
							),
							creating: (chunks) => (
								<span className="font-semibold text-lime-700 dark:text-lime-300">{chunks}</span>
							),
						})}
					</p>

					<div className="mt-8 flex justify-center">
						<Link
							href="/app"
							className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary-hover"
						>
							{t("cta")}
						</Link>
					</div>

					<h2 className="sr-only">{t("stepsTitle")}</h2>

					<div className="mt-10 grid w-full gap-2 sm:grid-cols-3 sm:gap-3">
						{pasos.map((paso, indice) => (
							<article
								key={paso.titulo}
								className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left sm:flex-col sm:items-start sm:p-5"
							>
								<span className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-xs font-semibold text-primary">
									{indice + 1}
								</span>
								<div>
									<h3 className="text-sm font-medium text-foreground">{paso.titulo}</h3>
									<p className="mt-1 line-clamp-2 text-xs leading-snug text-muted sm:mt-2 sm:text-sm sm:line-clamp-none">
										{paso.texto}
									</p>
								</div>
							</article>
						))}
					</div>

					<Link href="/about" className="mt-6 text-sm text-primary transition hover:underline">
						{t("aboutLink")}
					</Link>
				</div>
			</section>
		</main>
	);
}
