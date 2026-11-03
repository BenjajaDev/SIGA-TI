import { Link, useParams } from 'react-router';
import { useCurrentUser } from '../auth/auth-context';
import { OverdueBadge, PriorityBadge, StatusBadge } from '../components/atoms/badge';
import { Card } from '../components/atoms/card';
import { PageHeader } from '../components/molecules/page-header';
import { QueryState } from '../components/molecules/query-state';
import { CommentThread } from '../components/organisms/comment-thread';
import { EventTimeline } from '../components/organisms/event-timeline';
import { TicketActions } from '../components/organisms/ticket-actions';
import { useTicket, useTicketEvents } from '../hooks/use-tickets';
import { formatDateTime } from '../lib/format';
import { isApiError } from '../services/api-error';

export function TicketDetailPage() {
  const { ticketId = '' } = useParams();
  const user = useCurrentUser();
  const ticket = useTicket(ticketId);
  const events = useTicketEvents(ticketId);

  if (isApiError(ticket.error) && ticket.error.status === 404) {
    return (
      <div>
        <PageHeader
          title="Solicitud no encontrada"
          subtitle="No existe o no tiene acceso a ella."
        />
        <Link to="/tickets" className="font-medium text-brand-700 underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <QueryState
      isPending={ticket.isPending}
      error={ticket.error}
      onRetry={() => void ticket.refetch()}
    >
      {ticket.data !== undefined && (
        <div>
          <PageHeader
            title={`${ticket.data.code} · ${ticket.data.title}`}
            subtitle={`${ticket.data.category.name} · registrada por ${ticket.data.requester.fullName}`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={ticket.data.status} />
                <PriorityBadge priority={ticket.data.priority} />
                {ticket.data.isOverdue && <OverdueBadge />}
              </div>
            }
          />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card title="Descripción">
                <p className="whitespace-pre-wrap text-sm text-slate-800">
                  {ticket.data.description}
                </p>
                <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Asignado a</dt>
                    <dd className="font-medium">
                      {ticket.data.assignee?.fullName ?? 'Sin asignar'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Vence</dt>
                    <dd className="font-medium">{formatDateTime(ticket.data.dueAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Creada</dt>
                    <dd className="font-medium">{formatDateTime(ticket.data.createdAt)}</dd>
                  </div>
                  {ticket.data.resolvedAt !== null && (
                    <div>
                      <dt className="text-slate-500">Resuelta</dt>
                      <dd className="font-medium">{formatDateTime(ticket.data.resolvedAt)}</dd>
                    </div>
                  )}
                </dl>
              </Card>
              <Card title="Comentarios">
                <CommentThread ticket={ticket.data} user={user} />
              </Card>
            </div>
            <div className="space-y-6">
              <Card title="Acciones">
                <TicketActions ticket={ticket.data} user={user} />
              </Card>
              <Card title="Historial">
                <QueryState isPending={events.isPending} error={events.error}>
                  <EventTimeline events={events.data ?? []} />
                </QueryState>
              </Card>
            </div>
          </div>
        </div>
      )}
    </QueryState>
  );
}
