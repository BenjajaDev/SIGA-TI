import { z } from 'zod';

export const ROLES = ['SOLICITANTE', 'TECNICO', 'SUPERVISOR', 'ADMIN'] as const;
export const TICKET_STATUSES = [
  'ABIERTA',
  'ASIGNADA',
  'EN_PROGRESO',
  'EN_ESPERA',
  'RESUELTA',
  'CERRADA',
] as const;
export const PRIORITIES = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as const;
export const TICKET_EVENT_TYPES = ['CREATED', 'ASSIGNED', 'REASSIGNED', 'STATUS_CHANGED'] as const;
export const COMMENT_VISIBILITIES = ['PUBLICO', 'INTERNO'] as const;
export const TRANSITION_TARGETS = ['EN_PROGRESO', 'EN_ESPERA', 'RESUELTA', 'CERRADA'] as const;

export const roleSchema = z.enum(ROLES).meta({ id: 'Role' });
export const ticketStatusSchema = z.enum(TICKET_STATUSES).meta({ id: 'TicketStatus' });
export const prioritySchema = z.enum(PRIORITIES).meta({ id: 'Priority' });
export const ticketEventTypeSchema = z.enum(TICKET_EVENT_TYPES).meta({ id: 'TicketEventType' });
export const commentVisibilitySchema = z
  .enum(COMMENT_VISIBILITIES)
  .meta({ id: 'CommentVisibility' });

export type Role = z.infer<typeof roleSchema>;
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type TicketEventType = z.infer<typeof ticketEventTypeSchema>;
export type CommentVisibility = z.infer<typeof commentVisibilitySchema>;
export type TransitionTarget = (typeof TRANSITION_TARGETS)[number];
