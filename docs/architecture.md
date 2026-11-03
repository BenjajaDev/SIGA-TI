# SIGA-TI — Arquitectura y diseño (Etapa 1)

Prototipo de Sistema de Gestión de Solicitudes TI. Todos los datos son ficticios. Este documento no contiene código de negocio.

## 1. Versiones verificadas (registro npm, 2026-11-03)

| Pieza | Versión propuesta | Nota |
|---|---|---|
| Node.js | **26.x LTS** ("Lithium", LTS desde 2026-10-28); `engines: >=24.11` | Node 24 (Krypton) también cumple todos los `engines` |
| pnpm | 12.x (`packageManager` fijado en Etapa 2) | el entorno actual trae 10.28 |
| TypeScript | **6.0.3** | **No usar 7.0.x**: `typescript-eslint` 8.72 declara `typescript <6.1.0` |
| Express | 5.3.0 | Express 5 propaga errores de handlers async sin envoltorios |
| Zod | 4.6.7 | `z.stringbool()`, `z.iso.datetime()`, `z.uuid()`, `z.email()` |
| Prisma | **7.10.1** (`prisma` y `@prisma/client`) | El tag `latest` de la CLI apunta a `8.0.0-rc.30` (pre-release): se evita |
| Driver Prisma | `@prisma/adapter-pg` 7.10.1 + `pg` | Prisma 7 usa *driver adapters* |
| OpenAPI | `@asteasolutions/zod-to-openapi` 9.1.0 (peer `zod ^4`) | Registro de esquemas con `.meta({ id })` |
| Swagger UI | `swagger-ui-express` 5.0.1 | |
| Auth | `argon2` 0.45.2, `jose` 6.2.15 | `jose` en lugar de `jsonwebtoken` (ESM, tipado, sin dependencias) |
| Seguridad HTTP | `helmet` 8.3.0, `cors` 2.8.6, `express-rate-limit` 8.7.3 | |
| Logging | `pino` 10.4.0, `pino-http` 11.0.0 | |
| Front | React 19.3.1, Vite 8.3.5, `@vitejs/plugin-react` 6.2.1, React Router 8.5.1, TanStack Query 5.105.3, React Hook Form 7.91.0, `@hookform/resolvers` 7.0.2, Tailwind 4.3.4 (`@tailwindcss/vite`), Recharts 3.10.1 | |
| Pruebas | Vitest 5.1.0, Supertest 7.3.1, Testing Library (react 16.3.3), Playwright 1.64.1 | |
| Calidad | ESLint 10.14.0, `typescript-eslint` 8.72.1, Prettier 3.9.10, Husky 9.1.7, lint-staged 17.6.0 | |
| BD | PostgreSQL 18 (imagen `postgres:18-alpine`) | verificar tag en Etapa 2 |

**Pendiente de verificación** (la documentación de prisma.io no es accesible desde esta sesión; el host no está en la lista de dominios permitidos): sintaxis exacta de Prisma 7 (`generator prisma-client` con `output` obligatorio, `url` de datasource en `prisma.config.ts`). El `schema.prisma` propuesto sigue esa convención y se validará con `prisma validate` al instalar en la Etapa 2.

## 2. Principios

1. **Regla de dependencia**: las dependencias apuntan hacia adentro. `domain` no importa nada del exterior (ni Express, ni Prisma, ni pino).
2. **Puertos y adaptadores**: el dominio declara interfaces (puertos); la infraestructura las implementa.
3. **Contrato único**: los esquemas Zod de `packages/shared` son la fuente de verdad para validación en API, formularios en web, tipos y OpenAPI.
4. **Seguridad por defecto**: autorización centralizada en políticas de dominio, no repartida en controladores.
5. **Determinismo**: el tiempo, los identificadores y el hashing entran por puertos (`Clock`, `PasswordHasher`, `TokenService`) para poder probar sin efectos.

## 3. Capas de `apps/api`

```
interfaces/http  ──►  application  ──►  domain  ◄──  infrastructure
      │                    │              ▲               │
      └────────────────────┴──────────────┴───────────────┘
                      config (entorno validado)  ← composition root (main.ts)
```

