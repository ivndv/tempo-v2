# Herramientas

Scripts de desarrollo. No forman parte de la app ni del bundle del Worker.

## `generar-jwt-keys.mjs`

Genera `JWT_KEYS` y `JWT_JWKS` para Supabase self-hosted (ES256 + legacy HS256).

```bash
node tools/generar-jwt-keys.mjs --env=/ruta/.env --out=/tmp/jwt-keys.txt
```

Pega las dos líneas en Dokploy y redeploy de `auth`, `rest`, `realtime`, `storage` y `functions`.

- `JWT_KEYS`: array con la privada EC y la legacy.
- `JWT_JWKS`: objeto con la pública EC y la legacy.
- GoTrue exige `key_ops: ["sign"]` en la privada; sin eso falla con `no signing key detected`.

## `perf/medir.mjs`

Mide 12 recargas del dashboard y 5 navegaciones suaves con Chrome real vía CDP.

```bash
google-chrome --remote-debugging-port=9222 \
  --user-data-dir=/tmp/tempo-cdp https://tempo2.mgdc.site/login

node tools/perf/medir.mjs
```

Inicia sesión a mano (Turnstile bloquea la automatización pura). El script espera la cookie y luego mide.

## `perf/resumen.ts`

Resume la salida de `wrangler tail` por request y por operación.

```bash
bunx wrangler tail tempo-v2 --format json > perf.ndjson
bun tools/perf/resumen.ts perf.ndjson
```

Requiere `PERF_LOGS=1` en `wrangler.jsonc` durante la medición.
