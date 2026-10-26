import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CORREO_CONTACTO } from "@/components/legal/contacto";
import { LegalSection, LegalShell } from "@/components/legal/LegalShell";
import { Link } from "@/i18n/navigation";
import { alternatesDe } from "@/i18n/seo";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "Terms" });

	return {
		title: t("metaTitle"),
		description: t("metaDescription"),
		alternates: alternatesDe("/terms", locale),
	};
}

export default async function TerminosPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations("Terms");
	const legal = await getTranslations("Legal");

	const correo = (chunks: React.ReactNode) => (
		<a href={`mailto:${CORREO_CONTACTO}`} className="text-primary hover:underline">
			{chunks}
		</a>
	);

	return (
		<LegalShell
			etiqueta={legal("label")}
			titulo={t("title")}
			actualizado={legal("updated", { date: t("updated") })}
		>
			<LegalSection titulo={t("acceptanceTitle")}>
				<p>{t("acceptanceText")}</p>
			</LegalSection>

			<LegalSection titulo={t("serviceTitle")}>
				<p>{t("serviceText")}</p>
			</LegalSection>

			<LegalSection titulo={t("accountTitle")}>
				<ul className="list-disc space-y-1.5 pl-5">
					<li>{t("accountPassword")}</li>
					<li>{t("accountEmail")}</li>
					<li>{t("accountSharing")}</li>
					<li>{t("accountGuest")}</li>
				</ul>
			</LegalSection>

			<LegalSection titulo={t("acceptableTitle")}>
				<p>{t("acceptableIntro")}</p>
				<ul className="list-disc space-y-1.5 pl-5">
					<li>{t("acceptableSecurity")}</li>
					<li>{t("acceptableAutomation")}</li>
					<li>{t("acceptableScraping")}</li>
					<li>{t("acceptableIllegal")}</li>
				</ul>
				<p>{t("acceptableSuspend")}</p>
			</LegalSection>

			<LegalSection titulo={t("plansTitle")}>
				<p>{t("plansText")}</p>
				<p>{t("plansCancel")}</p>
			</LegalSection>

			<LegalSection titulo={t("contentTitle")}>
				<p>{t("contentText")}</p>
			</LegalSection>

			<LegalSection titulo={t("availabilityTitle")}>
				<p>{t("availabilityText")}</p>
			</LegalSection>

			<LegalSection titulo={t("liabilityTitle")}>
				<p>{t("liabilityText")}</p>
			</LegalSection>

			<LegalSection titulo={t("changesTitle")}>
				<p>{t("changesText")}</p>
			</LegalSection>

			<LegalSection titulo={t("lawTitle")}>
				<p>{t("lawText")}</p>
			</LegalSection>

			<LegalSection titulo={t("contactTitle")}>
				<p>{t.rich("contactText", { correo, email: CORREO_CONTACTO })}</p>
			</LegalSection>

			<p className="border-t border-border pt-6 text-xs text-muted">
				{t("disclaimer")}{" "}
				<Link href="/privacy" className="text-primary hover:underline">
					{t("seePrivacy")}
				</Link>
				.
			</p>
		</LegalShell>
	);
}
