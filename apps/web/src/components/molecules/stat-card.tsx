import clsx from 'clsx';

interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly hint?: string;
  readonly tone?: 'default' | 'alert';
}

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd
        className={clsx(
          'mt-1 text-3xl font-semibold',
          tone === 'alert' ? 'text-red-700' : 'text-slate-900',
        )}
      >
        {value}
      </dd>
      {hint !== undefined && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
