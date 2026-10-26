import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/i18n/seo";

export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;

	if (!hasLocale(routing.locales, locale)) {
		return {};
	}

	const t = await getTranslations({ locale, namespace: "Metadata" });

	return {
		metadataBase: new URL(SITE_URL),
		title: t("title"),
		description: t("description"),
	};
}

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;

	if (!hasLocale(routing.locales, locale)) {
		notFound();
	}

	setRequestLocale(locale);

	const todas = await getMessages();
	// Solo los mensajes que usan componentes cliente.
	const mensajesCliente = {
		Nav: todas.Nav,
		Session: todas.Session,
		Auth: todas.Auth,
		Timer: todas.Timer,
		Tasks: todas.Tasks,
		Stats: todas.Stats,
		Storage: todas.Storage,
		Sync: todas.Sync,
		App: todas.App,
		Dashboard: todas.Dashboard,
		Settings: todas.Settings,
	};

	return (
		<html lang={locale} suppressHydrationWarning>
			<body className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
				<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
					<NextIntlClientProvider messages={mensajesCliente}>{children}</NextIntlClientProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
