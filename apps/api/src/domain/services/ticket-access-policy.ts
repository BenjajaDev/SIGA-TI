import {
  canComment as sharedCanComment,
  canWriteInternalComment,
  type TicketActorContext,
} from '@siga/shared';
import { ForbiddenError, NotFoundError } from '../errors';
import type { Actor, Ticket } from '../entities';

export type VisibilityScope =
  { readonly kind: 'all' } | { readonly kind: 'involved'; readonly userId: string };

const isStaffWithFullView = (actor: Actor): boolean =>
  actor.role === 'SUPERVISOR' || actor.role === 'ADMIN';

export const visibilityScopeFor = (actor: Actor): VisibilityScope =>
  isStaffWithFullView(actor) ? { kind: 'all' } : { kind: 'involved', userId: actor.id };

export const isRequester = (actor: Actor, ticket: Ticket): boolean =>
  ticket.requester.id === actor.id;

export const isAssignedTechnician = (actor: Actor, ticket: Ticket): boolean =>
  actor.role === 'TECNICO' && ticket.assignee?.id === actor.id;

export const canView = (actor: Actor, ticket: Ticket): boolean =>
  isStaffWithFullView(actor) || isRequester(actor, ticket) || ticket.assignee?.id === actor.id;

export const assertCanView = (actor: Actor, ticket: Ticket | null): Ticket => {
  if (ticket === null || !canView(actor, ticket)) throw new NotFoundError('Solicitud');
  return ticket;
};

export const canReadInternalComments = (actor: Actor, ticket: Ticket): boolean =>
  isStaffWithFullView(actor) || isAssignedTechnician(actor, ticket);

const contextOf = (actor: Actor, ticket: Ticket): TicketActorContext => ({
  role: actor.role,
  userId: actor.id,
  requesterId: ticket.requester.id,
  assigneeId: ticket.assignee?.id ?? null,
});

export const canWriteInternalComments = (actor: Actor, ticket: Ticket): boolean =>
  canWriteInternalComment(contextOf(actor, ticket), 'ABIERTA');

export const canComment = (actor: Actor, ticket: Ticket): boolean =>
  sharedCanComment(contextOf(actor, ticket), 'ABIERTA');

export const assertSupervisor = (actor: Actor): void => {
  if (actor.role !== 'SUPERVISOR') throw new ForbiddenError();
};

export const assertSupervisorOrAdmin = (actor: Actor): void => {
  if (!isStaffWithFullView(actor)) throw new ForbiddenError();
};

export const assertAdmin = (actor: Actor): void => {
  if (actor.role !== 'ADMIN') throw new ForbiddenError();
};
