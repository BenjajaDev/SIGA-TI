import { useQuery } from '@tanstack/react-query';
import type { Role } from '@siga/shared';
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
