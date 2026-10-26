import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
	UPSTASH_REDIS_REST_URL: z.string().min(1).optional(),
	UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
	POLAR_ACCESS_TOKEN: z.string().min(1).optional(),
	POLAR_WEBHOOK_SECRET: z.string().min(1).optional(),
	POLAR_PRODUCT_ID: z.string().min(1).optional(),
	POLAR_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// Valida el entorno en el borde del servidor; no se ejecuta al importar.
export function getServerEnv(): ServerEnv {
	return serverEnvSchema.parse(process.env);
}
