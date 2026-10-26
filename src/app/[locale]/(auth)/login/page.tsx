import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { Link } from "@/i18n/navigation";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations("Auth");

	return (
		<AuthShell
			titulo={t("loginTitle")}
			volverA="/"
			subtitulo={t.rich("loginSubtitle", {
				link: (chunks) => (
					<Link href="/signup" className="text-primary transition hover:underline">
						{chunks}
					</Link>
				),
			})}
		>
			<LoginForm />
		</AuthShell>
	);
}
