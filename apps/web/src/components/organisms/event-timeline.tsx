import type { TicketEvent } from '@siga/shared';
import { formatDateTime } from '../../lib/format';
import { describeEvent } from '../../lib/labels';

export function EventTimeline({ events }: { readonly events: readonly TicketEvent[] }) {
  return (
    <ol className="relative space-y-4 border-l-2 border-brand-100 pl-5">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[1.6rem] top-1.5 size-3 rounded-full border-2 border-white bg-brand-700"
          />
          <p className="text-sm font-medium text-slate-900">{describeEvent(event)}</p>
          {event.note !== null && (
            <p className="mt-1 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {event.note}
            </p>
          )}
          <time dateTime={event.createdAt} className="text-xs text-slate-500">
            {formatDateTime(event.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
