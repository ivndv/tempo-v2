import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Configuración de OpenNext para desplegar Next.js en Cloudflare Workers.
// Sin caché incremental por ahora: el MVP no usa ISR ni `revalidateTag`.
export default defineCloudflareConfig({});
