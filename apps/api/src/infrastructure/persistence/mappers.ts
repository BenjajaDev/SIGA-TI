import type { Prisma } from './generated/client';
import type { Comment, Ticket, TicketEvent, User } from '../../domain/entities';
import { formatTicketCode } from '../../domain/services/ticket-code';

const userSummarySelect = { id: true, fullName: true } as const;

export const ticketInclude = {
  category: { select: { id: true, name: true } },
  requester: { select: userSummarySelect },
  assignee: { select: userSummarySelect },
} satisfies Prisma.TicketInclude;

export const eventInclude = {
  actor: { select: userSummarySelect },
  fromAssignee: { select: userSummarySelect },
  toAssignee: { select: userSummarySelect },
} satisfies Prisma.TicketEventInclude;

export const commentInclude = {
  author: { select: userSummarySelect },
} satisfies Prisma.CommentInclude;

type TicketRow = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;
type EventRow = Prisma.TicketEventGetPayload<{ include: typeof eventInclude }>;
type CommentRow = Prisma.CommentGetPayload<{ include: typeof commentInclude }>;
type UserRow = Prisma.UserGetPayload<object>;

export const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  fullName: row.fullName,
  role: row.role,
  isActive: row.isActive,
  createdAt: row.createdAt,
});

export const toTicket = (row: TicketRow): Ticket => ({
  id: row.id,
  number: row.number,
  code: formatTicketCode(row.number),
  title: row.title,
  description: row.description,
  category: row.category,
  priority: row.priority,
  status: row.status,
  requester: row.requester,
  assignee: row.assignee,
  dueAt: row.dueAt,
  resolvedAt: row.resolvedAt,
  closedAt: row.closedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toTicketEvent = (row: EventRow): TicketEvent => ({
  id: row.id,
  ticketId: row.ticketId,
  type: row.type,
  actor: row.actor,
  fromStatus: row.fromStatus,
  toStatus: row.toStatus,
  fromAssignee: row.fromAssignee,
  toAssignee: row.toAssignee,
  note: row.note,
  createdAt: row.createdAt,
});

export const toComment = (row: CommentRow): Comment => ({
  id: row.id,
  ticketId: row.ticketId,
  author: row.author,
  body: row.body,
  visibility: row.visibility,
  createdAt: row.createdAt,
});
