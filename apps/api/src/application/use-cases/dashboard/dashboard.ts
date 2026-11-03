import { TICKET_STATUSES, type ResolutionMetrics } from '@siga/shared';
import type { Actor } from '../../../domain/entities';
import type {
  CategoryCount,
  DashboardQueries,
  StatusCount,
  TechnicianLoad,
} from '../../../domain/ports/dashboard-queries';
import type { Clock } from '../../../domain/ports/security';
import { computeResolutionStats } from '../../../domain/services/resolution-metrics';
import { OPEN_STATUSES } from '../../../domain/services/sla';
import { assertSupervisorOrAdmin } from '../../../domain/services/ticket-access-policy';

const MS_PER_DAY = 86_400_000;
const DEFAULT_RANGE_DAYS = 30;

const fillStatuses = (counts: readonly StatusCount[]): StatusCount[] =>
  TICKET_STATUSES.map((status) => ({
    status,
    count: counts.find((c) => c.status === status)?.count ?? 0,
  }));

const sum = (counts: readonly StatusCount[]): number => counts.reduce((acc, c) => acc + c.count, 0);

export interface DashboardSummaryResult {
  readonly total: number;
  readonly byStatus: readonly StatusCount[];
  readonly backlog: number;
  readonly unassigned: number;
  readonly overdue: number;
}

export interface TechnicianWorkloadResult {
  readonly technician: TechnicianLoad['technician'];
  readonly openTotal: number;
  readonly byStatus: readonly StatusCount[];
}

export class GetDashboardSummaryUseCase {
  constructor(
    private readonly queries: DashboardQueries,
    private readonly clock: Clock,
  ) {}

  async execute(actor: Actor): Promise<DashboardSummaryResult> {
    assertSupervisorOrAdmin(actor);
    const [counts, overdue] = await Promise.all([
      this.queries.countByStatus(),
      this.queries.countOverdue(this.clock.now()),
    ]);
    const byStatus = fillStatuses(counts);
    const open = byStatus.filter((c) => OPEN_STATUSES.includes(c.status));
    return {
      total: sum(byStatus),
      byStatus,
      backlog: sum(open),
      unassigned: byStatus.find((c) => c.status === 'ABIERTA')?.count ?? 0,
      overdue,
    };
  }
}

export class GetTicketsByCategoryUseCase {
  constructor(private readonly queries: DashboardQueries) {}

  async execute(actor: Actor): Promise<readonly CategoryCount[]> {
    assertSupervisorOrAdmin(actor);
    return this.queries.countByCategory();
  }
}

export class GetTechnicianWorkloadUseCase {
  constructor(private readonly queries: DashboardQueries) {}

  async execute(actor: Actor): Promise<readonly TechnicianWorkloadResult[]> {
    assertSupervisorOrAdmin(actor);
    const loads = await this.queries.openLoadByTechnician();
    return loads.map((load) => {
      const byStatus = fillStatuses(load.byStatus).filter((c) => OPEN_STATUSES.includes(c.status));
      return { technician: load.technician, openTotal: sum(byStatus), byStatus };
    });
  }
}

export interface ResolutionInput {
  readonly actor: Actor;
  readonly from?: Date | undefined;
  readonly to?: Date | undefined;
}

export type ResolutionResult = Omit<ResolutionMetrics, 'from' | 'to'> & {
  readonly from: Date;
  readonly to: Date;
};

export class GetResolutionMetricsUseCase {
  constructor(
    private readonly queries: DashboardQueries,
    private readonly clock: Clock,
  ) {}

  async execute(input: ResolutionInput): Promise<ResolutionResult> {
    assertSupervisorOrAdmin(input.actor);
    const to = input.to ?? this.clock.now();
    const from = input.from ?? new Date(to.getTime() - DEFAULT_RANGE_DAYS * MS_PER_DAY);
    const samples = await this.queries.listResolvedBetween(from, to);
    return { from, to, ...computeResolutionStats(samples) };
  }
}
