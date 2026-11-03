import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  assignTicketRequestSchema,
  authSessionSchema,
  categoryListSchema,
  categoryCountListSchema,
  commentListSchema,
  commentSchema,
  createCommentRequestSchema,
  createTicketRequestSchema,
  dashboardSummarySchema,
  errorResponseSchema,
  listTicketsQuerySchema,
  listUsersQuerySchema,
  loginRequestSchema,
  resolutionMetricsSchema,
  resolutionQuerySchema,
  ticketEventListSchema,
  ticketIdParamsSchema,
  ticketPageSchema,
  ticketSchema,
  transitionTicketRequestSchema,
  userListSchema,
  userSchema,
  workloadListSchema,
} from '@siga/shared';

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 429;

const ERROR_DESCRIPTIONS: Readonly<Record<ErrorStatus | 500, string>> = {
  400: 'Entrada inválida (VALIDATION_ERROR). `details` lista campo y mensaje.',
  401: 'No autenticado (UNAUTHENTICATED, INVALID_CREDENTIALS).',
  403: 'El rol o el actor no tiene permiso (FORBIDDEN).',
  404: 'No existe o no es visible para el usuario (NOT_FOUND).',
  409: 'Regla de negocio (INVALID_TRANSITION, INVALID_ASSIGNEE, CONCURRENT_MODIFICATION, TICKET_CLOSED).',
  429: 'Demasiadas peticiones (RATE_LIMITED).',
  500: 'Error interno (INTERNAL_ERROR); el detalle solo queda en logs.',
};

interface RouteSpec {
  readonly method: 'get' | 'post' | 'put';
  readonly path: string;
  readonly operationId: string;
  readonly tag: string;
  readonly summary: string;
  readonly description?: string;
  readonly secured?: boolean;
  readonly params?: z.ZodObject;
  readonly query?: z.ZodObject;
  readonly body?: z.ZodType;
  readonly success: { readonly status: 200 | 201 | 204; readonly schema?: z.ZodType };
  readonly errors: readonly ErrorStatus[];
}

const jsonContent = (schema: z.ZodType) => ({ 'application/json': { schema } });

const registerRoute = (registry: OpenAPIRegistry, spec: RouteSpec): void => {
  const errorResponses = Object.fromEntries(
    [...spec.errors, 500 as const].map((status) => [
      status,
      { description: ERROR_DESCRIPTIONS[status], content: jsonContent(errorResponseSchema) },
    ]),
  );
  registry.registerPath({
    method: spec.method,
    path: spec.path,
    operationId: spec.operationId,
    tags: [spec.tag],
    summary: spec.summary,
    ...(spec.description !== undefined && { description: spec.description }),
    ...(spec.secured !== false && { security: [{ bearerAuth: [] }] }),
    request: {
      ...(spec.params !== undefined && { params: spec.params }),
      ...(spec.query !== undefined && { query: spec.query }),
      ...(spec.body !== undefined && {
        body: { required: true, content: jsonContent(spec.body) },
      }),
    },
    responses: {
      [spec.success.status]: {
        description: 'Respuesta exitosa',
        ...(spec.success.schema !== undefined && { content: jsonContent(spec.success.schema) }),
      },
      ...errorResponses,
    },
  });
};

