import {
  categoryListSchema,
  userListSchema,
  userSchema,
  type Category,
  type CreateUserRequest,
  type Role,
  type UpdateUserRequest,
  type User,
} from '@siga/shared';
import type { HttpClient } from './http-client';

export interface CatalogService {
  categories(): Promise<Category[]>;
  users(filter: { role?: Role; isActive?: boolean }): Promise<User[]>;
  createUser(body: CreateUserRequest): Promise<User>;
  updateUser(id: string, body: UpdateUserRequest): Promise<User>;
  deactivateUser(id: string): Promise<void>;
}

export const createCatalogService = (client: HttpClient): CatalogService => ({
  categories: async () => (await client.get('/categories', categoryListSchema)).items,
  users: async (filter) => (await client.get('/users', userListSchema, { ...filter })).items,
  createUser: (body) => client.post('/users', userSchema, body),
  updateUser: (id, body) => client.put(`/users/${id}`, userSchema, body),
  deactivateUser: (id) => client.deleteNoContent(`/users/${id}`),
});
