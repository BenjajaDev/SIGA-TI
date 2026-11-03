import type { Ticket, TicketActorContext, User } from '@siga/shared';

export const actorContextFor = (user: User, ticket: Ticket): TicketActorContext => ({
  role: user.role,
  userId: user.id,
  requesterId: ticket.requester.id,
  assigneeId: ticket.assignee?.id ?? null,
});
