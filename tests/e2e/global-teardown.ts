import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/shared/infrastructure/db/database.types";
import { cargarEnvLocal } from "../env";
import { E2E_FREE, E2E_PRO } from "./const";

cargarEnvLocal();

export default async function globalTeardown(): Promise<void> {
	if (process.env.E2E_KEEP_USERS === "1") {
		return;
	}

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		return;
	}

	const admin = createClient<Database>(url, key, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});

	const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

	if (error) {
		return;
	}

	const emails = new Set([E2E_FREE.email, E2E_PRO.email]);

	for (const usuario of data.users) {
		if (usuario.email && emails.has(usuario.email)) {
			await admin.auth.admin.deleteUser(usuario.id);
		}
	}
}
