import type { Prisma } from '../generated/client';
import type { Database } from '../prisma-client';
import type { Ticket, TicketEvent } from '../../../domain/entities';
import type {
  NewTicket,
  NewTicketEvent,
  Page,
  PageRequest,
  TicketChange,
  TicketFilter,
  TicketRepository,
} from '../../../domain/ports/ticket-repository';
import type { VisibilityScope } from '../../../domain/services/ticket-access-policy';
import { eventInclude, ticketInclude, toTicket, toTicketEvent } from '../mappers';

type Tx = Prisma.TransactionClient;

const eventData = (
  ticketId: string,
  event: NewTicketEvent,
): Prisma.TicketEventUncheckedCreateInput => ({ ticketId, ...event });

const buildWhere = (filter: TicketFilter, scope: VisibilityScope): Prisma.TicketWhereInput => ({
  ...(filter.status !== undefined && { status: filter.status }),
  ...(filter.priority !== undefined && { priority: filter.priority }),
  ...(filter.categoryId !== undefined && { categoryId: filter.categoryId }),
  ...(filter.assigneeId !== undefined && { assigneeId: filter.assigneeId }),
  ...(scope.kind === 'involved' && {
    OR: [{ requesterId: scope.userId }, { assigneeId: scope.userId }],
  }),
});

export class PrismaTicketRepository implements TicketRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Ticket | null> {
    const row = await this.db.ticket.findUnique({ where: { id }, include: ticketInclude });
    return row === null ? null : toTicket(row);
  }

  async list(
    filter: TicketFilter,
    scope: VisibilityScope,
    page: PageRequest,
  ): Promise<Page<Ticket>> {
    const where = buildWhere(filter, scope);
    const [rows, totalItems] = await Promise.all([
      this.db.ticket.findMany({
        where,
        include: ticketInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      this.db.ticket.count({ where }),
    ]);
    return { items: rows.map(toTicket), totalItems };
  }

  createWithEvent(data: NewTicket, event: NewTicketEvent): Promise<Ticket> {
    return this.db.$transaction(async (tx: Tx) => {
      const row = await tx.ticket.create({ data, include: ticketInclude });
      await tx.ticketEvent.create({ data: eventData(row.id, event) });
      return toTicket(row);
    });
  }

  saveWithEvent(change: TicketChange, event: NewTicketEvent): Promise<Ticket | null> {
    return this.db.$transaction(async (tx: Tx) => {
      const { count } = await tx.ticket.updateMany({
        where: {
          id: change.ticketId,
          status: change.expected.status,
          assigneeId: change.expected.assigneeId,
        },
        data: change.next,
      });
      if (count === 0) return null;
      await tx.ticketEvent.create({ data: eventData(change.ticketId, event) });
      const row = await tx.ticket.findUniqueOrThrow({
        where: { id: change.ticketId },
        include: ticketInclude,
      });
      return toTicket(row);
    });
  }

  async listEvents(ticketId: string): Promise<readonly TicketEvent[]> {
    const rows = await this.db.ticketEvent.findMany({
      where: { ticketId },
      include: eventInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toTicketEvent);
  }
}