const ROUTES: readonly RouteSpec[] = [
  {
    method: 'post',
    path: '/auth/login',
    operationId: 'login',
    tag: 'auth',
    summary: 'Ingreso con identidad simulada (RF-01)',
    description:
      'Limitado por IP (429). Responde igual ante usuario inexistente o clave errónea. Establece la cookie httpOnly `siga_rt` (refresh token).',
    secured: false,
    body: loginRequestSchema,
    success: { status: 200, schema: authSessionSchema },
    errors: [400, 401, 429],
  },
  {
    method: 'post',
    path: '/auth/refresh',
    operationId: 'refreshSession',
    tag: 'auth',
    summary: 'Renueva la sesión rotando el refresh token (RF-03)',
    description:
      'Lee la cookie `siga_rt` y la rota. Reutilizar un token ya rotado revoca todas las sesiones del usuario.',
    secured: false,
    success: { status: 200, schema: authSessionSchema },
    errors: [401],
  },
  {
    method: 'post',
    path: '/auth/logout',
    operationId: 'logout',
    tag: 'auth',
    summary: 'Cierra la sesión y revoca el refresh token (RF-03)',
    description: 'Idempotente; limpia la cookie aunque el token sea inválido.',
    secured: false,
    success: { status: 204 },
    errors: [],
  },
  {
    method: 'get',
    path: '/auth/me',
    operationId: 'getCurrentUser',
    tag: 'auth',
    summary: 'Usuario autenticado',
    success: { status: 200, schema: userSchema },
    errors: [401],
  },
  {
    method: 'post',
    path: '/tickets',
    operationId: 'createTicket',
    tag: 'tickets',
    summary: 'Registrar solicitud (RF-04)',
    description:
      'Roles: SOLICITANTE, TECNICO, SUPERVISOR. `requesterId` (registro a nombre de otro) solo lo acepta el SUPERVISOR. Calcula `dueAt` con la política SLA de la prioridad y crea el evento CREATED.',
    body: createTicketRequestSchema,
    success: { status: 201, schema: ticketSchema },
    errors: [400, 401, 403, 404],
  },
  {
    method: 'get',
    path: '/tickets',
    operationId: 'listTickets',
    tag: 'tickets',
    summary: 'Listar con filtros y paginación (RF-05)',
    description:
      'Solo devuelve las solicitudes visibles: solicitante y técnico, las propias o asignadas a ellos; supervisor y admin, todas. Orden: más recientes primero.',
    query: listTicketsQuerySchema,
    success: { status: 200, schema: ticketPageSchema },
    errors: [400, 401],
  },
  {
    method: 'get',
    path: '/tickets/{ticketId}',
    operationId: 'getTicket',
    tag: 'tickets',
    summary: 'Detalle de solicitud',
    params: ticketIdParamsSchema,
    success: { status: 200, schema: ticketSchema },
    errors: [400, 401, 404],
  },
  {
    method: 'put',
    path: '/tickets/{ticketId}/assignment',
    operationId: 'assignTicket',
    tag: 'tickets',
    summary: 'Asignar o reasignar a un técnico (RF-06)',
    description:
      'Solo SUPERVISOR. El destino debe ser un TECNICO activo (409 INVALID_ASSIGNEE). En ABIERTA pasa a ASIGNADA (evento ASSIGNED). En ASIGNADA, EN_PROGRESO o EN_ESPERA solo cambia el técnico (evento REASSIGNED). En RESUELTA o CERRADA responde 409 INVALID_TRANSITION.',
    params: ticketIdParamsSchema,
    body: assignTicketRequestSchema,
    success: { status: 200, schema: ticketSchema },
    errors: [400, 401, 403, 404, 409],
  },
  {
    method: 'post',
    path: '/tickets/{ticketId}/transitions',
    operationId: 'transitionTicket',
    tag: 'tickets',
    summary: 'Cambiar estado (RF-07, RF-13)',
    description:
      'Transiciones y actores permitidos en docs/data-model.md §3. `ASIGNADA` solo se alcanza al asignar. `note` es obligatoria para EN_ESPERA, RESUELTA y reabrir. Si dos usuarios compiten, el perdedor recibe 409 CONCURRENT_MODIFICATION.',
    params: ticketIdParamsSchema,
    body: transitionTicketRequestSchema,
    success: { status: 200, schema: ticketSchema },
    errors: [400, 401, 403, 404, 409],
  },
  {
    method: 'get',
    path: '/tickets/{ticketId}/events',
    operationId: 'listTicketEvents',
    tag: 'tickets',
    summary: 'Historial inmutable (RF-08)',
    description: 'Orden cronológico ascendente.',
    params: ticketIdParamsSchema,
    success: { status: 200, schema: ticketEventListSchema },
    errors: [400, 401, 404],
  },
  {
    method: 'get',
    path: '/tickets/{ticketId}/comments',
    operationId: 'listTicketComments',
    tag: 'tickets',
    summary: 'Comentarios (RF-09)',
    description: 'Los INTERNO solo se devuelven a técnico asignado, supervisor y admin.',
    params: ticketIdParamsSchema,
    success: { status: 200, schema: commentListSchema },
    errors: [400, 401, 404],
  },
  {
    method: 'post',
    path: '/tickets/{ticketId}/comments',
    operationId: 'addTicketComment',
    tag: 'tickets',
    summary: 'Agregar comentario (RF-09)',
    description:
      'El solicitante solo puede publicar PUBLICO. No se comenta una solicitud CERRADA (409 TICKET_CLOSED).',
    params: ticketIdParamsSchema,
    body: createCommentRequestSchema,
    success: { status: 201, schema: commentSchema },
    errors: [400, 401, 403, 404, 409],
  },
  {
    method: 'get',
    path: '/dashboard/summary',
    operationId: 'getDashboardSummary',
    tag: 'dashboard',
    summary: 'Solicitudes por estado y backlog (RF-10)',
    description: 'Roles SUPERVISOR y ADMIN.',
    success: { status: 200, schema: dashboardSummarySchema },
    errors: [401, 403],
  },
  {
    method: 'get',
    path: '/dashboard/by-category',
    operationId: 'getDashboardByCategory',
    tag: 'dashboard',
    summary: 'Solicitudes por categoría (RF-10)',
    description: 'Roles SUPERVISOR y ADMIN.',
    success: { status: 200, schema: categoryCountListSchema },
    errors: [401, 403],
  },
  {
    method: 'get',
    path: '/dashboard/workload',
    operationId: 'getDashboardWorkload',
    tag: 'dashboard',
    summary: 'Carga por técnico (RF-10)',
    description: 'Roles SUPERVISOR y ADMIN. Incluye técnicos activos sin carga.',
    success: { status: 200, schema: workloadListSchema },
    errors: [401, 403],
  },
  {
    method: 'get',
    path: '/dashboard/resolution',
    operationId: 'getDashboardResolution',
    tag: 'dashboard',
    summary: 'Tiempo medio de resolución y cumplimiento de SLA (RF-11)',
    description:
      'Roles SUPERVISOR y ADMIN. Solicitudes con `resolvedAt` dentro del rango (por defecto, últimos 30 días).',
    query: resolutionQuerySchema,
    success: { status: 200, schema: resolutionMetricsSchema },
    errors: [400, 401, 403],
  },
  {
    method: 'get',
    path: '/categories',
    operationId: 'listCategories',
    tag: 'categories',
    summary: 'Listar categorías activas',
    success: { status: 200, schema: categoryListSchema },
    errors: [401],
  },
  {
    method: 'get',
    path: '/users',
    operationId: 'listUsers',
    tag: 'users',
    summary: 'Listar usuarios (para elegir técnico al asignar)',
    description: 'Roles SUPERVISOR y ADMIN. Sin paginación (prototipo).',
    query: listUsersQuerySchema,
    success: { status: 200, schema: userListSchema },
    errors: [400, 401, 403],
  },
];

export const buildOpenApiDocument = () => {
  const registry = new OpenAPIRegistry();
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });
  for (const route of ROUTES) registerRoute(registry, route);
  registry.registerPath({
    method: 'get',
    path: '/health',
    operationId: 'getHealth',
    tags: ['health'],
    summary: 'Liveness',
    responses: {
      200: {
        description: 'Proceso vivo',
        content: jsonContent(z.object({ status: z.literal('ok') })),
      },
    },
  });
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'SIGA-TI API',
      version: '0.1.0',
      description:
        'Sistema de Gestión de Solicitudes TI (prototipo, datos ficticios). Documento generado desde los esquemas Zod de `packages/shared`: no editar a mano (`pnpm openapi:generate`).',
    },
    servers: [{ url: '/api/v1', description: 'API' }],
  });
};
