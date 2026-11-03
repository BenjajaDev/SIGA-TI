import {
  findTransitionRule,
  partiesOf,
  type TicketActorContext,
  type TicketStatus,
} from '@siga/shared';
import type { Actor, Ticket } from '../entities';
import { ConflictError, ForbiddenError, ValidationError } from '../errors';

const contextOf = (actor: Actor, ticket: Ticket): TicketActorContext => ({
  role: actor.role,
  userId: actor.id,
  requesterId: ticket.requester.id,
  assigneeId: ticket.assignee?.id ?? null,
});

export const assertTransition = (
  actor: Actor,
  ticket: Ticket,
  to: TicketStatus,
  note: string | undefined,
): void => {
  const parties = partiesOf(contextOf(actor, ticket));
  if (parties.length === 0) throw new ForbiddenError();

  const rule = findTransitionRule(ticket.status, to);
  if (rule === undefined) {
    throw new ConflictError('INVALID_TRANSITION', `No se puede pasar de ${ticket.status} a ${to}`);
  }
  if (!parties.some((party) => rule.allowedParties.includes(party))) throw new ForbiddenError();
  if (rule.noteRequired && note === undefined) {
    throw new ValidationError('Datos inválidos', [
      { path: 'note', message: 'La nota es obligatoria para esta transición' },
    ]);
  }
};

export interface TicketTimestamps {
  readonly resolvedAt: Date | null;
  readonly closedAt: Date | null;
}

export const timestampsAfter = (ticket: Ticket, to: TicketStatus, now: Date): TicketTimestamps => {
  if (to === 'RESUELTA') return { resolvedAt: now, closedAt: null };
  if (to === 'CERRADA') return { resolvedAt: ticket.resolvedAt, closedAt: now };
  if (ticket.status === 'RESUELTA') return { resolvedAt: null, closedAt: null };
  return { resolvedAt: ticket.resolvedAt, closedAt: ticket.closedAt };
};
