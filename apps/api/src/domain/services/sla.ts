import type { TicketStatus } from '@siga/shared';

const MS_PER_HOUR = 3_600_000;

export const OPEN_STATUSES: readonly TicketStatus[] = [
  'ABIERTA',
  'ASIGNADA',
  'EN_PROGRESO',
  'EN_ESPERA',
];

export const computeDueAt = (createdAt: Date, resolutionHours: number): Date =>
  new Date(createdAt.getTime() + resolutionHours * MS_PER_HOUR);

export const isOverdue = (
  ticket: { readonly status: TicketStatus; readonly dueAt: Date },
  now: Date,
): boolean => OPEN_STATUSES.includes(ticket.status) && now.getTime() > ticket.dueAt.getTime();
