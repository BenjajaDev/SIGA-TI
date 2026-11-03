import { listTicketsQuerySchema } from '@siga/shared';
import { Link, useSearchParams } from 'react-router';
import { useCurrentUser } from '../auth/auth-context';
import { buttonClasses } from '../components/atoms/button';
import { EmptyState, QueryState } from '../components/molecules/query-state';
import { PageHeader } from '../components/molecules/page-header';
import { Pagination } from '../components/molecules/pagination';
import { TicketFilters } from '../components/organisms/ticket-filters';
import { TicketTable } from '../components/organisms/ticket-table';
import { useCategories, useUsers } from '../hooks/use-catalog';
import { useTicketList } from '../hooks/use-tickets';
import type { TicketListParams } from '../services/ticket-service';

const toParams = (search: URLSearchParams): TicketListParams => {
  const parsed = listTicketsQuerySchema.safeParse(Object.fromEntries(search));
  if (!parsed.success) return { page: 1 };
  const { page, pageSize, ...filters } = parsed.data;
  return { ...filters, page, pageSize };
};

const toSearch = (params: TicketListParams): Record<string, string> =>
  Object.fromEntries(
    Object.entries(params)
      .filter(([key, value]) => value !== undefined && !(key === 'page' && value === 1))
      .map(([key, value]) => [key, String(value)]),
  );

export function TicketsPage() {
  const user = useCurrentUser();
  const [search, setSearch] = useSearchParams();
  const params = toParams(search);
  const tickets = useTicketList(params);
  const categories = useCategories();
  const isStaff = user.role === 'SUPERVISOR' || user.role === 'ADMIN';
  const technicians = useUsers({ role: 'TECNICO', isActive: true }, isStaff);

  return (
    <div>
      <PageHeader
        title="Solicitudes"
        subtitle={
          isStaff ? 'Todas las solicitudes del sistema' : 'Solicitudes en las que participa'
        }
        actions={
          user.role !== 'ADMIN' && (
            <Link to="/tickets/nueva" className={buttonClasses('primary')}>
              Nueva solicitud
            </Link>
          )
        }
      />
      <TicketFilters
        value={params}
        categories={categories.data ?? []}
        technicians={isStaff ? (technicians.data ?? []) : null}
        onChange={(next) => {
          setSearch(toSearch(next));
        }}
      />
      <QueryState
        isPending={tickets.isPending}
        error={tickets.error}
        onRetry={() => void tickets.refetch()}
      >
        {tickets.data?.items.length === 0 ? (
          <EmptyState
            title="No hay solicitudes"
            description="Pruebe con otros filtros o registre una nueva."
          />
        ) : (
          tickets.data !== undefined && (
            <>
              <TicketTable tickets={tickets.data.items} />
              <Pagination
                page={tickets.data.page}
                totalPages={tickets.data.totalPages}
                totalItems={tickets.data.totalItems}
                onChange={(page) => {
                  setSearch(toSearch({ ...params, page }));
                }}
              />
            </>
          )
        )}
      </QueryState>
    </div>
  );
}
