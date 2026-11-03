import type { TicketStatus } from '@siga/shared';
import type { UserSummary } from '../entities';
import type { ResolvedSample } from '../services/resolution-metrics';

export interface StatusCount {
  readonly status: TicketStatus;
  readonly count: number;
}

export interface CategoryCount {
  readonly category: { readonly id: string; readonly name: string };
  readonly count: number;
}

export interface TechnicianLoad {
  readonly technician: UserSummary;
  readonly byStatus: readonly StatusCount[];
}

export interface DashboardQueries {
  countByStatus(): Promise<readonly StatusCount[]>;
  countOverdue(now: Date): Promise<number>;
  countByCategory(): Promise<readonly CategoryCount[]>;
  openLoadByTechnician(): Promise<readonly TechnicianLoad[]>;
  listResolvedBetween(from: Date, to: Date): Promise<readonly ResolvedSample[]>;
}
