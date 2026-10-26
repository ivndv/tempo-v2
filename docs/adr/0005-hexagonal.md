# ADR 0005 — Arquitectura hexagonal

- **Estado:** aceptado
- **Fecha:** 2026-10-23

## Contexto

La app tiene dos fuentes de datos (Dexie y Postgres), auth externa, rate limiting, email y cobros. Sin límites claros, Next.js invita a mezclar UI, SQL y reglas de negocio.

## Decisión

- **Monolito modular** con bounded contexts: `auth`, `tareas`, `pomodoros`, `breaks`, `analytics`, `billing`, `sync`.
- Cada módulo: `domain`, `application`, `infrastructure`, `ui`.
- El dominio es TypeScript puro y define **puertos**.
- La aplicación depende de puertos; la infraestructura los implementa.
- `app/` y `ui/` solo componen y llaman casos de uso.
- El composition root conecta adaptadores concretos.

## Consecuencias

- Dexie y Postgres son dos adaptadores del mismo `TareaRepository`.
- Polar se puede cambiar por otro MoR implementando `BillingGateway`.
- Supabase Auth se puede sustituir implementando `AuthGateway`.
- Se prohíben imports de `@supabase/*`, `dexie` o `@polar-sh/*` dentro de `domain/` y `application/`.
- Se aplica con revisión de código y, más adelante, con `noRestrictedImports` de Biome.
- No se crea una capa por cada tabla: solo puertos donde hay una frontera real.
