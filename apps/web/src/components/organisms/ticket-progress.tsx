import clsx from 'clsx';
import type { TicketStatus } from '@siga/shared';
import { STATUS_LABEL } from '../../lib/labels';

const STEPS: readonly TicketStatus[] = [
  'ABIERTA',
  'ASIGNADA',
  'EN_PROGRESO',
  'RESUELTA',
  'CERRADA',
];

const stepIndexOf = (status: TicketStatus): number =>
  status === 'EN_ESPERA' ? STEPS.indexOf('EN_PROGRESO') : STEPS.indexOf(status);

export function TicketProgress({ status }: { readonly status: TicketStatus }) {
  const current = stepIndexOf(status);
  const paused = status === 'EN_ESPERA';

  return (
    <ol aria-label="Progreso de la solicitud" className="flex items-start">
      {STEPS.map((step, index) => {
        const done = index < current || status === 'CERRADA';
        const active = index === current && status !== 'CERRADA';
        return (
          <li
            key={step}
            aria-current={active ? 'step' : undefined}
            className="relative flex flex-1 flex-col items-center gap-2 text-center"
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className={clsx(
                  'absolute left-[-50%] top-4 h-1 w-full rounded-full',
                  index <= current || status === 'CERRADA' ? 'bg-brand-gradient' : 'bg-slate-200',
                )}
              />
            )}
            <span
              className={clsx(
                'relative z-10 grid size-8 place-items-center rounded-full text-xs font-semibold ring-4 ring-surface',
                done || active
                  ? 'bg-brand-gradient text-white shadow-sm'
                  : 'bg-slate-200 text-slate-600',
                active && !paused && 'ring-brand-100',
                paused && active && 'bg-amber-500',
              )}
            >
              {done ? '✓' : index + 1}
            </span>
            <span
              className={clsx(
                'text-xs',
                active ? 'font-semibold text-slate-900' : 'text-slate-600',
              )}
            >
              {active && paused ? STATUS_LABEL.EN_ESPERA : STATUS_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
