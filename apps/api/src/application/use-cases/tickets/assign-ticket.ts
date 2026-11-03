import { ASSIGNABLE_STATUSES } from '@siga/shared';
import type { Actor, Ticket } from '../../../domain/entities';
import { ConflictError } from '../../../domain/errors';
import type { Clock } from '../../../domain/ports/security';
import type { TicketRepository } from '../../../domain/ports/ticket-repository';
import type { UserRepository } from '../../../domain/ports/user-repository';
import { assertCanView, assertSupervisor } from '../../../domain/services/ticket-access-policy';
import { assignedEvent, reassignedEvent } from '../../../domain/services/ticket-events';

export interface AssignTicketInput {
  readonly actor: Actor;
  readonly ticketId: string;
  readonly assigneeId: string;
}

export class AssignTicketUseCase {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: AssignTicketInput): Promise<Ticket> {
    const { actor, assigneeId } = input;
    const ticket = assertCanView(actor, await this.tickets.findById(input.ticketId));
    assertSupervisor(actor);

    const assignee = await this.users.findById(assigneeId);
    if (assignee?.isActive !== true || assignee.role !== 'TECNICO') {
      throw new ConflictError('INVALID_ASSIGNEE', 'Solo se puede asignar a un técnico activo');
    }

    const now = this.clock.now();
    const currentAssigneeId = ticket.assignee?.id ?? null;
    const isFirstAssignment = ticket.status === 'ABIERTA';

    if (!ASSIGNABLE_STATUSES.includes(ticket.status)) {
      throw new ConflictError(
        'INVALID_TRANSITION',
        `No se puede asignar una solicitud en estado ${ticket.status}`,
      );
    }
    if (currentAssigneeId === assignee.id) {
      throw new ConflictError('INVALID_ASSIGNEE', 'La solicitud ya está asignada a ese técnico');
    }

    const event =
      isFirstAssignment || currentAssigneeId === null
        ? assignedEvent(actor.id, assignee.id, now)
        : reassignedEvent(actor.id, currentAssigneeId, assignee.id, now);

    const updated = await this.tickets.saveWithEvent(
      {
        ticketId: ticket.id,
        expected: { status: ticket.status, assigneeId: currentAssigneeId },
        next: {
          status: isFirstAssignment ? 'ASIGNADA' : ticket.status,
          assigneeId: assignee.id,
          resolvedAt: ticket.resolvedAt,
          closedAt: ticket.closedAt,
        },
      },
      event,
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
