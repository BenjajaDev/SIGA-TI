# Etapa 2 — Backend y core: resumen

## Entregado

- Monorepo pnpm (`apps/api`, `packages/shared`), TypeScript 6.0.3 estricto, ESLint 10 + typescript-eslint (sin `any`, reglas de capas), Prettier, Husky + lint-staged.
- PostgreSQL: `docker-compose.yml`, esquema Prisma 7.10.1, migración inicial con SQL manual (CHECK de asignación, SLA positivo y trigger de historial de solo inserción) y semillas idempotentes (`db:seed`).
- Dominio: máquina de estados declarativa, políticas de visibilidad y comentarios, SLA, código `SIGA-nnnnnn`, métricas de resolución.
- 21 casos de uso y 22 endpoints bajo `/api/v1` con sobre de error estándar, `requestId`, helmet, CORS restringido, límite de peticiones y rotación de refresh tokens con detección de reutilización.
- Administración de usuarios solo para ADMIN: creación, edición, cambio de contraseña, desactivación lógica y reactivación; los cambios sensibles revocan refresh tokens en la misma transacción.
- Contrato OpenAPI 3.1 **generado desde Zod** (`docs/openapi.yaml`) + Swagger UI en `/api/docs`.
- 151 pruebas: dominio (matriz exhaustiva rol × transición), casos de uso con dobles, contrato, y API contra PostgreSQL real.

## Cambios respecto del diseño de la Etapa 1

| Tema | Decisión |
| --- | --- |
| `docs/openapi.yaml` | Pasa a ser un artefacto **generado**; se eliminó la versión escrita a mano. |
| Controladores | Los *handlers* viven en los archivos de rutas (finos); no hay carpeta `controllers/`. |
| Control por rol | Se aplica en los casos de uso mediante políticas de dominio (única fuente), no con middleware por ruta. Cada endpoint tiene pruebas de 401/403/404. |
| `engines` | `>=22.18` (el entorno de desarrollo usa Node 22); Node 26 LTS sigue recomendado. |
| `.env.test` | No se usa: las pruebas leen `TEST_DATABASE_URL` del `.env`. |
| Migración | Los nombres de columna son camelCase (convención por defecto de Prisma), no snake_case como en el borrador de `data-model.md`. |
| `seed:demo` | Se difiere a la Etapa 4, como estaba planificado. |
| RF-12 | Se incorporó administración de usuarios por petición posterior; administración de categorías sigue fuera del contrato. |

## Hallazgos durante la implementación

- **Bug corregido**: la validación de `CORS_ALLOWED_ORIGINS` lanzaba `TypeError` con un valor no-URL (`*`) porque el `refine` de Zod 4 se ejecuta aunque falle la URL base. Cubierto por prueba.
- Las pruebas de integración emiten una advertencia de deprecación de `pg` 8.23 ("client.query() when the client is already executing a query") originada en el adaptador `@prisma/adapter-pg`; no proviene de código propio y no afecta resultados.

## Limitaciones conocidas

- Docker no estaba disponible en el entorno de desarrollo de esta etapa: `docker-compose.yml` (PostgreSQL 18) **no se ejecutó**; las migraciones y pruebas se verificaron contra PostgreSQL 16 local.
- Revocación de tokens expirados (limpieza) y paginación por cursor fuera del prototipo.
- La advertencia anterior debe revisarse al actualizar Prisma/pg.
