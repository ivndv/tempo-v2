import { Check } from "lucide-react";
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
	const t = await getTranslations({ locale, namespace: "Pricing" });

	return {
		title: t("metaTitle"),
		description: t("metaDescription"),
		alternates: alternatesDe("/pricing", locale),
	};
}

export default async function PreciosPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations("Pricing");

	const gratis = [t("freeFeature1"), t("freeFeature2"), t("freeFeature3"), t("freeFeature4")];

	const pro = [t("proFeature1"), t("proFeature2"), t("proFeature3"), t("proFeature4")];

	const preguntas = [
		{ pregunta: t("faq1Question"), respuesta: t("faq1Answer") },
		{ pregunta: t("faq2Question"), respuesta: t("faq2Answer") },
		{ pregunta: t("faq3Question"), respuesta: t("faq3Answer") },
	];

	return (
		<main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
			<header className="space-y-3 text-center">
				<p className="text-xs font-medium uppercase tracking-[0.35em] text-primary">
					{t("eyebrow")}
				</p>
				<h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
				<p className="mx-auto max-w-xl text-lg leading-relaxed text-muted">{t("subtitle")}</p>
			</header>

			<section className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
				<article className="flex flex-col rounded-2xl border border-border bg-surface p-6">
					<h2 className="text-sm font-medium text-foreground">{t("free")}</h2>
					<p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
						{t("freePrice")}{" "}
						<span className="text-sm font-normal text-muted">{t("freePeriod")}</span>
					</p>
					<p className="mt-2 text-sm text-muted">{t("freeDescription")}</p>

					<ul className="mt-6 flex-1 space-y-2.5 text-sm text-foreground">
						{gratis.map((punto) => (
							<li key={punto} className="flex gap-2.5">
								<Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
								{punto}
							</li>
						))}
					</ul>

					<Link
						href="/signup"
						className="mt-6 inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground/40"
					>
						{t("freeCta")}
					</Link>
				</article>

				<article className="relative flex flex-col rounded-2xl border border-success-border bg-success-bg p-6">
					<span className="absolute right-4 top-4 rounded-full border border-success-border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-primary">
						{t("comingSoon")}
					</span>

					<h2 className="text-sm font-medium text-primary">{t("pro")}</h2>
					<p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
						{t("proPrice")} <span className="text-sm font-normal text-muted">{t("proPeriod")}</span>
					</p>
					<p className="mt-1 text-xs text-muted">{t("proAnnual")}</p>
					<p className="mt-2 text-sm text-success-fg">{t("proDescription")}</p>

					<ul className="mt-6 flex-1 space-y-2.5 text-sm text-foreground">
						{pro.map((punto) => (
							<li key={punto} className="flex gap-2.5">
								<Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
								{punto}
							</li>
						))}
					</ul>

					<button
						type="button"
						disabled
						className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-60"
					>
						{t("activate")}
					</button>
				</article>
			</section>

			<p className="mt-6 text-center text-xs text-muted">{t("note")}</p>

			<section className="mx-auto mt-16 max-w-3xl space-y-5">
				<h2 className="text-xl font-semibold tracking-tight">{t("faqTitle")}</h2>

				<dl className="space-y-4">
					{preguntas.map((item) => (
						<div key={item.pregunta} className="rounded-2xl border border-border bg-surface p-5">
							<dt className="text-sm font-medium text-foreground">{item.pregunta}</dt>
							<dd className="mt-2 text-sm leading-relaxed text-muted">{item.respuesta}</dd>
						</div>
					))}
				</dl>
			</section>
		</main>
	);
}
