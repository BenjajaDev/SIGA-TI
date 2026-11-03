import type { Priority, TicketStatus } from '@siga/shared';

export interface Tone {
  readonly badge: string;
  readonly chart: string;
}

export const STATUS_TONE: Readonly<Record<TicketStatus, Tone>> = {
  ABIERTA: { badge: 'bg-slate-100 text-slate-800 ring-slate-300', chart: '#64748b' },
  ASIGNADA: { badge: 'bg-indigo-50 text-indigo-800 ring-indigo-200', chart: '#4f46e5' },
  EN_PROGRESO: { badge: 'bg-blue-50 text-blue-800 ring-blue-200', chart: '#2563eb' },
  EN_ESPERA: { badge: 'bg-amber-50 text-amber-900 ring-amber-300', chart: '#d97706' },
  RESUELTA: { badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200', chart: '#059669' },
  CERRADA: { badge: 'bg-zinc-100 text-zinc-700 ring-zinc-300', chart: '#71717a' },
};

export const PRIORITY_TONE: Readonly<Record<Priority, string>> = {
  CRITICA: 'bg-red-50 text-red-800 ring-red-200',
  ALTA: 'bg-orange-50 text-orange-800 ring-orange-200',
  MEDIA: 'bg-yellow-50 text-yellow-900 ring-yellow-300',
  BAJA: 'bg-slate-50 text-slate-700 ring-slate-200',
};
