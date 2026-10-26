# AGENTS.md — Tempo v2

Guía operativa para agentes que trabajen en este repositorio.

## Contexto

Tempo v2 es una reescritura greenfield de Tempo. No hay usuarios ni datos que migrar. La app legacy vive en `../tempo` y **no se toca** hasta el cutover.

## Stack

- Next.js 16 (App Router), full-stack.
- Cloudflare Workers como hosting; empezar en Free y pasar a Paid solo si el CPU lo exige.
- Supabase Auth + Supabase Postgres + RLS.
- Upstash Redis para rate limiting y caché.
- Dexie + outbox para offline-first.
- Polar como Merchant of Record.
- Arquitectura hexagonal modular.

Decisiones en `docs/adr/`.

## Comandos

```bash
bun run dev
bun run build
bun run typecheck
bun run lint
bun run format
bun run test
bun run test:e2e
bun run db:start
bun run db:stop
bun run db:reset
bun run db:types
```

## Reglas de arquitectura

- `domain/` es TypeScript puro: no importa Next, React, Supabase, Dexie ni Polar.
- `application/` depende solo de puertos y dominio.
- `infrastructure/` implementa los puertos.
- `app/` y `ui/` solo componen y llaman casos de uso; nunca consultan la base de datos directamente.
- El composition root conecta adaptadores concretos.
- No crear una capa por cada tabla; solo puertos donde hay una frontera real.

## Auth y datos

- Supabase Auth para identidad; `profiles.id = auth.users.id`.
- RLS en tablas de usuario.
- Todo acceso a datos de usuario pasa por el cliente de Supabase; el service role se reserva para webhooks y administración.
- `SUPABASE_SERVICE_ROLE_KEY` solo en servidor; nunca en el cliente.
- No se usan Hashy, Better Auth ni KV.

## Offline-first

- Dexie para invitados y para usuarios autenticados (caché + outbox).
- UUIDs generados en cliente; upserts idempotentes.
- Los dashboards y entitlements pagos se validan en el servidor.
- Al hacer logout se limpia o particiona Dexie por usuario.
- `theme` e idioma pueden quedarse en `localStorage`.

## Billing

- Polar es el MoR; facturación en USD.
- Pro: estadísticas mensuales avanzadas + récords personales all-time.
- El ranking global queda fuera de v1.
- Webhooks idempotentes; `subscriptions` solo se escribe desde servidor.
- Nunca confiar en el plan que envía el cliente.

## Convenciones

- Código, comentarios y documentación en español.
- TypeScript estricto; prohibido `any`.
- Formateo y lint con Biome.
- No hacer commits ni push sin aprobación explícita.
- No tocar el dominio de producción ni la app legacy hasta el cutover.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
