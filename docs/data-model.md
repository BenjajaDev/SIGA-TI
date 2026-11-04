# SIGA-TI — Modelo de datos (Etapa 1)

Esquema Prisma propuesto: [`schema.prisma`](./schema.prisma). Identificadores de código en inglés; valores de enums del dominio en español (lenguaje ubicuo del enunciado).

## 1. Diagrama entidad–relación

```mermaid
erDiagram
    User ||--o{ RefreshToken : "tiene"
    User ||--o{ Ticket : "solicita (requester)"
    User |o--o{ Ticket : "atiende (assignee)"
    Category ||--o{ Ticket : "clasifica"
    Ticket ||--o{ TicketEvent : "historial"
    Ticket ||--o{ Comment : "comentarios"
    User ||--o{ TicketEvent : "actor"
    User ||--o{ Comment : "autor"
    SlaPolicy ||..o{ Ticket : "define dueAt por prioridad"

    User {
        uuid id PK
        string email UK
        string fullName
        Role role
        boolean isActive
        string passwordHash "nullable, solo identidad simulada"
    }
    RefreshToken {
        uuid id PK
        uuid userId FK
        char64 tokenHash UK
        timestamptz expiresAt
        timestamptz revokedAt
    }
    Category {
        uuid id PK
        string name UK
        boolean isActive
    }
    SlaPolicy {
        uuid id PK
        Priority priority UK
        int resolutionHours
    }
    Ticket {
        uuid id PK
        int number UK "secuencia"
        string title
        string description
        uuid categoryId FK
        Priority priority
        TicketStatus status
        uuid requesterId FK
        uuid assigneeId FK
        timestamptz dueAt
        timestamptz resolvedAt
        timestamptz closedAt
    }
    TicketEvent {
        uuid id PK
        uuid ticketId FK
        EventType type
        uuid actorId FK
        TicketStatus fromStatus
        TicketStatus toStatus
        uuid fromAssigneeId
        uuid toAssigneeId
        string note
        timestamptz createdAt
    }
    Comment {
        uuid id PK
        uuid ticketId FK
        uuid authorId FK
        string body
        Visibility visibility
        timestamptz createdAt
    }
```

## 2. Entidades y decisiones por tabla

| Tabla | Decisiones |
|---|---|
| `users` | `email` único, normalizado a minúsculas **en el dominio** antes de persistir. Rol único por usuario (supuesto S-3). `isActive` en lugar de borrado. `passwordHash` nullable (ADR-006). |
| `refresh_tokens` | Solo hash SHA-256 (`CHAR(64)`, único). `revokedAt` marca revocación. Si se presenta un token ya revocado (reutilización), se revocan todos los tokens del usuario. Limpieza de expirados: fuera del prototipo. |
| `categories` | Nombre único; `isActive` (no se borran: los tickets las referencian, `onDelete: Restrict`). |
| `sla_policies` | Una fila por prioridad (`priority` único). Cambiarla **no** recalcula tickets existentes (`dueAt` es instantánea). |
| `tickets` | `number` autoincremental → `SIGA-` + 6 dígitos con relleno (`SIGA-000123`). Sin borrado (no hay endpoint, FK `Restrict`). `resolvedAt` se establece al pasar a `RESUELTA` y se **limpia al reabrir** (mide la última resolución). `closedAt` al cerrar. |
| `ticket_events` | Solo inserción. Columnas tipadas por tipo de evento (ver §4). `note` opcional/obligatoria según transición. |
| `comments` | Inmutables (sin edición/borrado). `INTERNO` solo visible a técnico asignado, supervisor y admin. No generan `TicketEvent` (supuesto S-6). |

Tipos: UUID para claves (`@db.Uuid`), `timestamptz(3)` para todas las marcas de tiempo (UTC), `varchar` con longitudes acotadas coherentes con Zod.

## 3. Máquina de estados

