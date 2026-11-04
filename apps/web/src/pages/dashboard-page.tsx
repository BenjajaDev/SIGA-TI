import { Card } from '../components/atoms/card';
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
    <div className="space-y-8">
      <section className="relative isolate overflow-hidden rounded-3xl bg-brand-gradient px-6 py-7 text-white shadow-brand-card sm:px-8 sm:py-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-24 z-0 h-72 w-72 rounded-full border-[36px] border-white/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 right-28 z-0 h-64 w-64 rounded-full border-[28px] border-white/15"
        />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85 ring-1 ring-white/15">
            <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_rgb(255_255_255_/_0.9)]" />
            Visión operacional
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Panel de indicadores
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/85 sm:text-base">
            Estado general de las solicitudes, carga de trabajo y cumplimiento de los tiempos de
            atención.
          </p>
        </div>
      </section>

      <QueryState
        isPending={summary.isPending}
        error={summary.error}
        onRetry={() => void summary.refetch()}
      >
        {summary.data !== undefined && (
          <>
            <dl className="reveal-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total de solicitudes"
                value={summary.data.total}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                    <path
                      d="M7 4h10a2 2 0 0 1 2 2v13H5V6a2 2 0 0 1 2-2Zm1 4h8m-8 4h8m-8 4h5"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />
              <StatCard
                label="Backlog"
                value={summary.data.backlog}
                hint="Sin resolver ni cerrar"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                    <path
                      d="M4 5h16v13H4zM4 9h5l1.5 2h3L15 9h5"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />
              <StatCard
                label="Sin asignar"
                value={summary.data.unassigned}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                    <circle cx="9" cy="8" r="3" strokeWidth="1.7" />
                    <path
                      d="M3.5 19a5.5 5.5 0 0 1 11 0m3-9v6m-3-3h6"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              />
              <StatCard
                label="Vencidas"
                value={summary.data.overdue}
                tone={summary.data.overdue > 0 ? 'alert' : 'default'}
                hint="Fuera del plazo de SLA"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                    <circle cx="12" cy="12" r="8.5" strokeWidth="1.7" />
                    <path d="M12 7v5l3 2" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                }
              />
            </dl>

            <section className="space-y-4" aria-label="Distribución de solicitudes">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                    Distribución
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">Solicitudes</h2>
                </div>
                <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200 sm:inline-flex">
                  Según estado y categoría
                </span>
              </div>
              <div className="grid items-start gap-5 xl:grid-cols-2">
                <Card title="Por estado">
                  <StatusChart summary={summary.data} />
                </Card>
                <Card title="Por categoría">
                  <QueryState isPending={byCategory.isPending} error={byCategory.error}>
                    <CategoryChart items={byCategory.data ?? []} />
                  </QueryState>
                </Card>
              </div>
            </section>
          </>
        )}
      </QueryState>

      <section className="grid gap-6 2xl:grid-cols-2">
        <Card title="Carga por técnico">
          <QueryState isPending={workload.isPending} error={workload.error}>
            <WorkloadTable items={workload.data ?? []} />
          </QueryState>
        </Card>
        <Card title="Resolución y SLA">
          <ResolutionPanel />
        </Card>
      </section>
    </div>
  );
}
