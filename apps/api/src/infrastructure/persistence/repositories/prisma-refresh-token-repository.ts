import type { Database } from '../prisma-client';
import type { RefreshTokenRecord } from '../../../domain/entities';
import type { RefreshTokenRepository } from '../../../domain/ports/refresh-token-repository';

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly db: Database) {}

  async create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.db.refreshToken.create({ data });
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const row = await this.db.refreshToken.findUnique({ where: { tokenHash } });
    return row === null
      ? null
      : { id: row.id, userId: row.userId, expiresAt: row.expiresAt, revokedAt: row.revokedAt };
  }

  async revoke(id: string, at: Date): Promise<boolean> {
    const { count } = await this.db.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at },
    });
    return count === 1;
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
  }
}
