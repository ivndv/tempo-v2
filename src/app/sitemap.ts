import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { alternatesDe, SITE_URL } from "@/i18n/seo";

const paginas = ["/", "/about", "/pricing", "/privacy", "/terms"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
	return paginas.flatMap((href) => {
		const { languages } = alternatesDe(href, routing.defaultLocale);

		return routing.locales.map((locale) => ({
			url: `${SITE_URL}${getPathname({ locale, href })}`,
			lastModified: new Date(),
			changeFrequency: "monthly" as const,
			priority: href === "/" ? 1 : 0.7,
			alternates: { languages },
		}));
	});
}
