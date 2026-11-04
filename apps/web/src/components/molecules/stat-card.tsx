import clsx from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly hint?: string;
  readonly tone?: 'default' | 'alert';
  readonly icon?: ReactNode;
}

export function StatCard({ label, value, hint, tone = 'default', icon }: StatCardProps) {
  return (
    <div
      className={clsx(
        'group relative min-w-0 overflow-hidden rounded-2xl border bg-surface p-5 shadow-brand-card transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6 motion-reduce:transform-none motion-reduce:transition-none',
        tone === 'alert' ? 'border-red-200' : 'border-slate-200/80',
      )}
    >
      <div
        className={clsx(
          'absolute inset-x-0 top-0 h-1',
          tone === 'alert' ? 'bg-gradient-to-r from-red-500 to-rose-300' : 'bg-brand-gradient',
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <dt className="text-sm font-medium leading-6 text-slate-600 sm:text-base">{label}</dt>
          <dd
            className={clsx(
              'mt-4 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl',
              tone === 'alert' ? 'text-red-700' : 'text-slate-900',
            )}
          >
            {value}
          </dd>
        </div>
        {icon !== undefined && (
          <span
            className={clsx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              tone === 'alert' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-800',
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      {hint !== undefined && <p className="mt-3 text-sm leading-6 text-slate-500">{hint}</p>}
    </div>
  );
}
