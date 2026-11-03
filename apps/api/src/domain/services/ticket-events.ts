import type { TicketStatus } from '@siga/shared';
import type { NewTicketEvent } from '../ports/ticket-repository';

export const createdEvent = (actorId: string, at: Date): NewTicketEvent => ({
  type: 'CREATED',
  actorId,
  fromStatus: null,
  toStatus: 'ABIERTA',
  fromAssigneeId: null,
  toAssigneeId: null,
  note: null,
  createdAt: at,
});

export const assignedEvent = (actorId: string, toAssigneeId: string, at: Date): NewTicketEvent => ({
  type: 'ASSIGNED',
  actorId,
  fromStatus: 'ABIERTA',
  toStatus: 'ASIGNADA',
  fromAssigneeId: null,
  toAssigneeId,
  note: null,
  createdAt: at,
});

export const reassignedEvent = (
  actorId: string,
  fromAssigneeId: string,
  toAssigneeId: string,
  at: Date,
): NewTicketEvent => ({
  type: 'REASSIGNED',
  actorId,
  fromStatus: null,
  toStatus: null,
  fromAssigneeId,
  toAssigneeId,
  note: null,
  createdAt: at,
});

export const statusChangedEvent = (
  actorId: string,
  fromStatus: TicketStatus,
  toStatus: TicketStatus,
  note: string | null,
  at: Date,
): NewTicketEvent => ({
  type: 'STATUS_CHANGED',
  actorId,
  fromStatus,
  toStatus,
  fromAssigneeId: null,
  toAssigneeId: null,
  note,
  createdAt: at,
});
