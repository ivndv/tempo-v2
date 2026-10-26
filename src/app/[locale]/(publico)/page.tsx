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
		<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-20">
			<div className="space-y-4">
				<p className="text-xs font-medium uppercase tracking-[0.35em] text-primary">
					{t("eyebrow")}
				</p>
				<h1 className="text-5xl font-semibold tracking-tight text-balance">{t("title")}</h1>
				<p className="max-w-xl text-lg leading-relaxed text-muted">
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
			</div>

			<div className="flex">
				<Link
					href="/app"
					className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary-hover"
				>
					{t("cta")}
				</Link>
			</div>

			<div className="space-y-4">
				<h2 className="text-lg font-medium tracking-tight">{t("stepsTitle")}</h2>

				<section className="grid gap-3 sm:grid-cols-3">
					{pasos.map((paso, indice) => (
						<article key={paso.titulo} className="rounded-2xl border border-border bg-surface p-5">
							<span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
								{indice + 1}
							</span>
							<h3 className="mt-3 text-sm font-medium text-foreground">{paso.titulo}</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted">{paso.texto}</p>
						</article>
					))}
				</section>
			</div>

			<p className="text-sm text-muted">
				<Link href="/about" className="text-primary transition hover:underline">
					{t("aboutLink")}
				</Link>
			</p>
		</main>
	);
}
