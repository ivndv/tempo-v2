import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

// Cliente administrativo: bypassa RLS. Solo para webhooks y tareas de servidor.
export function createAdminClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !serviceRoleKey) {
		throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
	}

	return createClient<Database>(url, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}
