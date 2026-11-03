import {
  categoryCountListSchema,
  dashboardSummarySchema,
  resolutionMetricsSchema,
  workloadListSchema,
} from '@siga/shared';
import type { z } from 'zod';
import type { HttpClient } from './http-client';

export type DashboardSummary = z.output<typeof dashboardSummarySchema>;
export type CategoryCountItem = z.output<typeof categoryCountListSchema>['items'][number];
export type WorkloadItem = z.output<typeof workloadListSchema>['items'][number];
export type ResolutionMetrics = z.output<typeof resolutionMetricsSchema>;

export interface DashboardService {
  summary(): Promise<DashboardSummary>;
  byCategory(): Promise<CategoryCountItem[]>;
  workload(): Promise<WorkloadItem[]>;
  resolution(range: { from?: string; to?: string }): Promise<ResolutionMetrics>;
}

export const createDashboardService = (client: HttpClient): DashboardService => ({
  summary: () => client.get('/dashboard/summary', dashboardSummarySchema),
  byCategory: async () =>
    (await client.get('/dashboard/by-category', categoryCountListSchema)).items,
  workload: async () => (await client.get('/dashboard/workload', workloadListSchema)).items,
  resolution: (range) => client.get('/dashboard/resolution', resolutionMetricsSchema, { ...range }),
});
