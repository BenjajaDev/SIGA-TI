import type { Database } from '../prisma-client';
import type { User } from '../../../domain/entities';
import type { UserFilter, UserRepository } from '../../../domain/ports/user-repository';
import { toUser } from '../mappers';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row === null ? null : toUser(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    return row === null ? null : toUser(row);
  }

  async list(filter: UserFilter): Promise<readonly User[]> {
    const rows = await this.db.user.findMany({
      where: {
        ...(filter.role !== undefined && { role: filter.role }),
        ...(filter.isActive !== undefined && { isActive: filter.isActive }),
      },
      orderBy: { fullName: 'asc' },
    });
    return rows.map(toUser);
  }

  async touchLastLogin(id: string, at: Date): Promise<void> {
    await this.db.user.update({ where: { id }, data: { lastLoginAt: at } });
  }
}