```mermaid
stateDiagram-v2
    [*] --> ABIERTA
    ABIERTA --> ASIGNADA: asignar (supervisor)
    ASIGNADA --> EN_PROGRESO: iniciar
    EN_PROGRESO --> EN_ESPERA: pausar
    EN_ESPERA --> EN_PROGRESO: reanudar
    EN_PROGRESO --> RESUELTA: resolver
    RESUELTA --> CERRADA: cerrar
    RESUELTA --> EN_PROGRESO: reabrir
    CERRADA --> [*]
```

Tabla de autorización (única fuente; se implementa tal cual y se prueba exhaustivamente, 6×6 pares × 4 roles × contexto de actor):

| Desde → Hacia | Vía | Quién puede | `note` |
|---|---|---|---|
| ABIERTA → ASIGNADA | `PUT /tickets/{id}/assignment` | SUPERVISOR | no |
| ASIGNADA → EN_PROGRESO | `POST …/transitions` | técnico asignado, SUPERVISOR | opcional |
| EN_PROGRESO → EN_ESPERA | transición | técnico asignado, SUPERVISOR | **obligatoria** (motivo) |
| EN_ESPERA → EN_PROGRESO | transición | técnico asignado, SUPERVISOR | opcional |
| EN_PROGRESO → RESUELTA | transición | técnico asignado, SUPERVISOR | **obligatoria** (resumen de solución) |
| RESUELTA → CERRADA | transición | solicitante del ticket, SUPERVISOR | opcional |
| RESUELTA → EN_PROGRESO (reabrir) | transición | solicitante del ticket, SUPERVISOR | **obligatoria** (motivo) |
| cualquier otra | — | — | **409 `INVALID_TRANSITION`** |

- La transición a `ASIGNADA` **no** se acepta en `/transitions`; ocurre solo al asignar (evita dos caminos para lo mismo).
- Orden de evaluación: visibilidad (404) → rol/actor (403) → validez de la transición (409) → `note` requerida (400).
- ADMIN no ejecuta transiciones (supuesto S-4, pregunta Q-4).

## 4. Eventos (historial inmutable)

| `type` | Campos poblados | Cuándo |
|---|---|---|
| `CREATED` | `actorId`, `toStatus=ABIERTA` | al registrar |
| `ASSIGNED` | `actorId`, `fromStatus=ABIERTA`, `toStatus=ASIGNADA`, `toAssigneeId` | primera asignación |
| `REASSIGNED` | `actorId`, `fromAssigneeId`, `toAssigneeId` (estado sin cambio) | cambio de técnico |
| `STATUS_CHANGED` | `actorId`, `fromStatus`, `toStatus`, `note?` | resto de transiciones |

Cada operación que modifica un ticket inserta su evento **dentro de la misma transacción** (`saveWithEvent`, ADR-004). La coherencia de campos por tipo la garantiza el dominio (pruebas unitarias).

## 5. Restricciones que Prisma no expresa (migración SQL manual)

Se versionan en `prisma/migrations/<ts>_integrity_constraints/migration.sql` y se cubren con pruebas de integración que intentan violarlas.

```sql
-- Coherencia estado/asignación (protege el invariante central)
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_required"
  CHECK (("status" = 'ABIERTA') = ("assigneeId" IS NULL));

ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_hours_positive"
  CHECK ("resolutionHours" > 0);

-- Historial de solo inserción
CREATE FUNCTION forbid_ticket_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ticket_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ticket_events_append_only"
  BEFORE UPDATE OR DELETE ON "ticket_events"
  FOR EACH ROW EXECUTE FUNCTION forbid_ticket_event_mutation();
```

> Estado real: este SQL es el de la migración `*_init` (columnas en camelCase, convención por defecto de Prisma). Además existe la tabla `brand_settings` (migración `branding`) para la identidad visual.

Prototipo: se mantienen solo estas dos restricciones y el trigger; el resto de coherencias (fechas, forma de cada evento) las garantiza el dominio y sus pruebas. `TRUNCATE` no activa el trigger de fila, por lo que las pruebas pueden limpiar la tabla entre casos.

