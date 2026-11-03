import type { CommentVisibility } from '@siga/shared';
import type { Actor, Comment } from '../../../domain/entities';
import { ConflictError, ForbiddenError } from '../../../domain/errors';
import type { CommentRepository } from '../../../domain/ports/comment-repository';
import type { TicketRepository } from '../../../domain/ports/ticket-repository';
import {
  assertCanView,
  canComment,
  canReadInternalComments,
  canWriteInternalComments,
} from '../../../domain/services/ticket-access-policy';

export interface AddCommentInput {
  readonly actor: Actor;
  readonly ticketId: string;
  readonly body: string;
  readonly visibility: CommentVisibility;
}

export class AddCommentUseCase {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly comments: CommentRepository,
  ) {}

  async execute(input: AddCommentInput): Promise<Comment> {
    const { actor, visibility } = input;
    const ticket = assertCanView(actor, await this.tickets.findById(input.ticketId));
    if (!canComment(actor, ticket)) throw new ForbiddenError();
    if (visibility === 'INTERNO' && !canWriteInternalComments(actor, ticket)) {
      throw new ForbiddenError('No puede publicar comentarios internos');
    }
    if (ticket.status === 'CERRADA') {
      throw new ConflictError('TICKET_CLOSED', 'La solicitud está cerrada');
    }
    return this.comments.create({
      ticketId: ticket.id,
      authorId: actor.id,
      body: input.body,
      visibility,
    });
  }
}

export class ListCommentsUseCase {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly comments: CommentRepository,
  ) {}

  async execute(actor: Actor, ticketId: string): Promise<readonly Comment[]> {
    const ticket = assertCanView(actor, await this.tickets.findById(ticketId));
    return this.comments.listByTicket(ticket.id, canReadInternalComments(actor, ticket));
  }
}
