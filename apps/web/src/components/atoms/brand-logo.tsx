import clsx from 'clsx';
import { useBranding } from '../../hooks/use-branding';

interface BrandLogoProps {
  readonly className?: string;
  readonly size?: 'small' | 'medium' | 'large';
}

const SIZE_CLASS = {
  small: 'size-8',
  medium: 'size-10',
  large: 'size-14',
} as const;

export function BrandLogo({ className, size = 'medium' }: BrandLogoProps) {
  const { data } = useBranding();
  const name = data?.institutionName ?? 'SIGA-TI';
  if (data?.logoDataUrl !== undefined && data.logoDataUrl !== null) {
    return (
      <img
        src={data.logoDataUrl}
        alt={`Logo de ${name}`}
        className={clsx(
          SIZE_CLASS[size],
          'shrink-0 rounded-md border border-slate-200 bg-white p-1.5 object-contain',
          className,
        )}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'grid place-items-center rounded-md bg-white/20 text-lg font-bold text-white',
        SIZE_CLASS[size],
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