El rol de destino de una asignación (`TECNICO` activo) es una regla entre tablas: se valida en el caso de uso, no con CHECK.

## 6. Índices (justificación por consulta)

| Índice | Consulta que sirve |
|---|---|
| `tickets(status, createdAt)` | listado por estado y panel |
| `tickets(assigneeId, status)` | bandeja del técnico; carga por técnico |
| `tickets(requesterId)` | "mis solicitudes" |
| `tickets(number)` único | secuencia y código |
| `ticket_events(ticketId, createdAt)`, `comments(ticketId, createdAt)` | línea de tiempo e hilo |
| `refresh_tokens(tokenHash)` único, `(userId)` | rotación y revocación |

Los filtros por prioridad y categoría no llevan índice propio: a escala de prototipo basta el escaneo.

## 7. Consultas del panel (definiciones)

Definiciones de negocio asumidas (confirmar en Q-7):

| Indicador | Definición |
|---|---|
| Solicitudes por estado | `COUNT(*) GROUP BY status` |
| Por categoría | `COUNT(*) GROUP BY categoryId` (opcional filtrar por estado) |
| **Backlog** | solicitudes en `ABIERTA`, `ASIGNADA`, `EN_PROGRESO`, `EN_ESPERA` (no resueltas ni cerradas); además se informa el subconjunto `ABIERTA` (sin asignar) |
| Carga por técnico | por técnico activo: nº de solicitudes abiertas (excluye `RESUELTA`/`CERRADA`) desglosado por estado, incluidos técnicos con 0 |
| Tiempo medio de resolución | `AVG(resolvedAt − createdAt)` sobre tickets con `resolvedAt` dentro del rango, en horas |
| Cumplimiento de SLA | `COUNT(resolvedAt ≤ dueAt) / COUNT(resolvedAt IS NOT NULL)` en el rango; se informa también el total de vencidos sin resolver (`now > dueAt` y sin `resolvedAt`) |

Todas con filtros `from`/`to` (ISO) donde aplica; consultas parametrizadas de Prisma (`groupBy`; `$queryRaw` con *tagged template* solo si es imprescindible, nunca concatenación).

## 8. Plan de semillas

Dos perfiles idempotentes (`upsert` por claves naturales). Ambos **se niegan a ejecutarse con `NODE_ENV=production`**. Contraseña de todos los usuarios ficticios: `SEED_DEFAULT_PASSWORD` (hasheada con argon2id; nunca en el código).

**`seed:base`** (Etapa 2, también usado por pruebas de integración):

| Dato | Contenido |
|---|---|
| `SlaPolicy` | CRITICA 8 h · ALTA 24 h · MEDIA 72 h · BAJA 120 h (propuesta, Q-1) |
| `Category` | Soporte de equipos · Redes y conectividad · Cuentas y accesos · Software y licencias · Plataformas académicas · Correo y colaboración · Otros (Q-2) |
| `User` (dominio `@siga-ti.test`, TLD reservado, sin riesgo de correo real) | 1 admin (`admin@`), 1 supervisor (`supervisor@`), 3 técnicos (`tecnico1..3@`), 5 solicitantes (`solicitante1..5@`) con nombres ficticios |

**`seed:demo`** (Etapa 4): ≈ 30 solicitudes creadas **a través de los casos de uso** (para que el historial sea válido), con `Clock` controlado en los últimos 30 días y semilla fija; cubre todos los estados, algunas vencidas, una reabierta y comentarios públicos/internos.

Comandos previstos: `pnpm db:up`, `pnpm db:migrate`, `pnpm db:seed` (base), `pnpm db:seed:demo`, `pnpm db:reset` (solo desarrollo).

## 9. Docker Compose (diseño)

Servicio `db` con `postgres:18-alpine`, volumen nombrado, puerto en `127.0.0.1` y credenciales desde `.env`. Un script de inicialización crea además `siga_ti_test` para las pruebas de integración.