| Capa | Contenido | Puede importar |
|---|---|---|
| `domain` | Entidades (`Ticket`, `User`, …), objetos de valor (`TicketCode`), máquina de estados, políticas de autorización y visibilidad, cálculo de SLA, errores de dominio, **puertos** (repositorios, `IdentityProvider`, `PasswordHasher`, `TokenService`, `Clock`) | solo `packages/shared` (enums y constantes) y TypeScript estándar |
| `application` | Casos de uso (una clase por caso, método `execute`), DTO de entrada/salida, orquestación (la transacción vive en el repositorio, ver ADR-004) | `domain`, `shared` |
| `infrastructure` | Repositorios Prisma, `SimulatedIdentityProvider`, `Argon2PasswordHasher`, `JoseTokenService`, `SystemClock`, logger pino | `domain`, `application` (tipos), librerías |
| `interfaces/http` | Rutas, controladores finos, middlewares (autenticación, autorización por rol, validación Zod, manejo de errores, requestId, rate limit), serialización, OpenAPI/Swagger | `application`, `domain` (errores), `shared` |
| `config` | Esquema Zod del entorno y objeto `Env` inmutable | `zod` |
| `main.ts` (*composition root*) | Único lugar que instancia infraestructura e inyecta dependencias a casos de uso y controladores | todas |

La regla se **hace cumplir con ESLint** (`no-restricted-imports` por carpeta, ver `tooling-config.md`), no solo por convención.

### Flujo de una petición (ejemplo: transición de estado)

1. `requestId` + logger → `helmet`/CORS → `authenticate` (verifica JWT, recarga usuario activo) → `requireRole` (control grueso) → `validate(schema)` (Zod de `shared`).
2. Controlador mapea la petición a `TransitionTicketInput` y llama a `TransitionTicketUseCase.execute`.
3. El caso de uso carga el ticket, aplica `TicketAccessPolicy` (visibilidad → si no ve, `NotFoundError`), `TicketStateMachine.assertTransition(actor, ticket, to)` (409 si inválida, 403 si el rol no puede), y guarda con `saveWithEvent(ticket, event)`: *compare-and-set* sobre el estado y **creación del `TicketEvent` en la misma transacción**.
4. El controlador serializa la salida; cualquier excepción llega al `errorHandler`, que la traduce al sobre estándar `{ error: { code, message, details, requestId } }`.

## 4. Estructura final de carpetas

```
siga-ti/
├─ package.json                  # scripts raíz, packageManager, engines
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ eslint.config.mjs
├─ prettier.config.mjs
├─ .husky/  (pre-commit, pre-push)
├─ .env.example
├─ docker-compose.yml            # PostgreSQL local (+ BD de pruebas)
├─ docker/postgres/init-test-db.sql
├─ docs/                         # esta documentación
├─ packages/
│  └─ shared/
│     ├─ package.json            # paquete interno: exporta fuente TS
│     └─ src/
│        ├─ enums.ts   common.ts   errors.ts
│        ├─ auth.ts    users.ts    categories.ts
│        ├─ tickets.ts events.ts   comments.ts
│        ├─ dashboard.ts
│        └─ index.ts
├─ apps/
│  ├─ api/
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma
│  │  │  ├─ migrations/          # incl. SQL manual: CHECK y trigger de inmutabilidad
│  │  │  └─ seed/ (base.ts, demo.ts)
│  │  ├─ prisma.config.ts
│  │  ├─ src/
│  │  │  ├─ config/        env.ts
│  │  │  ├─ domain/
│  │  │  │  ├─ entities/ value-objects/ policies/ services/ errors/
│  │  │  │  └─ ports/      (repositories, identity, hasher, tokens, clock)
│  │  │  ├─ application/
│  │  │  │  └─ use-cases/  auth/ tickets/ dashboard/ catalog/ users/
│  │  │  ├─ infrastructure/
│  │  │  │  ├─ persistence/ (prisma-client, repositories, mappers)
│  │  │  │  ├─ identity/    simulated-identity-provider.ts
│  │  │  │  ├─ security/    argon2-password-hasher.ts, jose-token-service.ts
│  │  │  │  ├─ logging/     logger.ts
│  │  │  │  └─ time/        system-clock.ts
│  │  │  ├─ interfaces/http/
│  │  │  │  ├─ routes/ controllers/ middlewares/ openapi/ app.ts
│  │  │  ├─ main.ts         # composition root
│  │  │  └─ server.ts
│  │  └─ test/ (unit/ integration/ helpers/)   # espejo de src; integración con PostgreSQL real
│  └─ web/
│     ├─ index.html  vite.config.ts
│     └─ src/
│        ├─ components/ atoms/ molecules/ organisms/ templates/
│        ├─ pages/                # composición de pantallas (sin lógica de red)
│        ├─ hooks/                # TanStack Query: useTickets, useTransitionTicket…
│        ├─ services/             # clientes HTTP puros, sin React
│        ├─ auth/                 # contexto de sesión, guardas de ruta
│        ├─ lib/                  # formateadores, cliente fetch, claves de query
│        ├─ routes.tsx  main.tsx
│        └─ test/ + e2e/ (Playwright)
```

