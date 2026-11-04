# SIGA-TI — Entorno: esquema Zod y `.env.example`

Toda variable se valida **al arrancar** (`apps/api/src/config/env.ts`); si falla, el proceso termina con código 1 y un mensaje que lista las variables inválidas **sin imprimir sus valores**. El objeto `Env` resultante es inmutable y es lo único que se inyecta (nadie lee `process.env` fuera de `config`).

## Variables

| Variable | Obligatoria | Defecto | Descripción |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `3000` | Puerto HTTP |
| `LOG_LEVEL` | no | `info` | `fatal`…`trace`, `silent` |
| `DATABASE_URL` | sí | — | URL PostgreSQL (`postgresql://…`) |
| `CORS_ALLOWED_ORIGINS` | sí | — | Orígenes separados por coma, sin ruta ni `*` |
| `JWT_ACCESS_SECRET` | sí | — | ≥ 32 caracteres; en producción no puede ser el valor de ejemplo |
| `COOKIE_SECURE` | no | `false` | Debe ser `true` en producción |
| `RATE_LIMIT_LOGIN_MAX` | no | `10` | Intentos de ingreso por IP cada 15 min |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` / `_PORT` | sí (Compose) | — | Solo para `docker-compose.yml` |
| `TEST_DATABASE_URL` | sí (pruebas) | — | BD `siga_ti_test` para integración |
| `SEED_DEFAULT_PASSWORD` | sí (semillas) | — | ≥ 12 caracteres; las semillas se niegan a correr en producción |
| `VITE_API_BASE_URL` | no (web) | `/api/v1` | Base de la API en el cliente |
| `VITE_DEV_API_PROXY_TARGET` | no (web, dev) | `http://localhost:3000` | Destino del proxy de Vite |
| `VITE_SHOW_DEMO_ACCOUNTS` | no (web) | `false` | Muestra en el login botones que rellenan las cuentas de demostración (solo desarrollo) |
| `VITE_DEMO_PASSWORD` | solo si lo anterior es `true` | — | Contraseña que se muestra y se rellena; debe coincidir con `SEED_DEFAULT_PASSWORD` |

`CORS_ALLOWED_ORIGINS` y `COOKIE_SECURE` no tienen valor por defecto inseguro; un `*` o un origen con ruta falla la validación.

## Esquema (definición)

```ts
// apps/api/src/config/env.ts
import { z } from 'zod';

const PLACEHOLDER_SECRET_PREFIX = 'dev-only-change-me';

const origin = z.url().refine((value) => {
  const url = new URL(value);
  return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value;
}, 'Debe ser un origen http(s) sin ruta ni barra final');

const originList = z
  .string()
  .transform((raw) => raw.split(',').map((item) => item.trim()).filter(Boolean))
  .pipe(z.array(origin).min(1));

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    CORS_ALLOWED_ORIGINS: originList,
    JWT_ACCESS_SECRET: z.string().min(32),
    COOKIE_SECURE: z.stringbool().default(false),
    RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().min(1).default(10),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    if (!env.COOKIE_SECURE) {
      ctx.addIssue({ code: 'custom', path: ['COOKIE_SECURE'], message: 'Debe ser true en producción' });
    }
    if (env.JWT_ACCESS_SECRET.startsWith(PLACEHOLDER_SECRET_PREFIX)) {
      ctx.addIssue({ code: 'custom', path: ['JWT_ACCESS_SECRET'], message: 'No use el valor de ejemplo en producción' });
    }
  });

export type Env = Readonly<z.infer<typeof envSchema>>;

export const loadEnv = (source: NodeJS.ProcessEnv): Env => { /* safeParse → error agregado sin valores */ };
```

Esquema de semillas (proceso aparte, no carga el resto):

```ts
// apps/api/prisma/seed/env.ts
export const seedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test']),            // 'production' ⇒ falla: las semillas no corren en producción
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  SEED_DEFAULT_PASSWORD: z.string().min(12),
});
```

Esquema web (`apps/web/src/config/env.ts`): `VITE_API_BASE_URL: z.string().min(1).default('/api/v1')`, validado sobre `import.meta.env` al iniciar la SPA.

Detalle intencional: se usa `z.stringbool()` y no `z.coerce.boolean()` porque este último convierte la cadena `"false"` en `true`.

## `.env.example`

Ver [`.env.example`](./.env.example). Se copiará a la raíz del repo en la Etapa 2. Constantes en código (no configurables, KISS): access token 15 min, refresh token 7 días, ventana de límite de ingreso 15 min, límite general 300 peticiones/min, Swagger activo salvo en producción.

`.env` y `.env.test` van en `.gitignore`; solo `.env.example` se versiona, con valores **de ejemplo no utilizables en producción**.
