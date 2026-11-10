import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/modules/auth/ui/AuthShell";
import { RecuperarForm } from "@/modules/auth/ui/RecuperarForm";

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
