# AGENTS.md — Tempo v2

## 1. Visión general

**Tempo v2** es una aplicación de productividad basada en la técnica Pomodoro: bloques de enfoque vinculados a tareas, descansos, estadísticas y sincronización multi-dispositivo.

- **Propósito:** temporizador por bloques con soporte offline real (Dexie + outbox) y sincronización a la nube, con planes Free y Pro validados en servidor.
- **Dominio en producción:** [https://tempo.liuma.app](https://tempo.liuma.app)
- **App legacy:** `../tempo` → `tempo.mgdc.site` (no se toca hasta el cutover).
- **Documentación de arquitectura:** [`docs/diseno-y-arquitectura.md`](docs/diseno-y-arquitectura.md)
- **Decisiones:** `docs/adr/0001` … `0005`.

## 2. Antes de tocar código

- **Arquitectura:** lee `docs/diseno-y-arquitectura.md` y el ADR correspondiente al módulo que vas a tocar.
- **Módulos:** `src/modules/README.md` define la regla de dependencias entre capas.
- **Next.js 16:** tiene breaking changes. Antes de escribir código, lee la guía en `node_modules/next/dist/docs/` (ver bloque al final).

**CodeGraph** (índice de símbolos del repo): usa `codegraph_explore` (`query`, `maxFiles`, `projectPath`) antes de un grep masivo o de leer varios archivos; devuelve fuente verbatim, rutas de llamada e impacto.

- `codegraph sync /home/ivan/software-dev/tempo-v2` tras editar, pull o cambiar de rama (incremental, uso normal).
- `codegraph index /home/ivan/software-dev/tempo-v2` solo al crear el índice, tras `codegraph upgrade` o si `status` avisa `built by vX` (rebuild completo).
- `codegraph status /home/ivan/software-dev/tempo-v2` para comprobar el estado.

## 3. Stack tecnológico

| Capa | Tecnología | Detalle |
| :--- | :--- | :--- |
| **Runtime** | **Bun** | scripts de `package.json` |
| **Framework** | **Next.js 16** | App Router, RSC, Server Actions |
| **Hosting** | **Cloudflare Workers** | OpenNext (`@opennextjs/cloudflare`), no Pages |
| **DB** | **Supabase Postgres** | self-hosted, migraciones en `supabase/migrations/` |
| **Auth** | **Supabase Auth** | `@supabase/ssr`, JWT **ES256**, `getClaims()` |
| **RLS** | **Postgres RLS** | toda tabla de usuario |
| **Local** | **Dexie 4** | IndexedDB + outbox + cursores |
| **Rate limit** | **Upstash Redis** | `@upstash/ratelimit` + fallback en memoria |
| **Billing** | **Polar** | MoR |
| **i18n** | **next-intl 4** | `en` en raíz, `es` bajo `/es` |
| **Tema** | **next-themes** | por usuario + dispositivo (`devices.theme`) |
| **Validación** | **Zod 4** | entradas y contratos |
| **Lint/Format** | **Biome 2** | tabs, comillas dobles |
| **Tests** | **Vitest 5** + **Playwright** | 6 specs unitarios + E2E |

## 4. Estructura del código

```text
tempo-v2/
├── src/
│   ├── app/                        → Rutas, layouts y route handlers
│   │   ├── [locale]/(publico)/     → home, about, pricing, privacy, terms (estáticas)
│   │   ├── [locale]/(auth)/        → login, signup, forgot-password, reset-password
│   │   ├── [locale]/app/           → app, dashboard, settings (protegidas)
│   │   ├── api/export/{json,csv}/  → exportaciones
│   │   ├── api/health/             → healthcheck
│   │   └── auth/{callback,confirm}/→ canje de código y confirmación
│   ├── modules/                    → bounded contexts hexagonales
│   │   ├── auth/                   → identidad, sesión, logout
│   │   ├── tareas/                 → CRUD y estados
│   │   ├── pomodoros/              → sesiones de foco
│   │   ├── breaks/                 → descansos
│   │   ├── analytics/              → dashboards y récords
│   │   ├── billing/                → Polar, plan, entitlements
│   │   ├── devices/                → registro y preferencias por dispositivo
│   │   ├── profile/                → perfil del usuario
│   │   ├── security/               → rate limiting
│   │   └── sync/                   → outbox, cursores, pull/push
│   ├── shared/
│   │   ├── domain/                 → Result, errores, Clock, IDs
│   │   ├── infrastructure/         → env, Supabase, Dexie, storage, container
│   │   └── ui/                     → componentes compartidos
│   └── i18n/                       → routing y configuración de next-intl
├── messages/                       → en.json · es.json
├── tests/unit/                     → Vitest (6 specs)
├── tools/                          → scripts de medición (no van al bundle)
├── supabase/migrations/            → SQL versionado
├── docs/adr/                       → decisiones de arquitectura
├── wrangler.jsonc · open-next.config.ts
```

Cada módulo se divide en:

```text
domain/          TypeScript puro: entidades, VOs, errores y puertos
application/     casos de uso; solo dominio y puertos
infrastructure/  adaptadores (Supabase, Dexie, Upstash, Polar)
ui/              componentes React del módulo
```

## 5. Arquitectura y flujo de datos

### 5.1 Capas y dependencias

```text
ui / app  →  application  →  domain
                  ↑
            infrastructure
```

- `domain/` no importa Next, React, Supabase, Dexie ni Polar.
- `application/` depende solo de puertos y dominio.
- `infrastructure/` implementa los puertos.
- `app/` y `ui/` componen y llaman casos de uso; **nunca** consultan la base de datos directamente.
- No crear una capa por cada tabla: solo puertos donde hay una frontera real.
- El composition root (`src/shared/infrastructure/container.ts`) es el único lugar que conecta adaptadores concretos.

### 5.2 Flujo de datos

- Dexie es la fuente de verdad local para invitados y para usuarios (caché + outbox).
- UUIDs generados en cliente; upserts idempotentes.
- Sincronización por outbox y cursores (pull/push) contra Supabase Postgres.
- Al hacer logout se sincroniza y se limpia o particiona Dexie por usuario.
- `theme` e idioma pueden quedarse en `localStorage` como valor inmediato.

### 5.3 Autenticación

- Supabase Auth con `@supabase/ssr`; JWT **ES256**.
- `getClaims()` para verificar el JWT en local; `getUser()` solo si el email debe ser fiable.
- `profiles.id = auth.users.id`.

## 6. Variables de entorno

- `SUPABASE_SERVICE_ROLE_KEY`: **solo en servidor** (webhooks y administración), nunca en cliente.
- `PERF_LOGS`: `0` en producción; activarlo solo durante una medición.

## 7. Comandos

Todos los comandos se ejecutan con **Bun**:

```bash
bun run dev          # Next.js en localhost:3000
bun run build        # build de producción
bun run typecheck    # TypeScript estricto
bun run lint         # Biome (read-only)
bun run format       # Biome (escribe)

bun run test         # Vitest
bun run test:e2e     # Playwright

bun run db:start     # Supabase local
bun run db:stop      # detiene Supabase local
bun run db:reset     # migraciones + seed
bun run db:types     # tipos desde Supabase

bun run redis:up     # Redis + serverless-redis-http
bun run redis:down   # detiene Redis

bun run cf:build     # compila el Worker (OpenNext)
bun run cf:preview   # emula el Worker
bun run deploy       # compila y despliega
```

## 8. Convenciones y reglas críticas

### 8.1 Ejecución de checks

- **PROHIBIDO ejecutar tests o linter de forma reactiva tras cada pequeño cambio.** Acumula los cambios y corre `bun run lint`, `bun run typecheck` y `bun run test` **una sola vez al final**.

### 8.2 Estilo de código y comentarios

- **Lenguaje:** código, comentarios y documentación en **español**.
- **Comentarios:** `//` de **una sola línea**, en español, **sin punto final**. Nada de bloques `/** */` salvo pragmas. Si el nombre ya lo explica, no se comenta.
- **Tipado estricto:** prohibido `any`; interfaces explícitas.
- **Server Components por defecto:** `"use client"` solo en hojas interactivas.

### 8.3 Billing

- Polar es el MoR; facturación en USD. Webhook pendiente.
- Pro: estadísticas mensuales avanzadas + récords all-time.
- Webhooks idempotentes; `subscriptions` solo se escribe desde servidor.

### 8.4 Seguridad, datos y rate limit

- RLS en todas las tablas de usuario.
- El plan del usuario **siempre** se valida en servidor; nunca se confía en lo que envía el cliente.
- Los dashboards y entitlements pagos se validan en servidor.
- Rate limiting con Upstash Redis (`@upstash/ratelimit`) y fallback en memoria, en el módulo `security`.

### 8.5 Rendimiento

- Medir antes de optimizar, con `wrangler tail` y `wallTime` (no la suma de queries).
- No añadir caché de plan sin invalidación (webhook + Redis).

## 9. Flujo de Git y despliegue

- **PROHIBIDO realizar commits o push sin la aprobación explícita del usuario.**
- **Flujo de ramas:** desarrollo en `develop`; merge a `main` por fast-forward solo con aprobación explícita y tras validar.
- **Mensajes de commit:** *Conventional Commits* en minúsculas y español, **una sola línea** sin cuerpo.
- No tocar el dominio de producción ni la app legacy hasta el cutover.

## 10. CI/CD

- **GitHub Actions:** ejecuta Biome, tipos y tests.
- Build y deploy automáticos solo desde `main`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
