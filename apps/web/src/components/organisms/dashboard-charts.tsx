import { TICKET_STATUSES, type TicketStatus } from '@siga/shared';
import {
  Bar,
  BarChart,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from 'recharts';
import { STATUS_LABEL } from '../../lib/labels';
import { STATUS_TONE } from '../../lib/status-style';
import type {
  CategoryCountItem,
  DashboardSummary,
  WorkloadItem,
} from '../../services/dashboard-service';

const toneOf = (payload: unknown): string => {
  const status = (payload as { status?: TicketStatus } | undefined)?.status;
  return status === undefined ? '#64748b' : STATUS_TONE[status].chart;
};

export function StatusChart({ summary }: { readonly summary: DashboardSummary }) {
  const data = TICKET_STATUSES.map((status) => ({
    status,
    name: STATUS_LABEL[status],
    count: summary.byStatus.find((c) => c.status === status)?.count ?? 0,
  }));
  return (
    <figure>
      <div className="h-64" role="img" aria-label="Gráfico de solicitudes por estado">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [String(value), 'Solicitudes']} />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              shape={(props: BarShapeProps) => (
                <Rectangle {...props} fill={toneOf(props.payload)} />
              )}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {data.map((d) => `${d.name}: ${String(d.count)}`).join('; ')}
      </figcaption>
    </figure>
  );
}

export function CategoryChart({ items }: { readonly items: readonly CategoryCountItem[] }) {
  const data = items.map((item) => ({ name: item.category.name, count: item.count }));
  return (
    <figure>
      <div className="h-72" role="img" aria-label="Gráfico de solicitudes por categoría">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
          >
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [String(value), 'Solicitudes']} />
            <Bar
              dataKey="count"
              fill="var(--brand-primary)"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {data.map((d) => `${d.name}: ${String(d.count)}`).join('; ')}
      </figcaption>
    </figure>
  );
}

export function WorkloadTable({ items }: { readonly items: readonly WorkloadItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.openTotal));
  return (
    <table className="min-w-full text-sm">
      <caption className="sr-only">Solicitudes abiertas por técnico</caption>
      <thead className="text-left text-xs uppercase tracking-wide text-slate-600">
        <tr>
          <th scope="col" className="py-2 pr-4">
            Técnico
          </th>
          <th scope="col" className="py-2 pr-4">
            Abiertas
          </th>
          <th scope="col" className="py-2">
            Distribución
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.map((item) => (
          <tr key={item.technician.id}>
            <th scope="row" className="py-3 pr-4 text-left font-medium">
              {item.technician.fullName}
            </th>
            <td className="py-3 pr-4 tabular-nums">{item.openTotal}</td>
            <td className="w-1/2 py-3">
              <div
                className="flex h-3 overflow-hidden rounded bg-slate-100"
                style={{ width: `${String((item.openTotal / max) * 100)}%` }}
              >
                {item.byStatus
                  .filter((c) => c.count > 0)
                  .map((c) => (
                    <span
                      key={c.status}
                      title={`${STATUS_LABEL[c.status]}: ${String(c.count)}`}
                      style={{ flexGrow: c.count, backgroundColor: STATUS_TONE[c.status].chart }}
                    />
                  ))}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
