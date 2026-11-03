import type { Database } from '../prisma-client';
import type { Comment } from '../../../domain/entities';
import type { CommentRepository, NewComment } from '../../../domain/ports/comment-repository';
import { commentInclude, toComment } from '../mappers';

export class PrismaCommentRepository implements CommentRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewComment): Promise<Comment> {
    const row = await this.db.comment.create({ data, include: commentInclude });
    return toComment(row);
  }

  async listByTicket(ticketId: string, includeInternal: boolean): Promise<readonly Comment[]> {
    const rows = await this.db.comment.findMany({
      where: { ticketId, ...(!includeInternal && { visibility: 'PUBLICO' as const }) },
      include: commentInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toComment);
  }
}
