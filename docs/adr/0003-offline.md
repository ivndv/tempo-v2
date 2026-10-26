# ADR 0003 — Offline-first con Dexie

- **Estado:** aceptado
- **Fecha:** 2026-10-23

## Contexto

Tempo nació con modo invitado en `localStorage` y sincronización al iniciar sesión. Se quiere una base local más robusta y mantener el modo offline para usuarios autenticados.

## Decisión

- **Dexie (IndexedDB)** como base local en el navegador.
- **Invitado:** Dexie es la única base; los dashboards se calculan localmente.
- **Autenticado:** Dexie es caché + **outbox**; Postgres es la fuente de verdad.
- **UUIDs** generados en cliente para evitar el mapa de IDs y permitir upserts idempotentes.
- **Outbox** con operaciones `pending/synced/failed` y reintentos.
- `theme` e idioma pueden quedarse en `localStorage`.

## Consecuencias

- El estado de Zustand sigue siendo síncrono; la persistencia es asíncrona.
- Los dashboards pagos y los entitlements se calculan/validan en el servidor.
- Al hacer logout se limpia o particiona Dexie por usuario.
- Dexie no sincroniza sola: el `SyncService` es responsabilidad nuestra.
- Los tests de IndexedDB usan `fake-indexeddb`.