## 5. Frontend (estructura de responsabilidades)

- **UI** (`components`, `pages`): solo renderiza y dispara callbacks; sin `fetch` ni lógica de negocio.
- **Hooks** (`hooks`): único lugar con TanStack Query; encapsulan claves de caché, invalidaciones e interpretación de errores.
- **Servicios** (`services`): funciones puras `async` sobre un cliente `fetch` tipado con los esquemas de `shared`; sin dependencia de React (probables con Vitest sin DOM).
- **Sesión**: access token **solo en memoria**; al cargar la SPA se intenta `POST /auth/refresh` (cookie httpOnly) para rehidratar. Renovación *single-flight* ante 401: una sola petición de refresh compartida por las llamadas concurrentes.
- **Formularios**: React Hook Form + `zodResolver` con los mismos esquemas de `shared` que usa la API.

## 6. Autenticación y sesión (resumen de diseño)

- **Ingreso**: `POST /auth/login` → `IdentityProvider.authenticate()` (puerto). El adaptador simulado valida correo + contraseña (argon2id) contra el directorio ficticio. El **rol y el estado activo son locales** a SIGA-TI; un adaptador OIDC futuro solo devolvería identidad (`email`, `fullName`, `externalId`).
- **Access token**: JWT HS256, 15 min, claims `sub`, `role`, `jti`. Se envía en `Authorization: Bearer`.
- **Refresh token**: 32 bytes aleatorios (base64url), cookie `siga_rt` `httpOnly; SameSite=Strict; Secure (prod); Path=/api/v1/auth`, 7 días. En BD solo se guarda su **SHA-256** (alta entropía: argon2 no aporta). Cada uso **rota** el token (el anterior queda revocado); presentar un token ya revocado revoca todas las sesiones del usuario.
- **Revocación inmediata**: `authenticate` recarga el usuario por PK en cada petición; desactivar o cambiar el rol surte efecto de inmediato aunque el JWT siga vigente.
- **CSRF**: `SameSite=Strict` + cookie limitada al path de auth + CORS restringido (suficiente para un prototipo con mismo origen).
- **Fuerza bruta**: límite estricto en `/auth/login` (por IP) y respuesta uniforme `INVALID_CREDENTIALS`; verificación contra hash ficticio cuando el usuario no existe (igualar tiempos).
- **Desarrollo**: Vite hace *proxy* de `/api` → mismo origen, sin CORS ni cookies de terceros.

## 7. Reglas de negocio ubicadas en el dominio

| Regla | Componente |
|---|---|
| Transiciones válidas y qué rol/actor las ejecuta | `TicketStateMachine` (tabla declarativa, ver `data-model.md` §3) |
| Quién ve qué solicitud | `TicketAccessPolicy` (la no visible se responde **404**, no 403, para no revelar existencia) |
| Solo supervisor asigna; destino = TECNICO activo | `AssignTicketUseCase` + `AssigneeSpecification` |
| Vencimiento = creación + horas de `SlaPolicy` | `SlaCalculator` (instantánea `dueAt` guardada al crear) |
| Código `SIGA-000123` | `TicketCode.fromNumber(n)` (la BD solo guarda el número secuencial) |
| Historial de solo inserción | Repositorio sin `update/delete` + trigger SQL que lo impide |

## 8. Manejo de errores

Jerarquía `AppError` (dominio/aplicación) → `ValidationError 400`, `UnauthenticatedError 401`, `ForbiddenError 403`, `NotFoundError 404`, `ConflictError 409` (con subcódigos `INVALID_TRANSITION`, `INVALID_ASSIGNEE`, `CONCURRENT_MODIFICATION`, `EMAIL_ALREADY_EXISTS`), `RateLimitedError 429`. Todo lo no controlado → `500 INTERNAL_ERROR` con mensaje genérico; el detalle va solo al log (con `requestId`). Catálogo completo en `openapi.yaml`.

