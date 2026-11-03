import clsx from 'clsx';
import { useBranding } from '../../hooks/use-branding';

export function BrandLogo({ className }: { readonly className?: string }) {
  const { data } = useBranding();
  const name = data?.institutionName ?? 'SIGA-TI';
  if (data?.logoDataUrl !== undefined && data.logoDataUrl !== null) {
    return (
      <img
        src={data.logoDataUrl}
        alt={`Logo de ${name}`}
        className={clsx('h-10 w-auto', className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'grid size-10 place-items-center rounded-lg bg-white/20 text-lg font-bold text-white',
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
