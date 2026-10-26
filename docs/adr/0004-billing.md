# ADR 0004 — Billing con Polar

- **Estado:** aceptado
- **Fecha:** 2026-10-23

## Contexto

Se quieren funciones de pago sin asumir la carga fiscal internacional. El usuario factura como persona física en México.

## Decisión

- **Polar** como Merchant of Record.
- Precios en **USD**.
- **Pro** desbloquea estadísticas mensuales avanzadas e **récords personales all-time**.
- El ranking global entre usuarios queda fuera de v1.
- **Entitlements** se validan en el servidor.
- El estado de la suscripción se sincroniza por webhooks idempotentes.

## Consecuencias

- Polar es el vendedor legal y gestiona VAT/sales tax; el titular sigue pagando ISR en México.
- Se necesita RFC y facturación (reverse invoice de Polar).
- La tabla `subscriptions` solo se escribe desde el servidor/webhook; el usuario solo lee la suya.
- El checkout es hospedado; no se manejan tarjetas.
- El plan anual reduce el impacto de las comisiones fijas.
