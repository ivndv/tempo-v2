import { setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default async function AuthLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);

	return (
		<>
			<SiteHeader />
			<div
				id="contenido"
				className="flex flex-1 flex-col scroll-mt-[var(--header-h)] pt-[var(--header-h)]"
			>
				{children}
			</div>
			<SiteFooter />
		</>
	);
}
