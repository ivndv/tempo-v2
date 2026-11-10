import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/modules/auth/ui/AuthShell";
import { RestablecerForm } from "@/modules/auth/ui/RestablecerForm";

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
