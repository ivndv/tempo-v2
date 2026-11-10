import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/infrastructure/db/database.types";
import { cargarEnvLocal } from "../env";

cargarEnvLocal();

export type ClienteSupabase = SupabaseClient<Database>;

export interface UsuarioPrueba {
	id: string;
	email: string;
	password: string;
	client: ClienteSupabase;
}

const PASSWORD = "TempoTest123!";

export const integracionDisponible = Boolean(
	process.env.NEXT_PUBLIC_SUPABASE_URL &&
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
		process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function env(nombre: string): string {
	const valor = process.env[nombre];

	if (!valor) {
		throw new Error(`Falta ${nombre} para los tests de integración`);
	}

	return valor;
}

export function crearAdmin(): ClienteSupabase {
	return createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}

export function crearAnonimo(): ClienteSupabase {
	return createClient<Database>(
		env("NEXT_PUBLIC_SUPABASE_URL"),
		env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		},
	);
}

export async function crearUsuarioPrueba(prefijo: string): Promise<UsuarioPrueba> {
	const admin = crearAdmin();
	const email = `${prefijo}-${crypto.randomUUID()}@example.com`;

	const { data, error } = await admin.auth.admin.createUser({
		email,
		password: PASSWORD,
		email_confirm: true,
	});

	if (error || !data.user) {
		throw new Error(`No se pudo crear el usuario ${prefijo}: ${error?.message ?? "sin usuario"}`);
	}

	const { data: link, error: linkError } = await admin.auth.admin.generateLink({
		type: "magiclink",
		email,
	});

	if (linkError || !link.properties.hashed_token) {
		throw new Error(
			`No se pudo generar la sesión ${prefijo}: ${linkError?.message ?? "sin token"}`,
		);
	}

	const client = crearAnonimo();
	const { data: verificada, error: loginError } = await client.auth.verifyOtp({
		token_hash: link.properties.hashed_token,
		type: "magiclink",
	});

	if (loginError || !verificada.session) {
		throw new Error(`No se pudo iniciar sesión ${prefijo}: ${loginError?.message ?? "sin sesión"}`);
	}

	return {
		id: data.user.id,
		email,
		password: PASSWORD,
		client,
	};
}

export async function borrarUsuario(usuario: UsuarioPrueba | null): Promise<void> {
	if (!usuario) {
		return;
	}

	const admin = crearAdmin();
	await admin.auth.admin.deleteUser(usuario.id);
}

export async function crearSuscripcionPro(
	userId: string,
	overrides: {
		status?: "active" | "trialing" | "past_due" | "canceled" | "paused";
		currentPeriodEnd?: string | null;
	} = {},
): Promise<void> {
	const admin = crearAdmin();
	const fin = new Date();
	fin.setFullYear(fin.getFullYear() + 1);

	const { error } = await admin.from("subscriptions").upsert(
		{
			user_id: userId,
			plan: "pro",
			status: overrides.status ?? "active",
			provider: "polar",
			provider_customer_id: `customer-${userId}`,
			provider_subscription_id: `test-${userId}`,
			current_period_end:
				overrides.currentPeriodEnd === undefined ? fin.toISOString() : overrides.currentPeriodEnd,
			cancel_at_period_end: false,
		},
		{ onConflict: "user_id" },
	);

	if (error) {
		throw new Error(`No se pudo crear la suscripción: ${error.message}`);
	}
}
