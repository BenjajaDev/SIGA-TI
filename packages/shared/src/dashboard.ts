import { z } from 'zod';
import { isoDateTimeSchema, itemsOf, userSummarySchema, uuidSchema } from './common';
import { ticketStatusSchema } from './enums';

const count = z.number().int().min(0);

export const statusCountSchema = z.object({ status: ticketStatusSchema, count });

export const dashboardSummarySchema = z
  .object({
    total: count,
    byStatus: z.array(statusCountSchema),
    backlog: count,
    unassigned: count,
    overdue: count,
  })
  .meta({ id: 'DashboardSummary' });

export const categoryCountSchema = z.object({
  category: z.object({ id: uuidSchema, name: z.string() }),
  count,
});

export const technicianWorkloadSchema = z.object({
  technician: userSummarySchema,
  openTotal: count,
  byStatus: z.array(statusCountSchema),
});

export const resolutionQuerySchema = z
  .object({ from: isoDateTimeSchema.optional(), to: isoDateTimeSchema.optional() })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    path: ['from'],
    error: '"from" debe ser anterior a "to"',
  });

export const resolutionMetricsSchema = z
  .object({
    from: isoDateTimeSchema,
    to: isoDateTimeSchema,
    resolvedCount: count,
    averageResolutionHours: z.number().min(0).nullable(),
    slaCompliancePercent: z.number().min(0).max(100).nullable(),
    withinSlaCount: count,
    breachedCount: count,
  })
  .meta({ id: 'ResolutionMetrics' });

export const categoryCountListSchema = itemsOf(categoryCountSchema);
export const workloadListSchema = itemsOf(technicianWorkloadSchema);

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type ResolutionMetrics = z.infer<typeof resolutionMetricsSchema>;
export type ResolutionQuery = z.infer<typeof resolutionQuerySchema>;
