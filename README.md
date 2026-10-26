# Tempo v2

Reescritura de Tempo como aplicación full-stack con Next.js 16, Supabase y arquitectura hexagonal.

## Estado

**Gate 1 en progreso.** Repo nuevo, Supabase local, Auth, RLS, CRUD de tareas y dashboard básico. La app legacy (`../tempo`) sigue intacta y desplegada; no se toca el dominio todavía.

## Stack

| Capa | Elección |
|---|---|
| Framework | Next.js 16 (App Router), full-stack |
| Hosting | Cloudflare Workers (empezar en Free; Paid si el CPU lo pide) |
| Base de datos | Supabase Postgres |
| Auth | Supabase Auth + `@supabase/ssr` + RLS |
| Rate limiting | Upstash Redis |
| Cobros | Polar (Merchant of Record) |
| Persistencia local | Dexie + outbox |
| Arquitectura | Hexagonal modular |

## Decisiones

- [ADR 0001 — Stack y hosting](docs/adr/0001-stack.md)
- [ADR 0002 — Auth y Postgres](docs/adr/0002-auth.md)
- [ADR 0003 — Offline-first con Dexie](docs/adr/0003-offline.md)
- [ADR 0004 — Billing con Polar](docs/adr/0004-billing.md)
- [ADR 0005 — Arquitectura hexagonal](docs/adr/0005-hexagonal.md)

## Desarrollo local

```bash
bun install
cp .env.example .env.local
bun run dev
```

La app queda en `http://localhost:3000`.

Supabase local usa puertos propios para no chocar con otros proyectos:

| Servicio | Puerto |
|---|---|
| API | `54421` |
| Postgres | `54422` |
| Studio | `54423` |
| SMTP / Mailpit | `54424` |

Los valores de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` se obtienen con `bun run db:start` o `bunx supabase status`.

### Scripts

```bash
bun run dev          # Next.js en desarrollo
bun run build        # build de producción
bun run typecheck    # TypeScript estricto
bun run lint         # Biome
bun run db:start     # levanta Supabase local
bun run db:stop      # detiene Supabase local
bun run db:reset     # aplica migraciones y seed local
bun run db:types     # genera tipos TypeScript desde Supabase
bun run test         # Vitest
bun run test:e2e     # Playwright
```

### Redis local

```bash
bun run redis:up     # Redis + serverless-redis-http
bun run redis:down
```

| Servicio | Puerto |
|---|---|
| Redis | `127.0.0.1:6379` |
| REST compatible con Upstash (SRH) | `127.0.0.1:8079` |

`@upstash/redis` funciona contra SRH usando:

```env
UPSTASH_REDIS_REST_URL=http://127.0.0.1:8079
UPSTASH_REDIS_REST_TOKEN=devtoken
```

**Limitación:** `@upstash/ratelimit` no funciona con SRH/Redis normal porque sus scripts Lua usan el flag `allow-key-locking`. Si hay `UPSTASH_REDIS_REST_URL/TOKEN`, el limiter usa Upstash (también en local) con el prefijo `tempo:<env>:rl`; la memoria queda solo como fallback si faltan credenciales.

### Auth

Rutas: `/login`, `/signup`, `/forgot-password`, `/reset-password` y `/auth/callback`.

- Turnstile en login, registro y recuperación.
- En local se usa la test key de Cloudflare y el secreto de prueba en `supabase/config.toml`.
- Google OAuth se habilita con `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` y las credenciales en el Supabase self-hosted.
- Confirmación de email y reset usan el SMTP de Resend configurado en Supabase.
- En producción activa `ENABLE_EMAIL_AUTOCONFIRM=false` y configura `SITE_URL` / redirects con el dominio real.

## i18n

- **next-intl** con inglés por defecto en la raíz y español bajo `/es`.
- Rutas localizadas definidas en `src/i18n/routing.ts`:
  - `/pricing` ↔ `/es/precios`
  - `/about` ↔ `/es/acerca`
  - `/privacy` ↔ `/es/privacidad`
  - `/terms` ↔ `/es/terminos`
  - `/login` ↔ `/es/iniciar-sesion`
  - `/signup` ↔ `/es/registro`
  - `/forgot-password` ↔ `/es/recuperar`
  - `/reset-password` ↔ `/es/restablecer`
- Mensajes en `messages/en.json` y `messages/es.json`.
- Selector de idioma en el menú de usuario (y footer); canonical y `hreflang` por página, más `sitemap.xml` y `robots.txt`.
- `localeDetection: false`: la URL manda (`/` inglés, `/es` español) para que el selector no rebote por la cookie `NEXT_LOCALE`.
- El proxy compone next-intl con el refresco de sesión de Supabase; las páginas públicas no consultan Supabase.
- Las páginas públicas se generan estáticas para ambos idiomas.

## Estructura

```
src/
  app/                        # Rutas, layouts y route handlers de Next.js
  modules/
    auth/                     # Identidad y sesión
    tareas/
    pomodoros/
    breaks/
    analytics/                # Dashboards y agregados
    billing/                  # Polar, suscripciones y entitlements
    sync/                     # Outbox y sincronización local → nube
  shared/
    domain/                   # Primitivas puras (Result, errores, Clock, IDs)
    infrastructure/           # Env, DB y composition root
    ui/                       # UI compartida
