import type { TicketStatus } from '@siga/shared';
import type { Actor, Ticket } from '../../../domain/entities';
import { ConflictError } from '../../../domain/errors';
import type { Clock } from '../../../domain/ports/security';
import type { TicketRepository } from '../../../domain/ports/ticket-repository';
import { assertCanView } from '../../../domain/services/ticket-access-policy';
import { statusChangedEvent } from '../../../domain/services/ticket-events';
import { assertTransition, timestampsAfter } from '../../../domain/services/ticket-state-machine';

export interface TransitionTicketInput {
  readonly actor: Actor;
  readonly ticketId: string;
  readonly to: TicketStatus;
  readonly note?: string | undefined;
}

export class TransitionTicketUseCase {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: TransitionTicketInput): Promise<Ticket> {
    const { actor, to, note } = input;
    const ticket = assertCanView(actor, await this.tickets.findById(input.ticketId));
    assertTransition(actor, ticket, to, note);

    const now = this.clock.now();
    const assigneeId = ticket.assignee?.id ?? null;
    const updated = await this.tickets.saveWithEvent(
      {
        ticketId: ticket.id,
        expected: { status: ticket.status, assigneeId },
        next: { status: to, assigneeId, ...timestampsAfter(ticket, to, now) },
      },
      statusChangedEvent(actor.id, ticket.status, to, note ?? null, now),
    );
    if (updated === null) {
      throw new ConflictError(
        'CONCURRENT_MODIFICATION',
        'La solicitud fue modificada por otro usuario',
      );
    }
    return updated;
  }
}
