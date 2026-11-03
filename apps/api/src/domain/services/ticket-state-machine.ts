import type { TicketStatus } from '@siga/shared';
import type { Actor, Ticket } from '../entities';
import { ConflictError, ForbiddenError, ValidationError } from '../errors';
import { isAssignedTechnician, isRequester } from './ticket-access-policy';

type Party = 'ASSIGNEE' | 'REQUESTER' | 'SUPERVISOR';

interface TransitionRule {
  readonly from: TicketStatus;
  readonly to: TicketStatus;
  readonly allowedParties: readonly Party[];
  readonly noteRequired: boolean;
}

const WORKER: readonly Party[] = ['ASSIGNEE', 'SUPERVISOR'];
const OWNER: readonly Party[] = ['REQUESTER', 'SUPERVISOR'];

export const TRANSITION_RULES: readonly TransitionRule[] = [
  { from: 'ASIGNADA', to: 'EN_PROGRESO', allowedParties: WORKER, noteRequired: false },
  { from: 'EN_PROGRESO', to: 'EN_ESPERA', allowedParties: WORKER, noteRequired: true },
  { from: 'EN_ESPERA', to: 'EN_PROGRESO', allowedParties: WORKER, noteRequired: false },
  { from: 'EN_PROGRESO', to: 'RESUELTA', allowedParties: WORKER, noteRequired: true },
  { from: 'RESUELTA', to: 'CERRADA', allowedParties: OWNER, noteRequired: false },
  { from: 'RESUELTA', to: 'EN_PROGRESO', allowedParties: OWNER, noteRequired: true },
];

const partiesOf = (actor: Actor, ticket: Ticket): Party[] => {
  const parties: Party[] = [];
  if (actor.role === 'SUPERVISOR') parties.push('SUPERVISOR');
  if (isAssignedTechnician(actor, ticket)) parties.push('ASSIGNEE');
  if (isRequester(actor, ticket)) parties.push('REQUESTER');
  return parties;
};

export const assertTransition = (
  actor: Actor,
  ticket: Ticket,
  to: TicketStatus,
  note: string | undefined,
): void => {
  const parties = partiesOf(actor, ticket);
  if (parties.length === 0) throw new ForbiddenError();

  const rule = TRANSITION_RULES.find((r) => r.from === ticket.status && r.to === to);
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
