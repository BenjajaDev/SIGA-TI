import type { Role, TicketStatus } from './enums';

export type TransitionParty = 'ASSIGNEE' | 'REQUESTER' | 'SUPERVISOR';

export interface TransitionRule {
  readonly from: TicketStatus;
  readonly to: TicketStatus;
  readonly allowedParties: readonly TransitionParty[];
  readonly noteRequired: boolean;
}

const WORKER: readonly TransitionParty[] = ['ASSIGNEE', 'SUPERVISOR'];
const OWNER: readonly TransitionParty[] = ['REQUESTER', 'SUPERVISOR'];

export const TRANSITION_RULES: readonly TransitionRule[] = [
  { from: 'ASIGNADA', to: 'EN_PROGRESO', allowedParties: WORKER, noteRequired: false },
  { from: 'EN_PROGRESO', to: 'EN_ESPERA', allowedParties: WORKER, noteRequired: true },
  { from: 'EN_ESPERA', to: 'EN_PROGRESO', allowedParties: WORKER, noteRequired: false },
  { from: 'EN_PROGRESO', to: 'RESUELTA', allowedParties: WORKER, noteRequired: true },
  { from: 'RESUELTA', to: 'CERRADA', allowedParties: OWNER, noteRequired: false },
  { from: 'RESUELTA', to: 'EN_PROGRESO', allowedParties: OWNER, noteRequired: true },
];

export const ASSIGNABLE_STATUSES: readonly TicketStatus[] = [
  'ABIERTA',
  'ASIGNADA',
  'EN_PROGRESO',
  'EN_ESPERA',
];

export interface TicketActorContext {
  readonly role: Role;
  readonly userId: string;
  readonly requesterId: string;
  readonly assigneeId: string | null;
}

export const partiesOf = (ctx: TicketActorContext): TransitionParty[] => {
  const parties: TransitionParty[] = [];
  if (ctx.role === 'SUPERVISOR') parties.push('SUPERVISOR');
  if (ctx.role === 'TECNICO' && ctx.assigneeId === ctx.userId) parties.push('ASSIGNEE');
  if (ctx.requesterId === ctx.userId) parties.push('REQUESTER');
  return parties;
};

export const findTransitionRule = (
  from: TicketStatus,
  to: TicketStatus,
): TransitionRule | undefined =>
  TRANSITION_RULES.find((rule) => rule.from === from && rule.to === to);

export const availableTransitions = (
  status: TicketStatus,
  ctx: TicketActorContext,
): TransitionRule[] => {
  const parties = partiesOf(ctx);
  return TRANSITION_RULES.filter(
    (rule) =>
      rule.from === status && rule.allowedParties.some((allowed) => parties.includes(allowed)),
  );
};

export const canAssign = (status: TicketStatus, role: Role): boolean =>
  role === 'SUPERVISOR' && ASSIGNABLE_STATUSES.includes(status);

export const canComment = (ctx: TicketActorContext, status: TicketStatus): boolean =>
  status !== 'CERRADA' && partiesOf(ctx).length > 0;

export const canWriteInternalComment = (ctx: TicketActorContext, status: TicketStatus): boolean =>
  canComment(ctx, status) &&
  partiesOf(ctx).some((party) => party === 'SUPERVISOR' || party === 'ASSIGNEE');
