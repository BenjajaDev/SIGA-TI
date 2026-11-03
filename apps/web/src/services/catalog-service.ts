import {
  categoryListSchema,
  userListSchema,
  type Category,
  type Role,
  type User,
} from '@siga/shared';
import type { HttpClient } from './http-client';

export interface CatalogService {
  categories(): Promise<Category[]>;
  users(filter: { role?: Role; isActive?: boolean }): Promise<User[]>;
}

export const createCatalogService = (client: HttpClient): CatalogService => ({
  categories: async () => (await client.get('/categories', categoryListSchema)).items,
  users: async (filter) => (await client.get('/users', userListSchema, { ...filter })).items,
});
