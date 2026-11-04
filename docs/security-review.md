# Revisión de seguridad (Etapa 4)

Alcance: API, frontend y configuración del prototipo. Método: revisión de código dirigida, búsqueda de patrones peligrosos, auditoría de dependencias y pruebas automatizadas de cada control (`apps/api/test/integration/security.test.ts`, `system.test.ts`, `auth.test.ts`, E2E de permisos).

## Resultado resumido

| Área | Estado | Evidencia |
| --- | --- | --- |
| Dependencias de producción | Sin vulnerabilidades conocidas | `pnpm audit --prod` |
| Secretos en el repositorio | Ninguno; solo `.env.example` con valores de ejemplo; `.env` ignorado | búsqueda de patrones + `git ls-files` |
| Inyección SQL | Solo consultas Prisma parametrizadas; SQL crudo únicamente en el reinicio de la BD de pruebas (cadena fija, no corre en producción) | revisión + prueba con carga `'; DROP TABLE…` |
| XSS | React escapa por defecto; sin `dangerouslySetInnerHTML`, `innerHTML` ni `eval`; el logo (data URL) solo se muestra en `<img>`; colores validados como `#RRGGBB` antes de entrar a CSS | búsqueda + pruebas de validación |
| Autenticación | JWT HS256 de 15 min; rechaza firma ajena, `alg=none` y expirados; el rol efectivo sale de la BD, no del token | `security.test.ts` |
| Sesión | Refresh en cookie `httpOnly; SameSite=Strict; Path=/api/v1/auth` (+ `Secure` en producción), rotado, guardado como SHA-256, revocación total ante reutilización | `auth.test.ts`, `refresh-session.test.ts`, prueba en modo producción |
| Fuerza bruta | Límite de ingresos por IP (429) + respuesta idéntica para usuario inexistente/clave errónea + hash señuelo para igualar tiempos | `auth.test.ts`, `rate-limit.test.ts` |
| Autorización / IDOR | Política única en dominio; solicitud no visible ⇒ 404 idéntico a inexistente; matriz exhaustiva rol × transición | `ticket-state-machine.test.ts`, `tickets.test.ts`, E2E |
| Entrada | Esquemas Zod estrictos en toda entrada (rechazan campos extra y `__proto__`), límites de tamaño, parámetros duplicados rechazados | `security.test.ts` |
| Errores | Sobre estándar; 500 genérico sin detalles internos | `system.test.ts` |
| Logs | Redacción de `Authorization`, `Cookie`, `Set-Cookie`, contraseñas y tokens | verificado en ejecución |
| Cabeceras / CORS | helmet; CORS con lista exacta y `credentials`; Swagger apagado en producción | `system.test.ts`, `security.test.ts` |
| Entorno | Validado con Zod al arrancar (falla sin mostrar valores); producción exige `COOKIE_SECURE=true` y secreto no de ejemplo | `env.test.ts` |
| Semillas | Se niegan a correr con `NODE_ENV=production` | `seedEnvSchema` |

## Hallazgos y correcciones durante la revisión

1. **`PUT /branding` procesaba hasta 450 KB de cuerpo antes de verificar la sesión** (superficie de DoS para anónimos). Ahora autentica primero; sin sesión responde 401 sin leer el cuerpo. *Corregido y probado.*
2. **Un no administrador recibía 400 (validación) en lugar de 403** en `PUT /branding`, revelando reglas del esquema. Ahora autoriza antes de validar. *Corregido y probado.*
3. **Validación de `CORS_ALLOWED_ORIGINS`** lanzaba una excepción con valores no-URL (corregido en la Etapa 2).
4. El formulario de Apariencia enviaba un campo extra rechazado en silencio (corregido en la Etapa 3).

## Riesgos aceptados y requisitos de despliegue (no cubiertos por el prototipo)

| Tema | Detalle |
| --- | --- |
| Terminación TLS y `Secure` | En producción servir por HTTPS y definir `COOKIE_SECURE=true` (la API lo exige). |
| IP real tras proxy | La API no configura `trust proxy`: detrás de un balanceador el límite de ingresos vería la IP del proxy. Debe configurarse al desplegar. |
| CSP de la SPA | La API envía helmet, pero la SPA (archivos estáticos) debe servirse con una CSP restrictiva, p. ej. `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self'` (se requiere `data:` para el logo y `unsafe-inline` por los estilos en línea de Recharts). |
| Bloqueo de cuenta | Solo hay límite por IP; no hay bloqueo por cuenta (un atacante distribuido podría probar claves). Aceptable para un prototipo con identidad simulada. |
| Identidad simulada | Las contraseñas viven en `users.passwordHash` solo para la simulación; al integrar OIDC se elimina la columna. |
| Dos pestañas | La detección estricta de reutilización del refresh token puede cerrar la sesión si dos pestañas renuevan a la vez (disponibilidad, no confidencialidad). |
| Limpieza de tokens | Los refresh tokens expirados no se purgan (tarea de mantenimiento pendiente). |
| Auditoría de acceso | El historial cubre cambios de solicitudes; no hay bitácora de inicios de sesión ni de cambios de apariencia. |
| Logo SVG | Se acepta SVG porque se muestra solo vía `<img>` (sin scripts). Si en el futuro se incrusta en línea (`<svg>`), debe sanearse. |
