# SIGA-TI — Esquemas Zod propuestos para `packages/shared` (solo definiciones)

Zod 4.6. Fuente única para: validación en API, formularios web (`zodResolver`), tipos (`z.infer`) y OpenAPI (`.meta({ id })` registra el esquema en `components/schemas`). Cada archivo exporta el esquema **y** su tipo inferido. Los nombres coinciden con `openapi.yaml`.

Convenciones: `z.strictObject` en entradas (rechaza campos desconocidos); fechas como `z.iso.datetime()` en el contrato (cadenas ISO-8601 UTC); mensajes de validación en español; los campos de salida nunca incluyen `passwordHash` ni datos internos.

## `enums.ts`

```ts
import { z } from 'zod';

export const ROLES = ['SOLICITANTE', 'TECNICO', 'SUPERVISOR', 'ADMIN'] as const;
export const TICKET_STATUSES = ['ABIERTA', 'ASIGNADA', 'EN_PROGRESO', 'EN_ESPERA', 'RESUELTA', 'CERRADA'] as const;
export const PRIORITIES = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as const;
export const TICKET_EVENT_TYPES = ['CREATED', 'ASSIGNED', 'REASSIGNED', 'STATUS_CHANGED'] as const;
export const COMMENT_VISIBILITIES = ['PUBLICO', 'INTERNO'] as const;
export const TRANSITION_TARGETS = ['EN_PROGRESO', 'EN_ESPERA', 'RESUELTA', 'CERRADA'] as const;

export const roleSchema = z.enum(ROLES).meta({ id: 'Role' });
export const ticketStatusSchema = z.enum(TICKET_STATUSES).meta({ id: 'TicketStatus' });
export const prioritySchema = z.enum(PRIORITIES).meta({ id: 'Priority' });
export const ticketEventTypeSchema = z.enum(TICKET_EVENT_TYPES).meta({ id: 'TicketEventType' });
export const commentVisibilitySchema = z.enum(COMMENT_VISIBILITIES).meta({ id: 'CommentVisibility' });

export type Role = z.infer<typeof roleSchema>;
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type TicketEventType = z.infer<typeof ticketEventTypeSchema>;
export type CommentVisibility = z.infer<typeof commentVisibilitySchema>;
```

## `common.ts`

```ts
import { z } from 'zod';

export const uuidSchema = z.uuid({ error: 'Identificador inválido' });
export const isoDateTimeSchema = z.iso.datetime({ error: 'Fecha inválida (ISO-8601)' });

export const userSummarySchema = z
  .object({ id: uuidSchema, fullName: z.string() })
  .meta({ id: 'UserSummary' });

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const pageMetaSchema = z
  .object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  })
  .meta({ id: 'PageMeta' });

export const paginated = <T extends z.ZodType>(item: T) =>
  pageMetaSchema.extend({ items: z.array(item) });

export type UserSummary = z.infer<typeof userSummarySchema>;
export type PageQuery = z.infer<typeof pageQuerySchema>;
```

## `errors.ts`

```ts
import { z } from 'zod';

export const ERROR_CODES = [
  'VALIDATION_ERROR', 'UNAUTHENTICATED', 'INVALID_CREDENTIALS', 'TOKEN_EXPIRED',
  'FORBIDDEN', 'NOT_FOUND', 'INVALID_TRANSITION', 'INVALID_ASSIGNEE',
  'CONCURRENT_MODIFICATION', 'TICKET_CLOSED', 'DUPLICATE_RESOURCE', 'SELF_PROTECTION',
  'RATE_LIMITED', 'INTERNAL_ERROR',
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES).meta({ id: 'ErrorCode' });

export const errorResponseSchema = z
  .object({
    error: z.object({
      code: errorCodeSchema,
      message: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })),
      requestId: z.uuid(),
    }),
  })
  .meta({ id: 'ErrorResponse' });

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
```

## `auth.ts` y `users.ts`

