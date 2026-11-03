import clsx from 'clsx';
import type { Priority, TicketStatus } from '@siga/shared';
import { PRIORITY_LABEL, STATUS_LABEL } from '../../lib/labels';
import { PRIORITY_TONE, STATUS_TONE } from '../../lib/status-style';

const BASE =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';

export function StatusBadge({ status }: { readonly status: TicketStatus }) {
  return <span className={clsx(BASE, STATUS_TONE[status].badge)}>{STATUS_LABEL[status]}</span>;
}

export function PriorityBadge({ priority }: { readonly priority: Priority }) {
  return <span className={clsx(BASE, PRIORITY_TONE[priority])}>{PRIORITY_LABEL[priority]}</span>;
}

export function OverdueBadge() {
  return <span className={clsx(BASE, 'bg-red-600 text-white ring-red-700')}>Vencida</span>;
}
