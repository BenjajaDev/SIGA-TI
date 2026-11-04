import type { ReactNode } from 'react';

interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="page-enter relative mb-6 overflow-hidden rounded-2xl bg-brand-gradient px-5 py-5 text-white shadow-brand-card sm:px-7">
      <div
        aria-hidden="true"
        className="pattern-grid mask-fade-left pointer-events-none absolute inset-0"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle !== undefined && (
            <p className="mt-1 max-w-2xl text-sm text-white/85">{subtitle}</p>
          )}
        </div>
        {actions !== undefined && actions !== false && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
