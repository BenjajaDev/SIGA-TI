import clsx from 'clsx';

interface SpinnerProps {
  readonly label?: string;
  readonly fullPage?: boolean;
}

export function Spinner({ label = 'Cargando…', fullPage = false }: SpinnerProps) {
  return (
    <div
      role="status"
      className={clsx(
        'flex items-center justify-center gap-3 text-slate-600',
        fullPage ? 'min-h-screen' : 'py-10',
      )}
    >
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
