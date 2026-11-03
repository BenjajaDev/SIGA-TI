import type { Actor, Category, User } from '../../../domain/entities';
import type { CategoryRepository } from '../../../domain/ports/catalog-repositories';
import type { UserFilter, UserRepository } from '../../../domain/ports/user-repository';
import { assertSupervisorOrAdmin } from '../../../domain/services/ticket-access-policy';

export class ListCategoriesUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(): Promise<readonly Category[]> {
    return (await this.categories.list()).filter((category) => category.isActive);
  }
}

export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  execute(actor: Actor, filter: UserFilter): Promise<readonly User[]> {
    assertSupervisorOrAdmin(actor);
    return this.users.list(filter);
  }
}
