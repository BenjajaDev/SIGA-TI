import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-keys';
import { services } from '../services';

export const useDashboardSummary = () =>
  useQuery({ queryKey: queryKeys.dashboard.summary, queryFn: () => services.dashboard.summary() });

export const useDashboardByCategory = () =>
  useQuery({
    queryKey: queryKeys.dashboard.byCategory,
    queryFn: () => services.dashboard.byCategory(),
  });

export const useDashboardWorkload = () =>
  useQuery({
    queryKey: queryKeys.dashboard.workload,
    queryFn: () => services.dashboard.workload(),
  });

export const useDashboardResolution = (range: { from: string; to: string }) =>
  useQuery({
    queryKey: queryKeys.dashboard.resolution(range),
    queryFn: () => services.dashboard.resolution(range),
  });
