import clsx from 'clsx';
import type { ReactNode } from 'react';

interface CardProps {
  readonly title?: string;
  readonly actions?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Card({ title, actions, className, children }: CardProps) {
  return (
    <section
      className={clsx(
        'card-lift overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-brand-card transition-transform duration-300 motion-reduce:transition-none',
        className,
      )}
    >
      {title !== undefined && (
        <header className="flex items-center justify-between gap-3 border-b border-surface-border bg-surface/75 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
