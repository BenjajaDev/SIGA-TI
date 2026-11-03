import type { Actor, Ticket } from '../../../domain/entities';
import type {
  Page,
  PageRequest,
  TicketFilter,
  TicketRepository,
} from '../../../domain/ports/ticket-repository';
import { visibilityScopeFor } from '../../../domain/services/ticket-access-policy';

export interface ListTicketsInput {
  readonly actor: Actor;
  readonly filter: TicketFilter;
  readonly page: PageRequest;
}

export class ListTicketsUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  execute(input: ListTicketsInput): Promise<Page<Ticket>> {
    return this.tickets.list(input.filter, visibilityScopeFor(input.actor), input.page);
  }
}
