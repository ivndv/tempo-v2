import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegistroForm } from "@/components/auth/RegistroForm";
import { Link } from "@/i18n/navigation";

export default async function RegistroPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations("Auth");

	return (
		<AuthShell
			titulo={t("signupTitle")}
			volverA="/login"
			subtitulo={t.rich("signupSubtitle", {
				link: (chunks) => (
					<Link href="/login" className="text-primary transition hover:underline">
						{chunks}
					</Link>
				),
			})}
		>
			<RegistroForm />
		</AuthShell>
	);
}
