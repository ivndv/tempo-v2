import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { RecuperarForm } from "@/components/auth/RecuperarForm";

export default async function RecuperarPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations("Auth");

	return (
		<AuthShell titulo={t("forgotTitle")} subtitulo={t("forgotSubtitle")} volverA="/login">
			<RecuperarForm />
		</AuthShell>
	);
}
