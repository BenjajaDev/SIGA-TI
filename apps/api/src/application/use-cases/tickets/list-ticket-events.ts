import type { Actor, TicketEvent } from '../../../domain/entities';
import type { TicketRepository } from '../../../domain/ports/ticket-repository';
import { assertCanView } from '../../../domain/services/ticket-access-policy';

export class ListTicketEventsUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(actor: Actor, ticketId: string): Promise<readonly TicketEvent[]> {
    assertCanView(actor, await this.tickets.findById(ticketId));
    return this.tickets.listEvents(ticketId);
  }
}
