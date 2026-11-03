import type { Priority } from '@siga/shared';
import type { Database } from '../prisma-client';
import type { Category } from '../../../domain/entities';
import type {
  CategoryRepository,
  SlaPolicyRepository,
} from '../../../domain/ports/catalog-repositories';

const toCategory = (row: Category): Category => ({
  id: row.id,
  name: row.name,
  description: row.description,
  isActive: row.isActive,
});

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Category | null> {
    const row = await this.db.category.findUnique({ where: { id } });
    return row === null ? null : toCategory(row);
  }

  async list(): Promise<readonly Category[]> {
    const rows = await this.db.category.findMany({ orderBy: { name: 'asc' } });
    return rows.map(toCategory);
  }
}

export class PrismaSlaPolicyRepository implements SlaPolicyRepository {
  constructor(private readonly db: Database) {}

  async findResolutionHours(priority: Priority): Promise<number | null> {
    const row = await this.db.slaPolicy.findUnique({ where: { priority } });
    return row?.resolutionHours ?? null;
  }
}
