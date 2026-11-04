import { TICKET_STATUSES, type TicketStatus } from '@siga/shared';
import { useId } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { STATUS_LABEL } from '../../lib/labels';
import { STATUS_TONE } from '../../lib/status-style';
import type {
  CategoryCountItem,
  DashboardSummary,
  WorkloadItem,
} from '../../services/dashboard-service';

const toneOf = (status: TicketStatus): string => STATUS_TONE[status].chart;

const tooltipStyle = {
  border: '1px solid var(--surface-border)',
  borderRadius: '12px',
  backgroundColor: 'var(--surface)',
  boxShadow: 'var(--shadow-card)',
  fontSize: '14px',
  padding: '10px 12px',
};

function EmptyChart({ height, label }: { readonly height: number; readonly label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl bg-surface-muted px-4 text-center"
      style={{ height }}
      role="img"
      aria-label={label}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-slate-400 shadow-sm ring-1 ring-surface-border">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
          <path
            d="M4 19V5m0 14h16M8 15v-3m4 3V8m4 7v-5"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-700">Sin solicitudes para mostrar</p>
      <p className="mt-1 text-xs text-slate-500">
        Los datos aparecerán cuando se registren solicitudes.
      </p>
    </div>
  );
}

export function StatusChart({ summary }: { readonly summary: DashboardSummary }) {
  const total = summary.total;
  const data = TICKET_STATUSES.map((status) => ({
    status,
    name: STATUS_LABEL[status],
    count: summary.byStatus.find((item) => item.status === status)?.count ?? 0,
    fill: toneOf(status),
  }));

  return (
    <figure>
      {data.every((item) => item.count === 0) ? (
        <EmptyChart height={300} label="Gráfico de solicitudes por estado sin datos" />
      ) : (
        <div
          className="grid items-center gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(140px,0.8fr)]"
          role="img"
          aria-label="Gráfico de solicitudes por estado"
        >
          <div className="relative h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [String(value), 'Solicitudes']}
                />
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="name"
                  innerRadius="65%"
                  outerRadius="88%"
                  paddingAngle={3}
                  cornerRadius={5}
                  stroke="none"
                  isAnimationActive
                  animationBegin={100}
                  animationDuration={1100}
                  animationEasing="ease-out"
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tracking-tight text-slate-900">{total}</span>
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                solicitudes
              </span>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-4 pb-2 sm:grid-cols-1">
            {data.map((item) => (
              <li key={item.status} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-slate-600">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: toneOf(item.status) }}
                  />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-semibold tabular-nums text-slate-900">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <figcaption className="sr-only">
        {data.map((item) => `${item.name}: ${String(item.count)}`).join('; ')}
      </figcaption>
    </figure>
  );
}

export function CategoryChart({ items }: { readonly items: readonly CategoryCountItem[] }) {
  const gradientId = `category-chart-${useId().replaceAll(':', '')}`;
  const data = items.map((item) => ({ name: item.category.name, count: item.count }));
  const height = Math.max(280, data.length * 52);

  return (
    <figure>
      {data.length === 0 || data.every((item) => item.count === 0) ? (
        <EmptyChart height={height} label="Gráfico de solicitudes por categoría sin datos" />
      ) : (
        <div
          className="w-full"
          style={{ height }}
          role="img"
          aria-label="Gráfico de solicitudes por categoría"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 32, left: 0, bottom: 4 }}
              barCategoryGap={12}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--brand-primary)" />
                  <stop offset="100%" stopColor="var(--brand-secondary)" />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
              <XAxis
                type="number"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--color-slate-500)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={154}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: string) =>
                  value.length > 23 ? `${value.slice(0, 21)}…` : value
                }
                tick={{ fontSize: 12, fill: 'var(--color-slate-600)' }}
              />
              <Tooltip
                cursor={{ fill: 'var(--surface-muted)' }}
                contentStyle={tooltipStyle}
                formatter={(value) => [String(value), 'Solicitudes']}
              />
              <Bar
                dataKey="count"
                fill={`url(#${gradientId})`}
                radius={[0, 7, 7, 0]}
                minPointSize={3}
                maxBarSize={28}
                isAnimationActive
                animationBegin={120}
                animationDuration={900}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey="count"
                  position="right"
                  fill="var(--color-slate-700)"
                  fontSize={12}
                  fontWeight={600}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <figcaption className="sr-only">
        {data.map((item) => `${item.name}: ${String(item.count)}`).join('; ')}
      </figcaption>
    </figure>
  );
}

export function WorkloadTable({ items }: { readonly items: readonly WorkloadItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.openTotal));

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        No hay técnicos activos con solicitudes asignadas.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <caption className="sr-only">Solicitudes abiertas por técnico</caption>
        <thead className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th scope="col" className="py-3 pr-4 font-semibold">
              Técnico
            </th>
            <th scope="col" className="py-3 pr-4 text-right font-semibold">
              Abiertas
            </th>
            <th scope="col" className="w-1/2 py-3 pl-4 font-semibold">
              Distribución
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.technician.id} className="group">
              <th scope="row" className="py-4 pr-4 text-left text-base font-medium text-slate-800">
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-800">
                    {item.technician.fullName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0] ?? '')
                      .join('')
                      .toUpperCase()}
                  </span>
                  {item.technician.fullName}
                </span>
              </th>
              <td className="py-4 pr-4 text-right text-base font-semibold tabular-nums text-slate-900">
                {item.openTotal}
              </td>
              <td className="py-4 pl-4">
                <div
                  className="flex h-2.5 min-w-20 overflow-hidden rounded-full bg-surface-muted"
                  style={{ width: `${String(Math.max(8, (item.openTotal / max) * 100))}%` }}
                  role="img"
                  aria-label={`${String(item.openTotal)} solicitudes abiertas`}
                >
                  {item.byStatus
                    .filter((entry) => entry.count > 0)
                    .map((entry) => (
                      <span
                        key={entry.status}
                        title={`${STATUS_LABEL[entry.status]}: ${String(entry.count)}`}
                        className="transition-[flex-grow] duration-700 ease-out"
                        style={{
                          flexGrow: entry.count,
                          backgroundColor: STATUS_TONE[entry.status].chart,
                        }}
                      />
                    ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
