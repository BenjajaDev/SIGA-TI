import type { Priority } from '@siga/shared';
import type { Actor, Ticket } from '../../../domain/entities';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';
import type {
  CategoryRepository,
  SlaPolicyRepository,
} from '../../../domain/ports/catalog-repositories';
import type { Clock } from '../../../domain/ports/security';
import type { TicketRepository } from '../../../domain/ports/ticket-repository';
import type { UserRepository } from '../../../domain/ports/user-repository';
import { computeDueAt } from '../../../domain/services/sla';
import { createdEvent } from '../../../domain/services/ticket-events';

export interface CreateTicketInput {
  readonly actor: Actor;
  readonly title: string;
  readonly description: string;
  readonly categoryId: string;
  readonly priority: Priority;
  readonly requesterId?: string | undefined;
}

export class CreateTicketUseCase {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly users: UserRepository,
    private readonly categories: CategoryRepository,
    private readonly slaPolicies: SlaPolicyRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateTicketInput): Promise<Ticket> {
    const { actor } = input;
    if (actor.role === 'ADMIN') throw new ForbiddenError();
    if (input.requesterId !== undefined && actor.role !== 'SUPERVISOR') throw new ForbiddenError();

    const requesterId = input.requesterId ?? actor.id;
    const requester = await this.users.findById(requesterId);
    if (requester?.isActive !== true || requester.role === 'ADMIN') {
      throw new NotFoundError('Solicitante');
    }

    const category = await this.categories.findById(input.categoryId);
    if (category?.isActive !== true) throw new NotFoundError('Categoría');

    const hours = await this.slaPolicies.findResolutionHours(input.priority);
    if (hours === null) throw new Error(`Falta la política de SLA para ${input.priority}`);

    const now = this.clock.now();
    return this.tickets.createWithEvent(
      {
        title: input.title,
        description: input.description,
        categoryId: category.id,
        priority: input.priority,
        requesterId: requester.id,
        dueAt: computeDueAt(now, hours),
        createdAt: now,
      },
      createdEvent(actor.id, now),
    );
  }
}
