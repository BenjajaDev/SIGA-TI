import type { Database } from '../prisma-client';
import { Prisma } from '../generated/client';
import type { User } from '../../../domain/entities';
import type { UserFilter, UserRepository } from '../../../domain/ports/user-repository';
import { toUser } from '../mappers';

const isEmailConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

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

  async create(data: {
    email: string;
    fullName: string;
    role: User['role'];
    passwordHash: string;
  }): Promise<User | null> {
    try {
      return toUser(await this.db.user.create({ data }));
    } catch (error) {
      if (isEmailConflict(error)) return null;
      throw error;
    }
  }

  async update(
    id: string,
    data: {
      email: string;
      fullName: string;
      role: User['role'];
      isActive: boolean;
      passwordHash?: string | undefined;
      revokeSessionsAt?: Date | undefined;
    },
  ): Promise<User | null> {
    try {
      const user = await this.db.$transaction(async (transaction) => {
        const updated = await transaction.user.update({
          where: { id },
          data: {
            email: data.email,
            fullName: data.fullName,
            role: data.role,
            isActive: data.isActive,
            ...(data.passwordHash !== undefined && { passwordHash: data.passwordHash }),
          },
        });
        if (data.revokeSessionsAt !== undefined) {
          await transaction.refreshToken.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: data.revokeSessionsAt },
          });
        }
        return updated;
      });
      return toUser(user);
    } catch (error) {
      if (isEmailConflict(error)) return null;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async deactivate(id: string, revokedAt: Date): Promise<User | null> {
    try {
      const user = await this.db.$transaction(async (transaction) => {
        const deactivated = await transaction.user.update({
          where: { id },
          data: { isActive: false },
        });
        await transaction.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt },
        });
        return deactivated;
      });
      return toUser(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  countActiveAdmins(): Promise<number> {
    return this.db.user.count({ where: { role: 'ADMIN', isActive: true } });
  }

  async touchLastLogin(id: string, at: Date): Promise<void> {
    await this.db.user.update({ where: { id }, data: { lastLoginAt: at } });
  }
}
