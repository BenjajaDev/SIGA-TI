import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateBrandingRequest } from '@siga/shared';
import { queryKeys } from '../lib/query-keys';
import { services } from '../services';

export const useBranding = () =>
  useQuery({
    queryKey: queryKeys.branding,
    queryFn: () => services.branding.get(),
    staleTime: Infinity,
  });

export const useUpdateBranding = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBrandingRequest) => services.branding.update(body),
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.branding, saved);
    },
  });
};
