# ADR 0001 — Stack y hosting

- **Estado:** aceptado
- **Fecha:** 2026-10-23

## Contexto

Tempo v1 usa Astro estático + Pages Functions/Hono + D1 + Better Auth. Se quiere una base full-stack para dashboards, offline-first y cobros. No hay usuarios todavía: se puede empezar de cero.

## Decisión

- **Next.js 16 App Router** como frontend y backend (route handlers + server actions).
- **Cloudflare Workers** para hosting, empezando en el plan Free.
- **Supabase Postgres** como base de datos.
- **Upstash Redis** para rate limiting y caché.
- **Dexie** para persistencia local.
- **Polar** como Merchant of Record.
- **Arquitectura hexagonal modular**.

## Consecuencias

- Un solo framework y un solo deploy.
- El plan Free de Workers tiene 10 ms de CPU por invocación; si el render de Next.js lo excede, se pasa a Paid ($5/mes).
- Cloudflare Workers usa el adaptador de Next.js (`vinext` u OpenNext); el Gate 1 valida que funcione.
- Si el Gate 1 falla, el fallback es Vercel sin cambiar el dominio de la aplicación.
- El dominio de v1 no se toca hasta el cutover.