```ts
// auth.ts
export const loginRequestSchema = z
  .strictObject({
    email: z.email({ error: 'Correo inválido' }).max(254).transform((v) => v.toLowerCase()),
    password: z.string().min(1, 'La contraseña es obligatoria').max(128),
  })
  .meta({ id: 'LoginRequest' });

export const authSessionSchema = z
  .object({ accessToken: z.string(), expiresIn: z.number().int().positive(), user: userSchema })
  .meta({ id: 'AuthSession' });

// users.ts
export const userSchema = z
  .object({
    id: uuidSchema, email: z.email(), fullName: z.string(), role: roleSchema,
    isActive: z.boolean(), createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'User' });

export const createUserRequestSchema = z
  .strictObject({
    email: z.email().max(254).transform((v) => v.toLowerCase()),
    fullName: z.string().trim().min(2).max(120),
    role: roleSchema,
    password: z.string().min(12, 'Mínimo 12 caracteres').max(128),
  })
  .meta({ id: 'CreateUserRequest' });

export const updateUserRequestSchema = z
  .strictObject({
    fullName: z.string().trim().min(2).max(120).optional(),
    role: roleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Debe indicar al menos un campo')
  .meta({ id: 'UpdateUserRequest' });

export const listUsersQuerySchema = pageQuerySchema.extend({
  role: roleSchema.optional(),
  isActive: z.stringbool().optional(),
});
```

## `categories.ts`

```ts
export const categorySchema = z
  .object({ id: uuidSchema, name: z.string(), description: z.string().nullable(), isActive: z.boolean() })
  .meta({ id: 'Category' });

export const createCategoryRequestSchema = z
  .strictObject({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(255).optional() })
  .meta({ id: 'CreateCategoryRequest' });

export const updateCategoryRequestSchema = z
  .strictObject({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(255).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Debe indicar al menos un campo')
  .meta({ id: 'UpdateCategoryRequest' });

export const listCategoriesQuerySchema = z.object({ includeInactive: z.stringbool().default(false) });
```

## `tickets.ts`

```ts
const TICKET_CODE_PATTERN = /^SIGA-\d{6,}$/;

export const allowedActionsSchema = z.object({
  canAssign: z.boolean(),
  transitions: z.array(ticketStatusSchema),
  canComment: z.boolean(),
  canCommentInternal: z.boolean(),
});

export const ticketSchema = z
  .object({
    id: uuidSchema,
    code: z.string().regex(TICKET_CODE_PATTERN),
    title: z.string(),
    description: z.string(),
    category: z.object({ id: uuidSchema, name: z.string() }),
    priority: prioritySchema,
    status: ticketStatusSchema,
    requester: userSummarySchema,
    assignee: userSummarySchema.nullable(),
    dueAt: isoDateTimeSchema,
    isOverdue: z.boolean(),
    resolvedAt: isoDateTimeSchema.nullable(),
    closedAt: isoDateTimeSchema.nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    allowedActions: allowedActionsSchema,
  })
  .meta({ id: 'Ticket' });

export const createTicketRequestSchema = z
  .strictObject({
    title: z.string().trim().min(5, 'Mínimo 5 caracteres').max(120),
    description: z.string().trim().min(10, 'Mínimo 10 caracteres').max(5000),
    categoryId: uuidSchema,
    priority: prioritySchema,
    requesterId: uuidSchema.optional(),
  })
  .meta({ id: 'CreateTicketRequest' });

export const assignTicketRequestSchema = z
  .strictObject({ assigneeId: uuidSchema })
  .meta({ id: 'AssignTicketRequest' });

export const transitionTicketRequestSchema = z
  .strictObject({
    to: z.enum(TRANSITION_TARGETS),
    note: z.string().trim().min(3).max(1000).optional(),
  })
  .meta({ id: 'TransitionTicketRequest' });

export const TICKET_SORTS = ['createdAt', '-createdAt', 'dueAt', '-dueAt', 'priority', '-priority'] as const;

export const listTicketsQuerySchema = pageQuerySchema
  .extend({
    status: ticketStatusSchema.optional(),
    priority: prioritySchema.optional(),
    categoryId: uuidSchema.optional(),
    assigneeId: uuidSchema.optional(),
    unassigned: z.stringbool().optional(),
    sort: z.enum(TICKET_SORTS).default('-createdAt'),
  })
  .refine((q) => !(q.unassigned && q.assigneeId), {
    path: ['unassigned'],
    error: 'No puede combinar "sin asignar" con un técnico',
  });

export const ticketPageSchema = paginated(ticketSchema).meta({ id: 'TicketPage' });
```

