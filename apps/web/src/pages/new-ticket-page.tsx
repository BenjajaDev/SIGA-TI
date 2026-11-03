import { useNavigate } from 'react-router';
import { useCurrentUser } from '../auth/auth-context';
import { Card } from '../components/atoms/card';
import { PageHeader } from '../components/molecules/page-header';
import { QueryState } from '../components/molecules/query-state';
import { TicketForm } from '../components/organisms/ticket-form';
import { useCategories, useUsers } from '../hooks/use-catalog';
import { useCreateTicket } from '../hooks/use-tickets';

export function NewTicketPage() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const categories = useCategories();
  const isSupervisor = user.role === 'SUPERVISOR';
  const users = useUsers({ isActive: true }, isSupervisor);
  const create = useCreateTicket();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nueva solicitud" subtitle="Describa el problema o requerimiento de TI." />
      <Card>
        <QueryState isPending={categories.isPending} error={categories.error}>
          <TicketForm
            categories={categories.data ?? []}
            requesters={isSupervisor ? (users.data ?? []).filter((u) => u.role !== 'ADMIN') : null}
            onSubmit={async (values) => {
              const ticket = await create.mutateAsync(values);
              void navigate(`/tickets/${ticket.id}`);
            }}
          />
        </QueryState>
      </Card>
    </div>
  );
}
