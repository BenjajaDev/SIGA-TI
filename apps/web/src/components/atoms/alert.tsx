import clsx from 'clsx';
import type { ReactNode } from 'react';

type Tone = 'error' | 'info' | 'success';

const TONE: Readonly<Record<Tone, string>> = {
  error: 'border-red-300 bg-red-50 text-red-900',
  info: 'border-brand-300 bg-blue-50 text-blue-900',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
};

export function Alert({
  tone = 'error',
  children,
}: {
  readonly tone?: Tone;
  readonly children: ReactNode;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx('rounded-md border px-4 py-3 text-sm', TONE[tone])}
    >
      {children}
    </div>
  );
}
