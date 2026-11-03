import { z } from 'zod';
import { isoDateTimeSchema, itemsOf, userSummarySchema, uuidSchema } from './common';
import { ticketEventTypeSchema, ticketStatusSchema } from './enums';

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

export const ticketEventListSchema = itemsOf(ticketEventSchema);

export type TicketEvent = z.infer<typeof ticketEventSchema>;