```

Cada módulo se divide en `domain`, `application`, `infrastructure` y `ui`. Ver [ADR 0005](docs/adr/0005-hexagonal.md).

## Estado y datos

- **Dexie es la fuente de verdad local.** Tareas, pomodoros y resumen se leen con `useLiveQuery` (`dexie-react-hooks`), así la UI se actualiza sola cuando cambia la base.
- **Transacciones atómicas.** Crear/editar/eliminar una tarea escribe `tareas` + `outbox` en una sola transacción. Al cerrar un focus/break se escriben registro, `outbox` y siguiente sesión juntos.
- **Outbox con reintentos.** Backoff exponencial con jitter, lease de 60 s y estado `dead` tras 8 intentos. La sincronización se serializa entre pestañas con `navigator.locks`.
- **Multi-dispositivo.** Pull incremental por `(updated_at, id)` con cursor propio para tareas, pomodoros y breaks; upsert de tareas vía RPC `upsert_tarea` con last-write-wins por `clientUpdatedAt`, `device_id` por navegador y borrado monotónico (una tarea eliminada no revive).
- **Tombstones.** El servidor purga tareas eliminadas con más de 90 días (`purgar_tombstones` + `pg_cron`); el cliente purga sus tombstones sincronizados con más de 30 días.
- **Persistencia de almacenamiento.** Se pide `navigator.storage.persist()` al abrir la app y se avisa si el navegador lo niega.
- **`TimerProvider` vive en `src/app/[locale]/app/layout.tsx`**, por lo que el bloque sigue corriendo y notificando aunque navegues a `/app/dashboard`.
- **Las páginas públicas son estáticas** (`/`, `/about`, `/pricing`, `/privacy`, `/terms`) para ambos idiomas. La sesión del header se detecta en el cliente con `SessionActions`; no hay `getUser()` por visita.
- **Selector de idioma** en header y footer (`LocaleSwitcher`), con `hreflang`, `sitemap.xml` y `robots.txt`.
- **Ajustes con tabs** en `/app/settings` (`/es/app/ajustes?tab=...`). Con sesión: Perfil, Preferencias, Dispositivos, Seguridad y Exportar. Invitado: Preferencias y Exportar (JSON local). Perfil edita el nombre; Seguridad cambia correo (con confirmación) y contraseña. El tema vive solo en el menú de usuario. El dispositivo se registra solo al iniciar sesión.
- **Dashboard por plan.** Invitado: 7 días locales. Free: 30 días locales del dispositivo actual, con tarjetas Pro bloqueadas. Pro: RPC server-side con 90 días, 1 año y all-time, todos los dispositivos y filtro por dispositivo. Si Pro está sin conexión, cae a una vista local limitada con aviso.
- **Export.** Todos pueden descargar su JSON completo (`/api/export/json`); el invitado puede bajar el JSON de su navegador desde Ajustes. Pro puede descargar un ZIP con `pomodoros.csv`, `breaks.csv` y `tareas.csv` (`/api/export/csv`), validado en servidor. La sección Exportar de Ajustes explica cada formato.
- **Precios.** Pro $5 USD/mes o $50 USD/año, sin trial.
- **Tema claro/oscuro/sistema** con `next-themes` y tokens semánticos en `globals.css`. El tema se guarda por **usuario + dispositivo** en `devices.theme`, con `localStorage` como fuente inmediata.
- **Preferencias sincronizadas:** zona horaria e idioma viven en `profiles`; el tema en `devices`. El cambio de idioma desde el menú actualiza `profiles.locale`.
- **Menú de usuario** en el header con correo, icono, idioma, tema, ajustes y cerrar sesión. El selector de idioma también vive en el footer y en el header de invitados.
- **No hay Zustand** por ahora: el estado global se limita al timer (Context) y el resto es estado local o datos de Dexie.
- **Pruebas de Dexie** con `fake-indexeddb` en `tests/unit/dexieRepos.spec.ts`.

## Despliegue en Cloudflare Workers

La app corre en un Worker con OpenNext (`@opennextjs/cloudflare`). No usa Pages: Tempo necesita SSR, middleware y route handlers.

```bash
bun run cf:build     # compila .open-next/worker.js + assets
bun run cf:preview   # emula el Worker en local (wrangler dev)
bun run deploy       # compila y despliega (requiere credenciales)
```

Configuración: `wrangler.jsonc` (Worker `tempo-v2`, `nodejs_compat`, assets) y `open-next.config.ts`.

### Variables de build

Los `NEXT_PUBLIC_*` se inyectan en el bundle al compilar, no en runtime. En GitHub van como **Variables** (`Settings > Secrets and variables > Actions > Variables`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`

