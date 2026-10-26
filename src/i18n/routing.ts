import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
	locales: ["en", "es"],
	defaultLocale: "en",
	localeDetection: false,
	localePrefix: "as-needed",
	pathnames: {
		"/": "/",
		"/about": {
			en: "/about",
			es: "/acerca",
		},
		"/pricing": {
			en: "/pricing",
			es: "/precios",
		},
		"/privacy": {
			en: "/privacy",
			es: "/privacidad",
		},
		"/terms": {
			en: "/terms",
			es: "/terminos",
		},
		"/login": {
			en: "/login",
			es: "/iniciar-sesion",
		},
		"/signup": {
			en: "/signup",
			es: "/registro",
		},
		"/forgot-password": {
			en: "/forgot-password",
			es: "/recuperar",
		},
		"/reset-password": {
			en: "/reset-password",
			es: "/restablecer",
		},
		"/app": "/app",
		"/app/dashboard": "/app/dashboard",
		"/app/settings": {
			en: "/app/settings",
			es: "/app/ajustes",
		},
	},
});

export type Locale = (typeof routing.locales)[number];
