import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateUserRequest, Role, UpdateUserRequest } from '@siga/shared';
import { queryKeys } from '../lib/query-keys';
import { services } from '../services';

const FIVE_MINUTES = 5 * 60 * 1000;

export const useCategories = () =>
  useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => services.catalog.categories(),
    staleTime: FIVE_MINUTES,
  });

export const useUsers = (filter: { role?: Role; isActive?: boolean }, enabled = true) =>
  useQuery({
    queryKey: queryKeys.users(filter),
    queryFn: () => services.catalog.users(filter),
    staleTime: FIVE_MINUTES,
    enabled,
  });

const useInvalidateUsers = () => {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['users'] }),
      client.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    ]);
};

export const useCreateUser = () => {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (body: CreateUserRequest) => services.catalog.createUser(body),
    onSuccess: invalidate,
  });
};

export const useUpdateUser = () => {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserRequest }) =>
      services.catalog.updateUser(id, body),
    onSuccess: invalidate,
  });
};

export const useDeactivateUser = () => {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => services.catalog.deactivateUser(id),
    onSuccess: invalidate,
  });
};
