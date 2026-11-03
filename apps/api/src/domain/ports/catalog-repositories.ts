import type { Priority } from '@siga/shared';
import type { Category } from '../entities';

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  list(): Promise<readonly Category[]>;
}

export interface SlaPolicyRepository {
  findResolutionHours(priority: Priority): Promise<number | null>;
}
