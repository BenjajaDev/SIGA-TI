# SIGA-TI

Sistema de Gestión de Solicitudes TI (prototipo, datos ficticios): autenticación y roles, registro, asignación y seguimiento de solicitudes e indicadores.

> Estado: **Etapa 2 (backend y core) completa**. Frontend (Etapa 3) y QA final (Etapa 4) pendientes. Diseño en [`docs/`](./docs/README.md).

## Requisitos

- Node.js >= 22.18 (recomendado: 26 LTS) y pnpm 10
- PostgreSQL 16+ (con Docker: `pnpm db:up`, imagen `postgres:18-alpine`)

## Puesta en marcha

```bash
cp .env.example .env            # ajuste valores si es necesario
pnpm install
pnpm db:up                      # PostgreSQL local con Docker (o use uno propio)
pnpm --filter @siga/api db:generate
pnpm db:migrate
pnpm db:seed                    # catálogos, SLA y usuarios ficticios
pnpm --filter @siga/api dev     # http://localhost:3000
```

- Documentación interactiva: http://localhost:3000/api/docs (desactivada en producción)
- Usuarios ficticios (`@siga-ti.test`): `admin`, `supervisor`, `tecnico1..3`, `solicitante1..5`; contraseña = `SEED_DEFAULT_PASSWORD` del `.env`.

## Scripts

| Comando                 | Acción                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm lint`             | ESLint (`no-explicit-any` y reglas de capas como error)                                      |
| `pnpm typecheck`        | TypeScript estricto en todos los paquetes                                                    |
| `pnpm test`             | Unitarias + integración (requiere `TEST_DATABASE_URL`, ver `.env.example`)                   |
| `pnpm openapi:generate` | Regenera `docs/openapi.yaml` desde los esquemas Zod (una prueba verifica que no haya deriva) |
| `pnpm db:reset`         | Recrea la base de desarrollo (solo desarrollo)                                               |

Las pruebas de integración usan PostgreSQL real (`siga_ti_test`, creada por `docker/postgres/init-test-db.sql`); aplican las migraciones solas.

## Estructura

```
apps/api         API Express (Clean Architecture: domain · application · infrastructure · interfaces/http)
packages/shared  Esquemas Zod del contrato (API y, luego, web)
docs/            Diseño, modelo de datos, contrato OpenAPI y decisiones
```

Resumen de la etapa en [`docs/etapa-2.md`](./docs/etapa-2.md).