Sin ellas el Worker se despliega con URLs vacías y el login falla.

### Secrets y deploy

- `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` como **Secrets**.
- El job de deploy solo corre en push a `main` y si la variable `DEPLOY_ENABLED` vale `true`.
- `APP_ENV` y `APP_NAMESPACE` viven en `wrangler.jsonc`; el resto de secretos de servidor (`SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_*`) se cargan con `wrangler secret put`.

## Siguiente paso: Gate 1

Walking skeleton en local:

- [x] Supabase local (`supabase start`) y schema inicial.
- [x] Supabase Auth + `proxy.ts` + cookies.
- [x] `profiles` con RLS.
- [x] CRUD de tareas.
- [x] Dashboard simple con RPC y agregados SQL.
- [x] Modo invitado con Dexie (tareas locales, sin outbox todavía).
- [x] Timer Pomodoro por bloques exactos (30 min–6 h), ciclos 25/5/30, auto-transiciones y notificaciones.
- [x] Focus parcial por fin de bloque (`completed_early`), breaks cortados (`skipped`), skip break y timezone.
- [x] Sin selector de tarea para iniciar; stats de hoy + gráfica local de 7 días, y dashboard cloud de 7 días.
- [x] Tareas por bloque, ocultas hasta iniciar, con `bloque_id` y asociación atómica por focus.
- [x] Resumen de tareas creadas/completadas/eliminadas al terminar el bloque.
- [x] Outbox local → Supabase con auto-sync, migración invitado → cuenta y limpieza al cerrar sesión.
- [x] Rate limiter con Upstash (`@upstash/ratelimit`), prefijo por entorno y fallback en memoria.
- [ ] Webhook de Polar en sandbox.
- [ ] Medir CPU antes de desplegar a Cloudflare.

## Notas

- No hay migración de usuarios ni de datos: Tempo v2 arranca sin usuarios.
- Al iniciar sesión se suben tareas, pomodoros y breaks locales; al cerrar sesión se sincroniza y se limpia Dexie.
- El dominio `tempo.mgdc.site` no se toca hasta el cutover.
- Los secretos viven en `.env.local` y nunca se commitean.
