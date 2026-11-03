# SIGA-TI — Preguntas abiertas y supuestos (a confirmar)

Cada pregunta trae mi **propuesta por defecto**: si respondes "aprobado" sin cambios, se adopta tal cual.

## A. Preguntas que requieren tu decisión

| # | Pregunta | Propuesta por defecto | Alternativa / impacto |
|---|---|---|---|
| **Q-1** | **Horas de SLA por prioridad** | CRITICA 8 h · ALTA 24 h · MEDIA 72 h · BAJA 120 h, **horas corridas** (24×7) y **sin pausa** en `EN_ESPERA` | Horas hábiles o pausa en espera exigen calendario y reloj acumulado: +1 entidad y lógica en Etapa 2. Para un prototipo no lo recomiendo; se documenta como limitación |
| **Q-2** | **Categorías iniciales** | Soporte de equipos · Redes y conectividad · Cuentas y accesos · Software y licencias · Plataformas académicas · Correo y colaboración · Otros | Se administran por semilla (y por RF-12 si se implementa) |
| **Q-3** | **¿El supervisor puede registrar a nombre de otro usuario?** | **Sí**, solo el SUPERVISOR, con `requesterId` opcional (usuario activo); el evento `CREATED` registra al supervisor como actor y el solicitante pasa a ser el titular (puede cerrar/reabrir, y la ve) | **No**: simplifica `CreateTicketRequest` y el control de acceso; pierde el caso "usuario llama por teléfono" |
| **Q-4** | **¿Qué puede hacer el ADMIN sobre solicitudes?** | Ver todas y el panel; administrar usuarios/categorías (RF-12); **no** asigna ni cambia estados (separación de funciones) | Darle las mismas facultades del supervisor (más simple, menos separación) |
| **Q-5** | **¿Quién puede crear solicitudes?** | SOLICITANTE, TECNICO y SUPERVISOR (para sí mismos). ADMIN no | Solo SOLICITANTE |
| **Q-6** | **Visibilidad del técnico** | Ve las asignadas a él **y las que él mismo creó** (si no, perdería de vista sus propias solicitudes) | Solo las asignadas, literal del enunciado |
| **Q-7** | **Reasignación** | Permitida en `ASIGNADA`, `EN_PROGRESO` y `EN_ESPERA`, sin cambiar el estado; prohibida en `RESUELTA`/`CERRADA` (409). No existe "desasignar" (volver a `ABIERTA`) | Cambiar a `ASIGNADA` al reasignar; permitir reasignar en `RESUELTA` |
| **Q-8** | **Notas obligatorias** | Obligatoria en `EN_ESPERA` (motivo), `RESUELTA` (solución) y reabrir (motivo); opcional en el resto | Opcional en todas (menos trazabilidad) |
| **Q-9** | **Definición de backlog y acceso al panel** | Backlog = `ABIERTA`+`ASIGNADA`+`EN_PROGRESO`+`EN_ESPERA` (se informa aparte el subconjunto sin asignar). Panel solo para SUPERVISOR y ADMIN | Backlog = solo `ABIERTA`; panel de "mi carga" para técnicos |
| **Q-10** | **Reabrir: ¿quién?** | Solicitante del ticket o supervisor (como indica el enunciado); el técnico asignado no reabre | Incluir al técnico |
| **Q-11** | **Versiones de plataforma** | Node **26 LTS** (publicado como LTS el 2026-10-28; `engines >=24.11`), TypeScript **6.0.3**, Prisma **7.10.1**, PostgreSQL 18 | Node 24 si tu equipo/CI aún no usa 26; TS 7 y Prisma 8 RC descartados por compatibilidad/estabilidad |
| **Q-12** | **Swagger UI en producción** | Activo en desarrollo, apagado por defecto en producción (`SWAGGER_ENABLED`) | Siempre activo (el prototipo se evalúa con ella) |
| **Q-13** | **CI** | Se difiere: Husky local en Etapa 2; workflow de GitHub Actions (lint + tipos + unitarias + integración con servicio Postgres) en Etapa 4 | Crearlo desde la Etapa 2 |
| **Q-14** | **Alcance de RF-09, RF-11 y RF-12** | RF-09 y RF-11 **incluidos** (contrato ya definido); RF-12 incluido al final de la Etapa 2/3 solo si hay holgura (endpoints ya definidos como opcionales) | Excluir RF-12 del contrato para reducir superficie |
| **Q-15** | **Acceso a documentación oficial** | Necesito que `www.prisma.io` esté en los dominios permitidos de la sesión para verificar la sintaxis de Prisma 7 antes de la Etapa 2 | Verificar con `prisma validate` en local; riesgo bajo, ya acotado en `architecture.md` §11 |

