# Tempo v2

## Descripción

Aplicación web para gestionar tu tiempo de estudio o trabajo con la técnica Pomodoro, reescrita de cero sobre Next.js 16 y Supabase. Organiza el día en bloques de enfoque vinculados a tareas, mide el tiempo real invertido en cada una y sincroniza todo entre dispositivos, incluso habiendo trabajado sin conexión.

## Características

- **Bloques de enfoque por tarea**: cada sesión se vincula a una tarea concreta, con bloques de 30 minutos a 6 horas y ciclos automáticos de 25/5/30.
- **Pausa y reanudación**: si interrumpes una sesión, el tiempo restante queda guardado y el temporizador sigue vivo al cambiar de pantalla.
- **Modo offline real**: la app funciona sin cuenta y sin red; las tareas y sesiones se guardan en el dispositivo y se sincronizan cuando vuelve la conexión.
- **Sincronización multi-dispositivo**: tus datos viajan entre navegadores con resolución de conflictos, sin duplicados ni pérdidas.
- **Estadísticas por plan**: resumen diario y semanal para todos; rangos de 90 días, un año e históricos completos para los planes de pago.
- **Exportación**: descarga tus datos en JSON, y en CSV o ZIP si tu plan lo incluye.
- **Modo oscuro y claro**: tema guardado por usuario y por dispositivo, sin parpadeos al cargar.
- **Soporte multi-idioma**: interfaz completa en español e inglés.

## Secciones

1. **Inicio**: presentación pública de la app, con acceso directo al temporizador.
2. **Autenticación**: registro e inicio de sesión con correo o Google, verificación por correo y recuperación de contraseña.
3. **Temporizador**: selector de tareas, cuenta regresiva por bloques y descansos cortos y largos.
4. **Dashboard**: resumen diario, gráficos semanales y récords de tiempo enfocado.
5. **Ajustes**: perfil, zona horaria, idioma y preferencias de tema por dispositivo.
6. **Precios**: comparación de planes y gestión de la suscripción.

## Uso

- **Acceder a la Aplicación**: entra directamente desde cualquier navegador aquí: [Tempo v2](https://tempo2.mgdc.site/).
- **Modo invitado o cuenta**: usa el temporizador al instante sin registrarte, o crea tu cuenta para sincronizar tareas, sesiones y estadísticas en la nube.
- **Configurar y Concentrarte**: crea una tarea, elige la duración del bloque, presiona iniciar y deja que la app encadene los descansos.
- **Consultar tu Progreso**: revisa el resumen diario y los gráficos semanales para ver en qué se te va el tiempo.
- **Llevarte tus Datos**: exporta tus tareas y sesiones desde la propia app.
- **Alternar Idioma y Tema**: cambia entre español e inglés y entre modo claro y oscuro desde el menú superior.

## Tecnologías Utilizadas

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Lucide
- **Backend**: Next.js Server Actions y Route Handlers sobre Cloudflare Workers (OpenNext)
- **Base de Datos**: Supabase Postgres (self-hosted) con Row Level Security
- **Autenticación**: Supabase Auth (`@supabase/ssr`, JWT ES256), Cloudflare Turnstile
- **Persistencia Local**: Dexie 4 (IndexedDB) con outbox y cursores de sincronización
- **Estado**: React Context para el temporizador; `useLiveQuery` para los datos locales
- **Rate Limiting**: Upstash Redis con fallback en memoria
- **Cobros**: Polar (Merchant of Record)
- **Validación**: Zod 4
- **Internacionalización**: next-intl 4
- **Testing**: Vitest 5, Playwright
- **Herramientas**: Bun, Biome, TypeScript
- **Infra & CI/CD**: Cloudflare Workers, Supabase, Upstash, Polar, GitHub Actions

## Despliegue

La aplicación se encuentra desplegada en **Cloudflare Workers** mediante OpenNext. Puedes usarla directamente aquí: [Tempo v2](https://tempo2.mgdc.site/)

## Licencia

[PolyForm Noncommercial 1.0.0](LICENSE). Uso personal y no comercial; el uso comercial requiere permiso.

© 2026 Ivan Cruz
