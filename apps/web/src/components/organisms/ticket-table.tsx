import type { Ticket } from '@siga/shared';
import { Link } from 'react-router';
import { formatDateTime } from '../../lib/format';
import { OverdueBadge, PriorityBadge, StatusBadge } from '../atoms/badge';

export function TicketTable({ tickets }: { readonly tickets: readonly Ticket[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface shadow-brand-card">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <caption className="sr-only">Listado de solicitudes</caption>
        <thead className="bg-brand-gradient-soft text-left text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th scope="col" className="px-4 py-3">
              Código
            </th>
            <th scope="col" className="px-4 py-3">
              Título
            </th>
            <th scope="col" className="px-4 py-3">
              Estado
            </th>
            <th scope="col" className="px-4 py-3">
              Prioridad
            </th>
            <th scope="col" className="px-4 py-3">
              Asignado a
            </th>
            <th scope="col" className="px-4 py-3">
              Vence
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="transition-colors duration-200 hover:bg-brand-50/70">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{ticket.code}</td>
              <td className="px-4 py-3">
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {ticket.title}
                </Link>
                <p className="text-xs text-slate-500">
                  {ticket.category.name} · {ticket.requester.fullName}
                </p>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={ticket.status} />
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={ticket.priority} />
              </td>
              <td className="px-4 py-3">
                {ticket.assignee?.fullName ?? <span className="text-slate-400">Sin asignar</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {formatDateTime(ticket.dueAt)} {ticket.isOverdue && <OverdueBadge />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
