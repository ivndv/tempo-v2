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
	const t = await getTranslations({ locale, namespace: "Privacy" });

	return {
		title: t("metaTitle"),
		description: t("metaDescription"),
		alternates: alternatesDe("/privacy", locale),
	};
}

export default async function PrivacidadPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations("Privacy");
	const legal = await getTranslations("Legal");

	const correo = (chunks: React.ReactNode) => (
		<a href={`mailto:${CORREO_CONTACTO}`} className="text-primary hover:underline">
			{chunks}
		</a>
	);

	const fuerte = (chunks: React.ReactNode) => <strong className="text-foreground">{chunks}</strong>;

	return (
		<LegalShell
			etiqueta={legal("label")}
			titulo={t("title")}
			actualizado={legal("updated", { date: t("updated") })}
		>
			<LegalSection titulo={t("responsibleTitle")}>
				<p>{t.rich("responsibleText", { correo, email: CORREO_CONTACTO })}</p>
			</LegalSection>

			<LegalSection titulo={t("dataTitle")}>
				<ul className="list-disc space-y-1.5 pl-5">
					<li>{t.rich("dataAccount", { strong: fuerte })}</li>
					<li>{t.rich("dataUsage", { strong: fuerte })}</li>
					<li>{t.rich("dataTechnical", { strong: fuerte })}</li>
					<li>{t.rich("dataPayments", { strong: fuerte })}</li>
				</ul>
			</LegalSection>

			<LegalSection titulo={t("browserTitle")}>
				<p>{t("browserText")}</p>
			</LegalSection>

			<LegalSection titulo={t("whyTitle")}>
				<ul className="list-disc space-y-1.5 pl-5">
					<li>{t("whyAccount")}</li>
					<li>{t("whyProgress")}</li>
					<li>{t("whyEmails")}</li>
					<li>{t("whySecurity")}</li>
					<li>{t("whyBilling")}</li>
				</ul>
				<p>{t("whyNoSell")}</p>
			</LegalSection>

			<LegalSection titulo={t("sharingTitle")}>
				<p>{t("sharingText")}</p>
				<ul className="list-disc space-y-1.5 pl-5">
					<li>{t.rich("sharingSupabase", { strong: fuerte })}</li>
					<li>{t.rich("sharingCloudflare", { strong: fuerte })}</li>
					<li>{t.rich("sharingResend", { strong: fuerte })}</li>
					<li>{t.rich("sharingUpstash", { strong: fuerte })}</li>
					<li>{t.rich("sharingPolar", { strong: fuerte })}</li>
				</ul>
			</LegalSection>

			<LegalSection titulo={t("cookiesTitle")}>
				<p>{t("cookiesText")}</p>
			</LegalSection>

			<LegalSection titulo={t("retentionTitle")}>
				<p>{t("retentionText")}</p>
			</LegalSection>

			<LegalSection titulo={t("rightsTitle")}>
				<p>{t.rich("rightsText", { correo, email: CORREO_CONTACTO })}</p>
			</LegalSection>

			<LegalSection titulo={t("minorsTitle")}>
				<p>{t("minorsText")}</p>
			</LegalSection>

			<LegalSection titulo={t("changesTitle")}>
				<p>{t("changesText")}</p>
			</LegalSection>

			<p className="border-t border-border pt-6 text-xs text-muted">
				{t("disclaimer")}{" "}
				<Link href="/terms" className="text-primary hover:underline">
					{t("seeTerms")}
				</Link>
				.
			</p>
		</LegalShell>
	);
}
