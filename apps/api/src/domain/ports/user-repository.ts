import type { Role } from '@siga/shared';
import type { User } from '../entities';

export interface UserFilter {
  readonly role?: Role | undefined;
  readonly isActive?: boolean | undefined;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(filter: UserFilter): Promise<readonly User[]>;
  create(data: {
    email: string;
    fullName: string;
    role: User['role'];
    passwordHash: string;
  }): Promise<User | null>;
  update(
    id: string,
    data: {
      email: string;
      fullName: string;
      role: User['role'];
      isActive: boolean;
      passwordHash?: string | undefined;
      revokeSessionsAt?: Date | undefined;
    },
  ): Promise<User | null>;
  deactivate(id: string, revokedAt: Date): Promise<User | null>;
  countActiveAdmins(): Promise<number>;
  touchLastLogin(id: string, at: Date): Promise<void>;
}
