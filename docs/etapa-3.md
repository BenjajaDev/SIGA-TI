# Etapa 3 — Frontend y UX/UI: resumen

## Entregado

- `apps/web`: React 19 + Vite 8 + React Router 8 + TanStack Query + React Hook Form (con los esquemas Zod de `shared`) + Tailwind 4 + Recharts 3.
- Separación estricta, vigilada por ESLint: **UI** (`components/`, `pages/`) → **hooks** (`hooks/`, único lugar con TanStack Query) → **servicios** (`services/`, clientes HTTP sin React). La UI no importa servicios.
- Componentes atómicos: `atoms/` (Button, Badge, Card, Alert, controles, Spinner, BrandLogo), `molecules/` (FormField, Pagination, StatCard, QueryState, PageHeader, ThemeApplier), `organisms/` (AppShell, formularios, tabla, acciones, historial, comentarios, gráficos).
- Pantallas: ingreso, listado con filtros en la URL y paginación, nueva solicitud (el supervisor puede registrar a nombre de otro), detalle (acciones por rol, asignación, historial y comentarios públicos/internos), panel de indicadores (estado, categoría, carga por técnico, resolución y SLA), **Apariencia** y **Usuarios** (ambas solo ADMIN).
- Sesión: access token **solo en memoria**; al cargar se rehidrata con la cookie `httpOnly`. Las renovaciones concurrentes se unifican en una sola (*single-flight*) para no disparar la detección de reutilización del refresh token (importante con React StrictMode).
- Reglas de transición y permisos de comentarios movidos a `packages/shared` (`ticket-rules.ts`): API y UI usan **la misma tabla**; la matriz exhaustiva de la API sigue validándola.
- Accesibilidad: enlace "saltar al contenido", etiquetas asociadas, errores con `role="alert"`, tablas con `caption`/`scope`, gráficos con texto alternativo, `prefers-reduced-motion`.

## Identidad visual editable (pedido en la etapa)

- Backend: tabla `brand_settings` (migración `branding`), `GET /branding` público y `PUT /branding` solo ADMIN. Validación: colores `#RRGGBB`, **contraste mínimo con texto blanco** (4,5 el primario, 3 el secundario), ángulo 0–360, logo PNG/JPG/WebP/SVG como data URL (≤ 300 000 caracteres; el SVG solo se muestra vía `<img>`, donde no ejecuta scripts).
- Frontend: el tema son variables CSS (`--brand-primary`, `--brand-secondary`, `--brand-angle`) que alimentan `bg-brand-gradient` y la escala `brand-*` de Tailwind; se aplican al cargar y al guardar. Pantalla **Apariencia** con vista previa en vivo, carga de logo, "quitar logo" y "restaurar valores por defecto".
- Los colores y el nombre institucionales **reales no se conocen**: el valor por defecto es neutro (azul → verde azulado). Se cargan desde Apariencia.

## Hallazgos corregidos durante la verificación en navegador

- El formulario de Apariencia recibía `updatedAt` y el esquema estricto lo rechazaba **sin mostrar error**: ahora solo recibe los campos editables.
- El control deslizante nativo ajustaba el ángulo a 180° al montarse (RHF asigna `value` antes que `min/max`): ahora es controlado.
- El límite de ingresos (10/15 min) se agotó durante las pruebas manuales y respondió 429 con el sobre estándar, como se espera.

## Limitaciones

- Playwright E2E cubre ingreso, panel/gráficos, navegación responsive y ciclo de creación/edición/desactivación/reactivación de usuarios.
- Si un usuario abre **dos pestañas** y ambas renuevan la sesión a la vez, la segunda usa un refresh token ya rotado y el sistema lo trata como reutilización (cierra todas las sesiones). Es el costo de la detección estricta; un mecanismo entre pestañas (BroadcastChannel/lock) queda para después.
- El bundle inicial pesa ≈ 555 kB (167 kB gzip); el panel (Recharts) y la administración de usuarios se cargan bajo demanda. Sigue pendiente dividir el chunk inicial grande.
- La administración de categorías (RF-12) sigue fuera del alcance implementado; la gestión de usuarios se añadió como petición posterior.
