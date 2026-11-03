import { Card } from '../components/atoms/card';
import { PageHeader } from '../components/molecules/page-header';
import { QueryState } from '../components/molecules/query-state';
import { StatCard } from '../components/molecules/stat-card';
import {
  CategoryChart,
  StatusChart,
  WorkloadTable,
} from '../components/organisms/dashboard-charts';
import { ResolutionPanel } from '../components/organisms/resolution-panel';
import {
  useDashboardByCategory,
  useDashboardSummary,
  useDashboardWorkload,
} from '../hooks/use-dashboard';

export function DashboardPage() {
  const summary = useDashboardSummary();
  const byCategory = useDashboardByCategory();
  const workload = useDashboardWorkload();

  return (
    <div className="space-y-6">
      <PageHeader title="Panel de indicadores" subtitle="Estado general de las solicitudes de TI" />
      <QueryState
        isPending={summary.isPending}
        error={summary.error}
        onRetry={() => void summary.refetch()}
      >
        {summary.data !== undefined && (
          <>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total de solicitudes" value={summary.data.total} />
              <StatCard
                label="Backlog"
                value={summary.data.backlog}
                hint="Sin resolver ni cerrar"
              />
              <StatCard label="Sin asignar" value={summary.data.unassigned} />
              <StatCard
                label="Vencidas"
                value={summary.data.overdue}
                tone={summary.data.overdue > 0 ? 'alert' : 'default'}
                hint="Fuera del plazo de SLA"
              />
            </dl>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Solicitudes por estado">
                <StatusChart summary={summary.data} />
              </Card>
              <Card title="Solicitudes por categoría">
                <QueryState isPending={byCategory.isPending} error={byCategory.error}>
                  <CategoryChart items={byCategory.data ?? []} />
                </QueryState>
              </Card>
            </div>
          </>
        )}
      </QueryState>
      <Card title="Carga por técnico">
        <QueryState isPending={workload.isPending} error={workload.error}>
          <WorkloadTable items={workload.data ?? []} />
        </QueryState>
      </Card>
      <Card title="Resolución y SLA">
        <ResolutionPanel />
      </Card>
    </div>
  );
}