## 9. Estrategia de pruebas (prototipo)

- **Dominio y casos de uso**: unitarias con repositorios en memoria y `Clock` fijo; la máquina de estados se prueba con tabla exhaustiva de rol × transición.
- **API**: integración con Supertest contra PostgreSQL real (`siga_ti_test`) para los flujos clave: auth, crear/listar, asignar, transiciones, visibilidad y panel.
- **Contrato**: prueba de que el OpenAPI generado coincide con `docs/openapi.yaml`.
- **Web**: Testing Library en formularios y vistas clave; **2–3 flujos E2E** con Playwright en la Etapa 4 (ingreso, crear→asignar→resolver→cerrar, panel).

## 10. Registro de decisiones (ADR)

Versión de prototipo: solo lo que condiciona la implementación.

| # | Decisión | Motivo | Alternativas descartadas |
|---|---|---|---|
| 001 | Monorepo pnpm; `shared` como paquete interno que exporta fuente TS | Contrato único sin publicar paquetes ni paso de build | Repos separados; Nx/Turborepo |
| 002 | Clean Architecture con puertos; capas vigiladas por ESLint; composition root manual | Dominio testeable y desacoplado de Prisma/Express | Prisma en controladores; contenedores DI |
| 003 | Express 5 + Zod + Prisma, `jose` para JWT | Stack pedido; Express 5 maneja promesas rechazadas | Fastify/Nest; `jsonwebtoken`; Passport |
| 004 | Transacción dentro del repositorio: `saveWithEvent(ticket, event)` | Cambio + evento atómicos sin patrón `UnitOfWork` (excesivo hoy) | `UnitOfWork` como puerto (se adopta si crece el nº de agregados) |
| 005 | Access JWT 15 min + refresh httpOnly rotado, guardado como SHA-256 | Mitiga XSS; token no persistente en el navegador | JWT en `localStorage`; sesiones de servidor |
| 006 | Rol y estado activo locales; identidad vía `IdentityProvider`; `passwordHash` nullable en `User` | Migrar a OIDC cambia un adaptador | Tabla de credenciales aparte |
| 007 | Máquina de estados declarativa en el dominio | Auditable y probada por tabla | `if/else` en casos de uso; XState |
| 008 | `TicketEvent` con columnas tipadas + trigger de solo inserción | Consultable; la regla sobrevive a bugs | JSONB genérico; event sourcing |
| 009 | Código `SIGA-nnnnnn` derivado de `number` autoincremental | Secuencial sin carreras | `MAX()+1` |
| 010 | `dueAt` calculado al crear; sin pausa en `EN_ESPERA` | Estable y simple | Relojes de pausa, horario hábil |
| 011 | Concurrencia optimista por *compare-and-set* | Sin columna `version`; 409 `CONCURRENT_MODIFICATION` | Bloqueos pesimistas |
| 012 | Solicitud no visible ⇒ 404 | Evita enumeración | 403 |
| 013 | Paginación por offset (`pageSize ≤ 100`) | Suficiente a escala de prototipo | Cursor |
| 014 | Zod 4 fuente única; OpenAPI 3.1 generado y comparado con `docs/openapi.yaml` en una prueba | Sin deriva | OpenAPI manual; tRPC |
| 015 | Integración contra PostgreSQL real | Valida restricciones y transacciones | SQLite o mocks de Prisma |
| 016 | TypeScript 6.0.3 y Prisma 7.10.1 fijados | Compatibilidad y estabilidad | TS 7; Prisma 8 RC |

## 11. Riesgos técnicos identificados

| Riesgo | Mitigación |
|---|---|
| Sintaxis Prisma 7 no verificada contra docs oficiales | `prisma validate` y *spike* de 1 hora al inicio de la Etapa 2 |
| `shared` consumido como fuente TS puede fallar con algún bundler/TS resolver | *Spike* en Etapa 2 antes de escribir lógica; plan B: compilar con `tsc -b` |
| CHECK y trigger no expresables en el esquema Prisma | Migración SQL manual versionada + prueba de integración que intenta violarlos |
| Deriva `schema.prisma` ↔ enums de `shared` | Aserción de tipos en compilación |
