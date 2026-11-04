import clsx from 'clsx';
import type { ComponentPropsWithRef } from 'react';

const CONTROL =
  'block w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-slate-900 shadow-sm ' +
  'placeholder:text-slate-400 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-0 ' +
  'focus-visible:outline-brand-700 disabled:bg-surface-muted disabled:text-slate-500';

const border = (invalid: boolean | undefined): string =>
  invalid === true ? 'border-red-500' : 'border-surface-border';

type WithInvalid<T> = T & { readonly invalid?: boolean };

export function Input({
  invalid,
  className,
  ...rest
}: WithInvalid<ComponentPropsWithRef<'input'>>) {
  return (
    <input
      aria-invalid={invalid === true ? true : undefined}
      className={clsx(CONTROL, border(invalid), className)}
      {...rest}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...rest
}: WithInvalid<ComponentPropsWithRef<'textarea'>>) {
  return (
    <textarea
      aria-invalid={invalid === true ? true : undefined}
      className={clsx(CONTROL, 'min-h-24', border(invalid), className)}
      {...rest}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...rest
}: WithInvalid<ComponentPropsWithRef<'select'>>) {
  return (
    <select
      aria-invalid={invalid === true ? true : undefined}
      className={clsx(CONTROL, border(invalid), className)}
      {...rest}
    >
      {children}
    </select>
  );
}
