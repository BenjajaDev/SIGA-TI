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
  touchLastLogin(id: string, at: Date): Promise<void>;
}