## B. Ambigüedades detectadas en el enunciado (y cómo las resolví)

| Tema | Ambigüedad | Resolución |
|---|---|---|
| RF-13 vs. "el supervisor puede ejecutar cualquier transición válida" | ¿Podría el supervisor saltarse la validez del grafo? | No: "válida" restringe al grafo; el supervisor tiene todos los permisos *dentro* del grafo. Cualquier otra → 409 |
| `ABIERTA → ASIGNADA` "al asignar" | ¿Es una transición manual? | No: solo ocurre vía `PUT …/assignment`; `/transitions` la rechaza |
| Códigos de error | Se piden solo 400/401/403/404/409/429/500 | Los subtipos viajan en `error.code` (p. ej. `INVALID_TRANSITION` sigue siendo HTTP 409) |
| Solicitud no visible | ¿403 o 404? | **404** para no revelar existencia; 403 solo cuando sí ve la solicitud pero su rol/actor no puede la acción |
| Prioridad `CRITICA` | El enunciado la menciona solo en la propuesta de SLA | Enum: `CRITICA`, `ALTA`, `MEDIA`, `BAJA` |
| Idioma de identificadores | "Identificadores en inglés" vs. enums como `ABIERTA` | Nombres de campos, clases y rutas en inglés; **valores** de enums del dominio en español, tal como el enunciado |

## C. Supuestos adoptados

| # | Supuesto |
|---|---|
| S-1 | Un único tenant/universidad; sin multi-sede |
| S-2 | Ingreso por correo + contraseña del directorio simulado; sin registro público |
| S-3 | Cada usuario tiene **un** rol |
| S-4 | El ADMIN no opera solicitudes (ver Q-4) |
| S-5 | Prioridad y categoría **no** se editan tras crear (afectan SLA); sin edición de título/descripción |
| S-6 | Los comentarios no generan `TicketEvent`; el historial cubre solo creación, asignación y cambios de estado |
| S-7 | Sin adjuntos, sin cancelación/rechazo (no hay estado `CANCELADA`), sin cierre automático por inactividad |
| S-8 | Tokens: access 15 min; refresh 7 días con rotación; sin límite absoluto de sesión |
| S-9 | Volumen de prototipo (≤ decenas de miles de solicitudes): paginación por offset es suficiente |
| S-10 | Zona horaria: se almacena UTC; la web formatea en `America/Santiago` |
| S-11 | `resolvedAt` refleja la **última** resolución (se limpia al reabrir) |
| S-12 | Dominio de correos ficticios `@siga-ti.test`; contraseña única de semillas desde `SEED_DEFAULT_PASSWORD` |
| S-13 | La limpieza de refresh tokens expirados queda fuera del prototipo (documentada) |

## D. Riesgos de planificación para el informe PMI

- **Dependencia externa no verificada** (Prisma 7): ver Q-15; impacto bajo-medio, mitigado con *spike*.
- **Reglas de SLA**: si se exige pausa/horario hábil (Q-1) crece el alcance de RF-11.
- **RF-12** es el primer candidato a recorte si la Etapa 3 se estira.
