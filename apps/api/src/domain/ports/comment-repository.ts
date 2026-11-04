import type { CommentVisibility } from '@siga/shared';
import type { Comment } from '../entities';

export interface NewComment {
  readonly ticketId: string;
  readonly authorId: string;
  readonly body: string;
  readonly visibility: CommentVisibility;
  readonly createdAt: Date;
}

export interface CommentRepository {
  create(data: NewComment): Promise<Comment>;
  listByTicket(ticketId: string, includeInternal: boolean): Promise<readonly Comment[]>;
}
