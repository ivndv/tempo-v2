# Módulos

Cada carpeta es un bounded context con cuatro capas:

- `domain/`: entidades, value objects, errores y **puertos**. TypeScript puro; no importa Next, React, Supabase, Dexie ni Polar.
- `application/`: casos de uso. Orquestan dominio y puertos; no conocen adaptadores concretos.
- `infrastructure/`: adaptadores que implementan los puertos (Postgres, Supabase, Dexie, Upstash, Polar, Resend).
- `ui/`: componentes React del módulo. Pueden llamar casos de uso, nunca a la base de datos.

## Regla de dependencias

```
ui / app  →  application  →  domain
                  ↑
            infrastructure
```

El composition root (`src/shared/infrastructure/container.ts`) es el único lugar que conecta adaptadores concretos.

## Módulos

| Módulo | Responsabilidad |
|---|---|
| `auth` | Identidad, sesión y perfil |
| `tareas` | CRUD y estados de tareas |
| `pomodoros` | Sesiones de foco |
| `breaks` | Descansos |
| `analytics` | Dashboards y récords |
| `billing` | Polar, suscripciones y entitlements |
| `sync` | Outbox y sincronización local → nube |
