"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../db/database.types";

// Cliente de Supabase para componentes de cliente.
export function createClient() {
	return createBrowserClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
	);
}
