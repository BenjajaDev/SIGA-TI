import { PRIORITIES, TICKET_STATUSES, type Category, type User } from '@siga/shared';
import { PRIORITY_LABEL, STATUS_LABEL } from '../../lib/labels';
import type { TicketListParams } from '../../services/ticket-service';
import { Select } from '../atoms/controls';
import { Button } from '../atoms/button';
import { FormField } from '../molecules/form-field';

interface TicketFiltersProps {
  readonly value: TicketListParams;
  readonly categories: readonly Category[];
  readonly technicians: readonly User[] | null;
  readonly onChange: (next: TicketListParams) => void;
}

export function TicketFilters({ value, categories, technicians, onChange }: TicketFiltersProps) {
  const set = (patch: Partial<TicketListParams>): void => {
    onChange({ ...value, ...patch, page: 1 });
  };

  return (
    <form
      aria-label="Filtros"
      className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <FormField id="f-status" label="Estado">
        <Select
          id="f-status"
          value={value.status ?? ''}
          onChange={(e) => {
            set({
              status:
                e.target.value === '' ? undefined : (e.target.value as TicketListParams['status']),
            });
          }}
        >
          <option value="">Todos</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField id="f-priority" label="Prioridad">
        <Select
          id="f-priority"
          value={value.priority ?? ''}
          onChange={(e) => {
            set({
              priority:
                e.target.value === ''
                  ? undefined
                  : (e.target.value as TicketListParams['priority']),
            });
          }}
        >
          <option value="">Todas</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField id="f-category" label="Categoría">
        <Select
          id="f-category"
          value={value.categoryId ?? ''}
          onChange={(e) => {
            set({ categoryId: e.target.value === '' ? undefined : e.target.value });
          }}
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </FormField>
      {technicians !== null && (
        <FormField id="f-assignee" label="Asignado a">
          <Select
            id="f-assignee"
            value={value.assigneeId ?? ''}
            onChange={(e) => {
              set({ assigneeId: e.target.value === '' ? undefined : e.target.value });
            }}
          >
            <option value="">Todos</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      <div className="flex items-end">
        <Button
          variant="ghost"
          onClick={() => {
            onChange({ page: 1 });
          }}
        >
          Limpiar filtros
        </Button>
      </div>
    </form>
  );
}
