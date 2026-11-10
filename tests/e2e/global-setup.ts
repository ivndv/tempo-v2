import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/shared/infrastructure/db/database.types";
import { cargarEnvLocal } from "../env";
import { fechaEnZona, sumarDiasClave } from "../helpers/fechas";
import { E2E_DEVICE_LINUX, E2E_DEVICE_MAC, E2E_FREE, E2E_PRO } from "./const";

cargarEnvLocal();

function env(nombre: string): string {
	const valor = process.env[nombre];

	if (!valor) {
		throw new Error(`Falta ${nombre} para ejecutar los tests E2E`);
	}

	return valor;
}

const admin = createClient<Database>(
	env("NEXT_PUBLIC_SUPABASE_URL"),
	env("SUPABASE_SERVICE_ROLE_KEY"),
	{
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	},
);

async function asegurarUsuario(email: string, password: string): Promise<string> {
	const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

	if (error) {
		throw new Error(`No se pudieron listar usuarios: ${error.message}`);
	}

	const existente = data.users.find((usuario) => usuario.email === email);

	if (existente) {
		const { error: updateError } = await admin.auth.admin.updateUserById(existente.id, {
			password,
			email_confirm: true,
		});

		if (updateError) {
			throw new Error(`No se pudo actualizar ${email}: ${updateError.message}`);
		}

		return existente.id;
	}

	const { data: creado, error: createError } = await admin.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
	});

	if (createError || !creado.user) {
		throw new Error(`No se pudo crear ${email}: ${createError?.message ?? "sin usuario"}`);
	}

	return creado.user.id;
}

async function limpiarDatos(userId: string): Promise<void> {
	await admin.from("pomodoros").delete().eq("user_id", userId);
	await admin.from("breaks").delete().eq("user_id", userId);
	await admin.from("tareas").delete().eq("user_id", userId);
	await admin.from("devices").delete().eq("user_id", userId);
	await admin.from("subscriptions").delete().eq("user_id", userId);
}

async function sembrarPro(userId: string): Promise<void> {
	const hoy = fechaEnZona();
	const ayer = sumarDiasClave(hoy, -1);
	const antiguo = sumarDiasClave(hoy, -729);

	const { data: tarea, error: tareaError } = await admin
		.from("tareas")
		.insert({
			user_id: userId,
			nombre: "E2E Deep work",
			estado: "done",
			completed_at: new Date().toISOString(),
		})
		.select("id")
		.single();

	if (tareaError || !tarea) {
		throw new Error(`No se pudo crear la tarea E2E: ${tareaError?.message ?? "sin tarea"}`);
	}

	const { error: devicesError } = await admin.from("devices").insert([
		{
			user_id: userId,
			id: E2E_DEVICE_MAC,
			name: "E2E Mac",
			platform: "macOS",
			theme: "dark",
		},
		{
			user_id: userId,
			id: E2E_DEVICE_LINUX,
			name: "E2E Linux",
			platform: "Linux",
			theme: "light",
		},
	]);

	if (devicesError) {
		throw new Error(`No se pudieron crear los dispositivos E2E: ${devicesError.message}`);
	}

	const { error: pomodorosError } = await admin.from("pomodoros").insert([
		{
			user_id: userId,
			tarea_id: tarea.id,
			status: "completed",
			minutes_planned: 50,
			minutes_actual: 50,
			local_date: hoy,
			device_id: E2E_DEVICE_MAC,
			started_at: `${hoy}T15:00:00.000Z`,
			ended_at: `${hoy}T15:50:00.000Z`,
			cycle_position: 1,
		},
		{
			user_id: userId,
			tarea_id: tarea.id,
			status: "completed",
			minutes_planned: 25,
			minutes_actual: 25,
			local_date: hoy,
			device_id: E2E_DEVICE_LINUX,
			started_at: `${hoy}T16:00:00.000Z`,
			ended_at: `${hoy}T16:25:00.000Z`,
			cycle_position: 2,
		},
		{
			user_id: userId,
			tarea_id: tarea.id,
			status: "completed",
			minutes_planned: 30,
			minutes_actual: 30,
			local_date: ayer,
			device_id: E2E_DEVICE_MAC,
			started_at: `${ayer}T15:00:00.000Z`,
			ended_at: `${ayer}T15:30:00.000Z`,
			cycle_position: 1,
		},
		{
			user_id: userId,
			tarea_id: tarea.id,
			status: "completed",
			minutes_planned: 25,
			minutes_actual: 25,
			local_date: antiguo,
			device_id: E2E_DEVICE_MAC,
			started_at: `${antiguo}T15:00:00.000Z`,
			ended_at: `${antiguo}T15:25:00.000Z`,
			cycle_position: 1,
		},
	]);

	if (pomodorosError) {
		throw new Error(`No se pudieron crear los pomodoros E2E: ${pomodorosError.message}`);
	}
}

async function asegurarSuscripcionPro(userId: string): Promise<void> {
	const fin = new Date();
	fin.setFullYear(fin.getFullYear() + 2);

	const { error } = await admin.from("subscriptions").upsert(
		{
			user_id: userId,
			plan: "pro",
			status: "active",
			provider: "polar",
			provider_customer_id: `e2e-customer-${userId}`,
			provider_subscription_id: `e2e-${userId}`,
			current_period_end: fin.toISOString(),
			cancel_at_period_end: false,
		},
		{ onConflict: "user_id" },
	);

	if (error) {
		throw new Error(`No se pudo crear la suscripción E2E: ${error.message}`);
	}
}

export default async function globalSetup(): Promise<void> {
	const freeId = await asegurarUsuario(E2E_FREE.email, E2E_FREE.password);
	const proId = await asegurarUsuario(E2E_PRO.email, E2E_PRO.password);

	await limpiarDatos(freeId);
	await limpiarDatos(proId);
	await asegurarSuscripcionPro(proId);
	await sembrarPro(proId);
}
