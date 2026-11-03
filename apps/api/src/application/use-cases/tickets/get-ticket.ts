import type { Actor, Ticket } from '../../../domain/entities';
import type { TicketRepository } from '../../../domain/ports/ticket-repository';
import { assertCanView } from '../../../domain/services/ticket-access-policy';

export class GetTicketUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(actor: Actor, ticketId: string): Promise<Ticket> {
    return assertCanView(actor, await this.tickets.findById(ticketId));
  }
}
