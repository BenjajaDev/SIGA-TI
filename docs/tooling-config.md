# SIGA-TI — Configuración propuesta de TypeScript, ESLint, Prettier y flujo de calidad

Documento de diseño: los archivos reales se crean en la Etapa 2.

## 1. TypeScript

TypeScript **6.0.3** (7.0.x excluido: incompatible con `typescript-eslint` 8.72, que exige `<6.1.0`). ESM en todo el repo (`"type": "module"`).

`tsconfig.base.json`:

```jsonc
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true
  }
}
```

| Paquete | Extiende | Particularidades |
|---|---|---|
| `packages/shared` | base | `types: []`; sin DOM ni Node; exporta fuente TS |
| `apps/api` | base | `types: ["node"]`; `include: ["src", "test", "prisma", "prisma.config.ts"]`; typecheck con `tsc --noEmit`, build con `tsup` |
| `apps/web` | base | `lib: ["ES2023", "DOM", "DOM.Iterable"]`, `jsx: "react-jsx"`, `types: ["vite/client"]` |

Los alias de importación se evitan salvo `@siga/shared` (nombre del workspace); dentro de `api` se usan rutas relativas para que la regla de capas sea verificable.

## 2. ESLint (flat config, `eslint.config.mjs`)

Base: `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` con `projectService: true`.

Reglas innegociables (todas `error`):

| Regla | Propósito |
|---|---|
| `@typescript-eslint/no-explicit-any` | prohíbe `any` y `as any` |
| `@typescript-eslint/no-unsafe-{assignment,call,member-access,return,argument}` | cierra la fuga de `any` implícito |
| `@typescript-eslint/ban-ts-comment` `{ 'ts-ignore': true, 'ts-expect-error': 'allow-with-description', minimumDescriptionLength: 15 }` | `@ts-ignore` prohibido; `@ts-expect-error` solo con justificación |
| `@typescript-eslint/no-non-null-assertion` | sin `!` |
| `@typescript-eslint/no-floating-promises`, `no-misused-promises`, `only-throw-error` | robustez asíncrona |
| `@typescript-eslint/consistent-type-imports` | alineado con `verbatimModuleSyntax` |
| `@typescript-eslint/switch-exhaustiveness-check` | exhaustividad en enums de estado/rol |
| `no-console` | solo pino |
| `eqeqeq`, `no-var`, `prefer-const` | higiene |

**Regla de capas** (`no-restricted-imports` por bloque `files`):

| Archivos | Prohibido importar |
|---|---|
| `apps/api/src/domain/**` | `express`, `@prisma/*`, `pino*`, `jose`, `argon2`, `../application`, `../infrastructure`, `../interfaces`, `../config` |
| `apps/api/src/application/**` | `express`, `@prisma/*`, `../infrastructure`, `../interfaces` |
| `apps/api/src/infrastructure/**` | `express`, `../interfaces` |
| `apps/api/src/interfaces/**` | `@prisma/*`, `../infrastructure` (solo `main.ts` conecta) |
| `packages/shared/**` | `express`, `@prisma/*`, `react` |
| `apps/web/src/services/**` | `react`, `@tanstack/*` |
| `apps/web/src/components/**`, `pages/**` | `services/*` (la UI solo habla con hooks) |

Bloques adicionales: `eslint-plugin-react-hooks` y `eslint-plugin-jsx-a11y` (recommended) para `apps/web`; en pruebas se relaja únicamente `no-non-null-assertion` y `unbound-method`, **nunca** `no-explicit-any`. Ignorados: `dist`, `generated` (cliente Prisma), `coverage`.

## 3. Prettier (`prettier.config.mjs`)

```js
export default {
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  endOfLine: 'lf',
  arrowParens: 'always',
};
```

ESLint no contiene reglas de formato (evita conflictos); Prettier corre aparte. `.editorconfig` coherente (LF, UTF-8, 2 espacios).

## 4. Husky y scripts

- `pre-commit`: `lint-staged` → `eslint --fix --max-warnings 0` y `prettier --write` sobre archivos staged.
- `pre-push`: `pnpm typecheck && pnpm test:unit`.
- Las pruebas de integración/E2E no corren en hooks (requieren BD); se ejecutan con `pnpm test:integration` y en la Etapa 4.

Scripts raíz previstos: `dev`, `build`, `lint`, `format:check`, `typecheck`, `test`, `test:unit`, `test:integration`, `test:e2e`, `db:up`, `db:migrate`, `db:seed`, `db:seed:demo`, `db:reset`, `openapi:generate`.

## 5. Vitest

Proyectos por paquete (`vitest.workspace`/`projects`): `shared` y `api-unit` (node, sin BD), `api-integration` (node, `pool: forks`, `fileParallelism: false`, setup que aplica migraciones a `siga_ti_test` y trunca entre pruebas), `web` (jsdom + Testing Library). Cobertura con v8; umbral inicial propuesto: dominio ≥ 95 %, aplicación ≥ 85 %, global ≥ 80 %.

## 6. Definición de terminado (comandos)

```bash
pnpm lint && pnpm typecheck && pnpm test
```

sin errores ni *warnings* (`--max-warnings 0`).
