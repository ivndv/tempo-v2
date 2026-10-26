import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intl = createMiddleware(routing);

const APP = { en: "/app", es: "/es/app" };

type Locale = "en" | "es";

function localeDeRuta(pathname: string): Locale {
	return pathname === "/es" || pathname.startsWith("/es/") ? "es" : "en";
}

function sinPrefijo(pathname: string, locale: Locale): string {
	if (locale === "es") {
		return pathname.replace(/^\/es/, "") || "/";
	}

	return pathname;
}

function redirigir(url: URL, base: NextResponse): NextResponse {
	const respuesta = NextResponse.redirect(url);

	for (const cookie of base.cookies.getAll()) {
		respuesta.cookies.set(cookie);
	}

	return respuesta;
}

export async function proxy(request: NextRequest) {
	// 1. next-intl resuelve el idioma y reescribe la ruta interna.
	const respuestaIntl = intl(request);

	// Si intl ya redirige, no hay sesión que refrescar en esta petición.
	if (respuestaIntl.headers.get("location")) {
		return respuestaIntl;
	}

	const { pathname } = request.nextUrl;
	const locale = localeDeRuta(pathname);
	const ruta = sinPrefijo(pathname, locale);
	const paginasAuth = locale === "es" ? ["/iniciar-sesion", "/registro"] : ["/login", "/signup"];

	// Las páginas públicas se quedan estáticas: no consultamos Supabase.
	if (!ruta.startsWith("/app") && !paginasAuth.includes(ruta)) {
		return respuestaIntl;
	}

	// 2. Refresca la sesión de Supabase y escribe las cookies sobre la respuesta de intl.
	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					for (const { name, value } of cookiesToSet) {
						request.cookies.set(name, value);
					}

					for (const { name, value, options } of cookiesToSet) {
						respuestaIntl.cookies.set(name, value, options);
					}
				},
			},
		},
	);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	// 4. Si ya hay sesión, las pantallas de acceso no tienen sentido.
	if (user && paginasAuth.includes(ruta)) {
		const url = request.nextUrl.clone();
		url.pathname = APP[locale];
		url.search = "";
		return redirigir(url, respuestaIntl);
	}

	return respuestaIntl;
}

export const config = {
	matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
