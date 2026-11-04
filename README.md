# SIGA-TI

Sistema de Gestión de Solicitudes TI (prototipo, datos ficticios): autenticación y roles, registro, asignación y seguimiento de solicitudes e indicadores.

> Estado: **Etapas 1–4 completas** (diseño, backend, frontend y QA). Diseño y resultados en [`docs/`](./docs/README.md).

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
pnpm db:seed:demo               # opcional: 40 solicitudes ficticias para explorar el panel
pnpm --filter @siga/api dev     # API en http://localhost:3000
pnpm --filter @siga/web dev     # Web en http://localhost:5173 (proxy /api → API)
```

- Documentación interactiva: http://localhost:3000/api/docs (desactivada en producción)
- Colores, logo y nombre de la institución: ingrese como `admin@siga-ti.test` → **Apariencia**.
- Gestión de cuentas: como ADMIN, ingrese en **Usuarios** para crear, editar, desactivar o reactivar usuarios; desactivar conserva sus solicitudes e historial.
- Cuentas de acceso por defecto (las crea `pnpm db:seed`; contraseña común = `SEED_DEFAULT_PASSWORD`, en `.env.example`: `Demo-Siga-2026!`):

| Rol           | Correo                                                | Nombre                                                                        |
| ------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| Administrador | `admin@siga-ti.test`                                  | Carolina Fuentes                                                              |
| Supervisor    | `supervisor@siga-ti.test`                             | Rodrigo Valdés                                                                |
| Técnico       | `tecnico1@siga-ti.test` · `tecnico2@…` · `tecnico3@…` | Matías Orellana · Daniela Riquelme · Felipe Contreras                         |
| Solicitante   | `solicitante1@siga-ti.test` … `solicitante5@…`        | Javiera Muñoz, Sebastián Pizarro, Camila Araya, Tomás Herrera, Valentina Soto |

- **Botones de demostración**: con `VITE_SHOW_DEMO_ACCOUNTS=true` y `VITE_DEMO_PASSWORD` definidos, la pantalla de ingreso muestra las cuentas; al tocar una se rellenan el correo y la contraseña del formulario (hay que pulsar «Ingresar»). Deje `VITE_SHOW_DEMO_ACCOUNTS` en `false` fuera de desarrollo: la contraseña quedaría visible en el bundle.

## Scripts

| Comando                       | Acción                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm lint`                   | ESLint (`no-explicit-any` y reglas de capas como error)                                      |
| `pnpm typecheck`              | TypeScript estricto en todos los paquetes                                                    |
| `pnpm test`                   | Unitarias + integración (requiere `TEST_DATABASE_URL`, ver `.env.example`)                   |
| `pnpm db:seed:demo`           | Agrega 40 solicitudes ficticias de forma idempotente (solo desarrollo/pruebas)               |
| `pnpm --filter @siga/web e2e` | E2E de acceso, dashboard y navegación responsive en Chromium                                 |
| `pnpm openapi:generate`       | Regenera `docs/openapi.yaml` desde los esquemas Zod (una prueba verifica que no haya deriva) |
| `pnpm db:reset`               | Recrea la base de desarrollo (solo desarrollo)                                               |

Las pruebas de integración usan PostgreSQL real (`siga_ti_test`, creada por `docker/postgres/init-test-db.sql`); aplican las migraciones solas.
Para E2E, instale Chromium una vez con `pnpm --filter @siga/web exec playwright install chromium`; el setup prepara migraciones y datos demo desde `.env`.

## Estructura

```
apps/api         API Express (Clean Architecture: domain · application · infrastructure · interfaces/http)
apps/web         SPA React (components atómicos · hooks · services)
packages/shared  Esquemas Zod del contrato (API y, luego, web)
docs/            Diseño, modelo de datos, contrato OpenAPI y decisiones
```

Resúmenes: [`docs/etapa-2.md`](./docs/etapa-2.md) · [`docs/etapa-3.md`](./docs/etapa-3.md) · [`docs/etapa-4.md`](./docs/etapa-4.md).
