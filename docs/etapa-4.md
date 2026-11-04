# Etapa 4 — Testing y QA

## Entregado

- Suite unitaria y de integración ejecutada contra PostgreSQL; las pruebas cubren reglas de negocio, permisos, contratos HTTP, autenticación, eventos, semillas y generación OpenAPI.
- Pruebas E2E con Playwright/Chromium para inicio y cierre de sesión, acceso al panel, gráficos, navegación responsive y creación/edición/desactivación/reactivación de usuarios.
- Pruebas de API para gestión de usuarios: roles, contraseñas hash, conflicto de correo, protección de la cuenta propia, revocación de refresh tokens y conservación de solicitudes e historial al desactivar.
- Semilla de demostración con 40 solicitudes ficticias distribuidas entre los seis estados. Usa identificadores estables, crea eventos y comentarios en la misma transacción de cada solicitud y puede ejecutarse varias veces sin duplicar registros.
- Preparación E2E que aplica migraciones y ejecuta la semilla demo. La configuración de integración invoca Prisma con el Node actual, sin depender de resolver un comando `pnpm` externo (compatibilidad con Windows).
- Comparación OpenAPI normalizada por finales de línea para que el contrato sea verificable también en Windows.
- Revisión enfocada en autenticación y rotación de sesiones, cookies, configuración de seguridad HTTP, autorización y visibilidad de solicitudes, errores y redacción de logs. No se identificaron vulnerabilidades evidentes en el alcance revisado; esto no reemplaza una prueba de penetración independiente.

## Verificación

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @siga/web e2e`

La suite requiere Node.js `>=22.18` y PostgreSQL local. La prueba E2E requiere Chromium (`pnpm --filter @siga/web exec playwright install chromium`).

## Limitaciones conocidas

- El build web sigue reportando un chunk inicial superior a 500 kB; el panel se carga bajo demanda.
- La revisión de seguridad fue estática y acotada al prototipo; no se ejecutó un pentest ni un escaneo externo de dependencias.
- Las solicitudes demo se agregan a la base de desarrollo y no se borran automáticamente; sus IDs estables evitan duplicarlas al volver a ejecutar la semilla.
