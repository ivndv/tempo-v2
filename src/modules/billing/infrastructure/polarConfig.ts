import "server-only";
import { getServerEnv } from "@/shared/infrastructure/env";

export type EntornoPolar = "sandbox" | "production";

function requerido(nombre: string, valor: string | undefined): string {
	if (!valor) {
		throw new Error(`Falta ${nombre} para configurar Polar`);
	}

	return valor;
}

export function obtenerEntornoPolar(): EntornoPolar {
	return getServerEnv().POLAR_ENVIRONMENT;
}

export function obtenerAccessTokenPolar(): string {
	return requerido("POLAR_ACCESS_TOKEN", getServerEnv().POLAR_ACCESS_TOKEN);
}

export function obtenerProductoPolar(): string {
	return requerido("POLAR_PRODUCT_ID", getServerEnv().POLAR_PRODUCT_ID);
}

export function obtenerWebhookSecretPolar(): string {
	return requerido("POLAR_WEBHOOK_SECRET", getServerEnv().POLAR_WEBHOOK_SECRET);
}
