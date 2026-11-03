import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT: Readonly<Record<Variant, string>> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-300',
  secondary:
    'bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-red-300',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:text-slate-400',
};

export const buttonClasses = (variant: Variant = 'primary'): string =>
  clsx(
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
    'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700',
    VARIANT[variant],
  );

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  readonly variant?: Variant;
  readonly loading?: boolean;
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
        'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700',
        'disabled:cursor-not-allowed',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {loading ? 'Procesando…' : children}
    </button>
  );
}
