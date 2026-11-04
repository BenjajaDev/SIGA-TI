# SIGA-TI — Preguntas abiertas y supuestos (a confirmar)

Cada pregunta trae mi **propuesta por defecto**: si respondes "aprobado" sin cambios, se adopta tal cual.

## A. Preguntas que requieren tu decisión

Cada una trae mi **propuesta por defecto**; si respondes "aprobado" sin cambios, se adopta.

| # | Pregunta | Propuesta por defecto |
|---|---|---|
| **Q-1** | **Horas de SLA** | CRITICA 8 h · ALTA 24 h · MEDIA 72 h · BAJA 120 h, horas corridas y sin pausa en `EN_ESPERA` (horario hábil o pausa quedan como limitación documentada) |
| **Q-2** | **Categorías iniciales** | Soporte de equipos · Redes y conectividad · Cuentas y accesos · Software y licencias · Plataformas académicas · Correo y colaboración · Otros |
| **Q-3** | **¿El supervisor registra a nombre de otro?** | **Sí**, solo él, con `requesterId` opcional; el evento `CREATED` guarda al supervisor como actor y el solicitante pasa a ser el titular |
| **Q-4** | **ADMIN sobre solicitudes** | Solo lectura y panel; no asigna ni cambia estados |
| **Q-5** | **Creación y visibilidad del técnico** | SOLICITANTE, TECNICO y SUPERVISOR crean para sí mismos; el técnico ve las asignadas a él **y las que creó** |
| **Q-6** | **Reasignación y notas** | Reasignar permitido en `ASIGNADA`/`EN_PROGRESO`/`EN_ESPERA` sin cambiar estado; nota obligatoria al pausar, resolver y reabrir |
| **Q-7** | **Backlog y panel** | Backlog = todo lo no resuelto ni cerrado; panel solo para SUPERVISOR y ADMIN |
| **Q-8** | **Versiones** | Node 26 LTS (`engines >=24.11`), TypeScript 6.0.3, Prisma 7.10.1, PostgreSQL 18 |
| **Q-9** | **Alcance** | RF-09 y RF-11 incluidos; por petición posterior, la administración de usuarios se implementa en el panel solo para ADMIN. La administración de categorías permanece fuera del prototipo. CI (GitHub Actions) se difiere a la Etapa 4 |
| **Q-10** | **Acceso a docs de Prisma** | Habilitar `www.prisma.io` en la sesión; si no, valido con `prisma validate` en la Etapa 2 |

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
| S-8 | Tokens: access 15 min; refresh 7 días con rotación |
| S-9 | Volumen de prototipo (≤ decenas de miles de solicitudes): paginación por offset es suficiente |
| S-10 | Zona horaria: se almacena UTC; la web formatea en `America/Santiago` |
| S-11 | `resolvedAt` refleja la **última** resolución (se limpia al reabrir) |
| S-12 | Dominio de correos ficticios `@siga-ti.test`; contraseña única de semillas desde `SEED_DEFAULT_PASSWORD` |
| S-13 | Fuera del prototipo: limpieza de refresh tokens expirados, administración de categorías, paginación por cursor, Swagger restringido |

## D. Riesgos para el informe PMI

- Sintaxis de Prisma 7 sin verificar contra docs oficiales (Q-10): bajo-medio; *spike* al inicio de la Etapa 2.
- Si se exige SLA con pausa u horario hábil (Q-1) crece el alcance de RF-11.
