import { getPathname } from "./navigation";
import { routing } from "./routing";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tempo2.mgdc.site";

type Href = Parameters<typeof getPathname>[0]["href"];

export interface AlternatesSeo {
	canonical: string;
	languages: Record<string, string>;
}

// Canonical y hreflang para una ruta canónica de next-intl.
export function alternatesDe(href: Href, locale: string): AlternatesSeo {
	const languages = Object.fromEntries(
		routing.locales.map((locale) => [locale, `${SITE_URL}${getPathname({ locale, href })}`]),
	) as Record<string, string>;

	return {
		canonical: languages[locale] ?? languages[routing.defaultLocale],
		languages,
	};
}
