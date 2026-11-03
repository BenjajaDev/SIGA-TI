import type { Priority, TicketEventType, TicketStatus } from '@siga/shared';
import type { Ticket, TicketEvent } from '../entities';
import type { VisibilityScope } from '../services/ticket-access-policy';

export interface NewTicket {
  readonly title: string;
  readonly description: string;
  readonly categoryId: string;
  readonly priority: Priority;
  readonly requesterId: string;
  readonly dueAt: Date;
  readonly createdAt: Date;
}

export interface NewTicketEvent {
  readonly type: TicketEventType;
  readonly actorId: string;
  readonly fromStatus: TicketStatus | null;
  readonly toStatus: TicketStatus | null;
  readonly fromAssigneeId: string | null;
  readonly toAssigneeId: string | null;
  readonly note: string | null;
  readonly createdAt: Date;
}

export interface TicketChange {
  readonly ticketId: string;
  readonly expected: { readonly status: TicketStatus; readonly assigneeId: string | null };
  readonly next: {
    readonly status: TicketStatus;
    readonly assigneeId: string | null;
    readonly resolvedAt: Date | null;
    readonly closedAt: Date | null;
  };
}

export interface TicketFilter {
  readonly status?: TicketStatus | undefined;
  readonly priority?: Priority | undefined;
  readonly categoryId?: string | undefined;
  readonly assigneeId?: string | undefined;
}

export interface PageRequest {
  readonly page: number;
  readonly pageSize: number;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly totalItems: number;
}

export interface TicketRepository {
  findById(id: string): Promise<Ticket | null>;
  list(filter: TicketFilter, scope: VisibilityScope, page: PageRequest): Promise<Page<Ticket>>;
  createWithEvent(data: NewTicket, event: NewTicketEvent): Promise<Ticket>;
  /** Aplica el cambio solo si el estado y el asignado esperados siguen vigentes; null si no. */
  saveWithEvent(change: TicketChange, event: NewTicketEvent): Promise<Ticket | null>;
  listEvents(ticketId: string): Promise<readonly TicketEvent[]>;
}
