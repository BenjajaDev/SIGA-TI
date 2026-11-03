import type { Database } from '../prisma-client';
import type {
  CategoryCount,
  DashboardQueries,
  StatusCount,
  TechnicianLoad,
} from '../../../domain/ports/dashboard-queries';
import type { ResolvedSample } from '../../../domain/services/resolution-metrics';
import { OPEN_STATUSES } from '../../../domain/services/sla';

export class PrismaDashboardQueries implements DashboardQueries {
  constructor(private readonly db: Database) {}

  async countByStatus(): Promise<readonly StatusCount[]> {
    const groups = await this.db.ticket.groupBy({ by: ['status'], _count: { _all: true } });
    return groups.map((g) => ({ status: g.status, count: g._count._all }));
  }

  countOverdue(now: Date): Promise<number> {
    return this.db.ticket.count({
      where: { status: { in: [...OPEN_STATUSES] }, dueAt: { lt: now } },
    });
  }

  async countByCategory(): Promise<readonly CategoryCount[]> {
    const rows = await this.db.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, _count: { select: { tickets: true } } },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => ({
      category: { id: row.id, name: row.name },
      count: row._count.tickets,
    }));
  }

  async openLoadByTechnician(): Promise<readonly TechnicianLoad[]> {
    const [technicians, groups] = await Promise.all([
      this.db.user.findMany({
        where: { role: 'TECNICO', isActive: true },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' },
      }),
      this.db.ticket.groupBy({
        by: ['assigneeId', 'status'],
        where: { assigneeId: { not: null }, status: { in: [...OPEN_STATUSES] } },
        _count: { _all: true },
      }),
    ]);
    return technicians.map((technician) => ({
      technician,
      byStatus: groups
        .filter((g) => g.assigneeId === technician.id)
        .map((g) => ({ status: g.status, count: g._count._all })),
    }));
  }

  async listResolvedBetween(from: Date, to: Date): Promise<readonly ResolvedSample[]> {
    const rows = await this.db.ticket.findMany({
      where: { resolvedAt: { gte: from, lte: to } },
      select: { createdAt: true, resolvedAt: true, dueAt: true },
    });
    return rows.flatMap((row) =>
      row.resolvedAt === null
        ? []
        : [{ createdAt: row.createdAt, resolvedAt: row.resolvedAt, dueAt: row.dueAt }],
    );
  }
}
