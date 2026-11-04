import { useState } from 'react';
import { useDashboardResolution } from '../../hooks/use-dashboard';
import { formatHours, formatPercent } from '../../lib/format';
import { Select } from '../atoms/controls';
import { FormField } from '../molecules/form-field';
import { QueryState } from '../molecules/query-state';
import { StatCard } from '../molecules/stat-card';

const RANGES = [7, 30, 90] as const;
const MS_PER_DAY = 86_400_000;

const rangeFor = (days: number): { from: string; to: string } => {
  const to = new Date();
  return { from: new Date(to.getTime() - days * MS_PER_DAY).toISOString(), to: to.toISOString() };
};

export function ResolutionPanel() {
  const [days, setDays] = useState<number>(30);
  const [range, setRange] = useState(() => rangeFor(30));
  const metrics = useDashboardResolution(range);

  return (
    <div className="space-y-5">
      <div className="max-w-xs">
        <FormField id="range" label="Periodo (por fecha de resolución)">
          <Select
            id="range"
            value={days}
            onChange={(event) => {
              const next = Number(event.target.value);
              setDays(next);
              setRange(rangeFor(next));
            }}
          >
            {RANGES.map((d) => (
              <option key={d} value={d}>
                Últimos {d} días
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <QueryState isPending={metrics.isPending} error={metrics.error}>
        {metrics.data !== undefined && (
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Resueltas" value={metrics.data.resolvedCount} />
            <StatCard
              label="Tiempo medio de resolución"
              value={formatHours(metrics.data.averageResolutionHours)}
            />
            <StatCard
              label="Cumplimiento de SLA"
              value={formatPercent(metrics.data.slaCompliancePercent)}
              hint={`${String(metrics.data.withinSlaCount)} en plazo · ${String(metrics.data.breachedCount)} fuera de plazo`}
            />
          </dl>
        )}
      </QueryState>
    </div>
  );
}
