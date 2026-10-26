import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "../db/database.types";
import { fetchObservado } from "../perf/observador";

// Cliente de Supabase para Server Components, Server Actions y Route Handlers.
// Usa las cookies de la sesión para que RLS aplique con el usuario actual.
export async function createClient() {
	const cookieStore = await cookies();
	const cabeceras = await headers();
	const observador = { ray: cabeceras.get("cf-ray") ?? "local" };

	return createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					try {
						for (const { name, value, options } of cookiesToSet) {
							cookieStore.set(name, value, options);
						}
					} catch {
						// Los Server Components no pueden escribir cookies.
						// El proxy refresca la sesión en la siguiente request.
					}
				},
			},
			global: {
				fetch: fetchObservado(observador),
			},
		},
	);
}
