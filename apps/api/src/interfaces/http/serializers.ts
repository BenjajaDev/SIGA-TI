import type {
  AuthSession,
  Comment as CommentDto,
  DashboardSummary,
  ResolutionMetrics,
  Ticket as TicketDto,
  TicketEvent as TicketEventDto,
  User as UserDto,
  Category as CategoryDto,
} from '@siga/shared';
import type { Category, Comment, Ticket, TicketEvent, User } from '../../domain/entities';
import { isOverdue } from '../../domain/services/sla';
import type { IssuedSession } from '../../application/use-cases/auth/session-issuer';
import type {
  DashboardSummaryResult,
  ResolutionResult,
} from '../../application/use-cases/dashboard/dashboard';

const iso = (date: Date): string => date.toISOString();
const isoOrNull = (date: Date | null): string | null => (date === null ? null : iso(date));

export const serializeUser = (user: User): UserDto => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  isActive: user.isActive,
  createdAt: iso(user.createdAt),
});

export const serializeSession = (session: IssuedSession): AuthSession => ({
  accessToken: session.accessToken,
  expiresIn: session.expiresIn,
  user: serializeUser(session.user),
});

export const serializeCategory = (category: Category): CategoryDto => ({ ...category });

export const serializeTicket = (ticket: Ticket, now: Date): TicketDto => ({
  id: ticket.id,
  code: ticket.code,
  title: ticket.title,
  description: ticket.description,
  category: ticket.category,
  priority: ticket.priority,
  status: ticket.status,
  requester: ticket.requester,
  assignee: ticket.assignee,
  dueAt: iso(ticket.dueAt),
  isOverdue: isOverdue(ticket, now),
  resolvedAt: isoOrNull(ticket.resolvedAt),
  closedAt: isoOrNull(ticket.closedAt),
  createdAt: iso(ticket.createdAt),
  updatedAt: iso(ticket.updatedAt),
});

export const serializeEvent = (event: TicketEvent): TicketEventDto => ({
  id: event.id,
  type: event.type,
  actor: event.actor,
  fromStatus: event.fromStatus,
  toStatus: event.toStatus,
  fromAssignee: event.fromAssignee,
  toAssignee: event.toAssignee,
  note: event.note,
  createdAt: iso(event.createdAt),
});

export const serializeComment = (comment: Comment): CommentDto => ({
  id: comment.id,
  author: comment.author,
  body: comment.body,
  visibility: comment.visibility,
  createdAt: iso(comment.createdAt),
});

export const serializeSummary = (summary: DashboardSummaryResult): DashboardSummary => ({
  total: summary.total,
  byStatus: summary.byStatus.map((c) => ({ ...c })),
  backlog: summary.backlog,
  unassigned: summary.unassigned,
  overdue: summary.overdue,
});

export const serializeResolution = (result: ResolutionResult): ResolutionMetrics => ({
  ...result,
  from: iso(result.from),
  to: iso(result.to),
});
