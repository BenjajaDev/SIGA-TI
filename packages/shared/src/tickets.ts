import { z } from 'zod';
import {
  isoDateTimeSchema,
  pageQuerySchema,
  paginated,
  userSummarySchema,
  uuidSchema,
} from './common';
import { prioritySchema, ticketStatusSchema, TRANSITION_TARGETS } from './enums';

export const TICKET_CODE_PATTERN = /^SIGA-\d{6,}$/;

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
  })
  .meta({ id: 'Ticket' });

export const createTicketRequestSchema = z
  .strictObject({
    title: z.string().trim().min(5, 'Mínimo 5 caracteres').max(120, 'Máximo 120 caracteres'),
    description: z
      .string()
      .trim()
      .min(10, 'Mínimo 10 caracteres')
      .max(5000, 'Máximo 5000 caracteres'),
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
    note: z.string().trim().min(3, 'Mínimo 3 caracteres').max(1000).optional(),
  })
  .meta({ id: 'TransitionTicketRequest' });

export const listTicketsQuerySchema = pageQuerySchema.extend({
  status: ticketStatusSchema.optional(),
  priority: prioritySchema.optional(),
  categoryId: uuidSchema.optional(),
  assigneeId: uuidSchema.optional(),
});

export const ticketPageSchema = paginated(ticketSchema);

export const ticketIdParamsSchema = z.object({ ticketId: uuidSchema });

export type Ticket = z.infer<typeof ticketSchema>;
export type CreateTicketRequest = z.infer<typeof createTicketRequestSchema>;
export type AssignTicketRequest = z.infer<typeof assignTicketRequestSchema>;
export type TransitionTicketRequest = z.infer<typeof transitionTicketRequestSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type CreateTicketInput = z.input<typeof createTicketRequestSchema>;
