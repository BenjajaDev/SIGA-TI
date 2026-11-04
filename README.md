# SIGA-TI

Sistema de Gestión de Solicitudes TI (prototipo, datos ficticios): autenticación y roles, registro, asignación y seguimiento de solicitudes e indicadores.

> Estado: **Etapas 1–4 completas** (diseño, backend, frontend y QA). Diseño en [`docs/`](./docs/README.md).

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
pnpm db:seed:demo               # (opcional) 30 solicitudes de demostración con historial
pnpm --filter @siga/api dev     # API en http://localhost:3000
pnpm --filter @siga/web dev     # Web en http://localhost:5173 (proxy /api → API)
```

- Documentación interactiva: http://localhost:3000/api/docs (desactivada en producción)
- Colores, logo y nombre de la institución: ingrese como `admin@siga-ti.test` → **Apariencia**.
- Usuarios ficticios (`@siga-ti.test`): `admin`, `supervisor`, `tecnico1..3`, `solicitante1..5`; contraseña = `SEED_DEFAULT_PASSWORD` del `.env`.

## Scripts

| Comando                 | Acción                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm lint`             | ESLint (`no-explicit-any` y reglas de capas como error)                                               |
| `pnpm typecheck`        | TypeScript estricto en todos los paquetes                                                             |
| `pnpm test`             | Unitarias + integración (requiere `TEST_DATABASE_URL`, ver `.env.example`)                            |
| `pnpm test:e2e`         | 8 pruebas E2E con Playwright (levanta API y web propios sobre `TEST_DATABASE_URL`; reinicia esa base) |
| `pnpm openapi:generate` | Regenera `docs/openapi.yaml` desde los esquemas Zod (una prueba verifica que no haya deriva)          |
| `pnpm db:reset`         | Recrea la base de desarrollo (solo desarrollo)                                                        |

Las pruebas de integración usan PostgreSQL real (`siga_ti_test`, creada por `docker/postgres/init-test-db.sql`); aplican las migraciones solas.

## Estructura

```
apps/api         API Express (Clean Architecture: domain · application · infrastructure · interfaces/http)
apps/web         SPA React (components atómicos · hooks · services)
packages/shared  Esquemas Zod del contrato (API y, luego, web)
docs/            Diseño, modelo de datos, contrato OpenAPI y decisiones
```

Resúmenes: [`etapa-2`](./docs/etapa-2.md) · [`etapa-3`](./docs/etapa-3.md) · [revisión de seguridad](./docs/security-review.md).

> Las pruebas de integración y E2E **vacían** la base indicada en `TEST_DATABASE_URL`: no la apunte a datos que quiera conservar.
