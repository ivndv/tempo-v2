import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Permite usar los bindings de Cloudflare (wrangler.jsonc) durante `next dev`.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
	reactStrictMode: true,
	experimental: {
		// Reutiliza el payload RSC en el navegador durante 30 s. Sin esto, Next
		// vuelve al servidor en cada navegación (default: dynamic = 0).
		staleTimes: {
			dynamic: 30,
			static: 300,
		},
	},
	async redirects() {
		return [
			{ source: "/precios", destination: "/pricing", permanent: true },
			{ source: "/privacidad", destination: "/privacy", permanent: true },
			{ source: "/terminos", destination: "/terms", permanent: true },
			{ source: "/registro", destination: "/signup", permanent: true },
			{ source: "/recuperar", destination: "/forgot-password", permanent: true },
			{ source: "/restablecer", destination: "/reset-password", permanent: true },
		];
	},
};

export default withNextIntl(nextConfig);
