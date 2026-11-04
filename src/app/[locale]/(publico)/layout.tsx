import { setRequestLocale } from "next-intl/server";
import { SessionActions } from "@/components/layout/SessionActions";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default async function PublicLayout({
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
			<SiteHeader acciones={<SessionActions />} />
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