La regla "`note` obligatoria para `EN_ESPERA`, `RESUELTA` y reabrir" depende del estado actual, por lo que se valida en el dominio (400 `VALIDATION_ERROR` con `path: "note"`), no en el esquema.

## `events.ts` y `comments.ts`

```ts
// events.ts
export const ticketEventSchema = z
  .object({
    id: uuidSchema,
    type: ticketEventTypeSchema,
    actor: userSummarySchema,
    fromStatus: ticketStatusSchema.nullable(),
    toStatus: ticketStatusSchema.nullable(),
    fromAssignee: userSummarySchema.nullable(),
    toAssignee: userSummarySchema.nullable(),
    note: z.string().nullable(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'TicketEvent' });

// comments.ts
export const commentSchema = z
  .object({
    id: uuidSchema, author: userSummarySchema, body: z.string(),
    visibility: commentVisibilitySchema, createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'Comment' });

export const createCommentRequestSchema = z
  .strictObject({
    body: z.string().trim().min(1).max(2000),
    visibility: commentVisibilitySchema.default('PUBLICO'),
  })
  .meta({ id: 'CreateCommentRequest' });
```

## `dashboard.ts`

```ts
export const statusCountSchema = z.object({ status: ticketStatusSchema, count: z.number().int().min(0) });

export const dashboardSummarySchema = z
  .object({
    total: z.number().int().min(0),
    byStatus: z.array(statusCountSchema),
    backlog: z.number().int().min(0),
    unassigned: z.number().int().min(0),
    overdue: z.number().int().min(0),
  })
  .meta({ id: 'DashboardSummary' });

export const categoryCountSchema = z.object({
  category: z.object({ id: uuidSchema, name: z.string() }),
  count: z.number().int().min(0),
});

export const technicianWorkloadSchema = z.object({
  technician: userSummarySchema,
  openTotal: z.number().int().min(0),
  byStatus: z.array(statusCountSchema),
});

export const resolutionQuerySchema = z
  .object({ from: isoDateTimeSchema.optional(), to: isoDateTimeSchema.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { path: ['from'], error: '"from" debe ser anterior a "to"' });

export const resolutionMetricsSchema = z
  .object({
    from: isoDateTimeSchema, to: isoDateTimeSchema,
    resolvedCount: z.number().int().min(0),
    averageResolutionHours: z.number().min(0).nullable(),
    slaCompliancePercent: z.number().min(0).max(100).nullable(),
    withinSlaCount: z.number().int().min(0),
    breachedCount: z.number().int().min(0),
  })
  .meta({ id: 'ResolutionMetrics' });
```

## `index.ts`

Reexporta todo lo anterior (`export * from './enums'`, …). Sin lógica.

## Notas de diseño

- `shared` no depende de Express ni de Prisma; sí de `zod`. El dominio de la API importa **solo** `enums.ts` (constantes y tipos).
- Los enums de Prisma se verifican contra estos en tiempo de compilación (ADR-019) con aserciones del tipo `satisfies Record<PrismaRole, true>`.
- La generación OpenAPI registra los esquemas con `OpenApiGeneratorV31`; la prueba de contrato compara el resultado con `docs/openapi.yaml`.
