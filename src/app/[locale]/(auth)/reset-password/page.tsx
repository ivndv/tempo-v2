import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { RestablecerForm } from "@/components/auth/RestablecerForm";

export default async function RestablecerPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations("Auth");

	return (
		<AuthShell titulo={t("resetTitle")} subtitulo={t("resetSubtitle")} volverA="/forgot-password">
			<RestablecerForm />
		</AuthShell>
	);
}
