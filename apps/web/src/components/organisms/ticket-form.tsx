import { zodResolver } from '@hookform/resolvers/zod';
import { createTicketRequestSchema, PRIORITIES, type Category, type User } from '@siga/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { applyApiErrors } from '../../lib/form-errors';
import { PRIORITY_LABEL } from '../../lib/labels';
import { Alert } from '../atoms/alert';
import { Button } from '../atoms/button';
import { Input, Select, Textarea } from '../atoms/controls';
import { FormField } from '../molecules/form-field';

type Values = z.input<typeof createTicketRequestSchema>;
const FIELDS = ['title', 'description', 'categoryId', 'priority', 'requesterId'];

interface TicketFormProps {
  readonly categories: readonly Category[];
  /** Solo el supervisor puede registrar a nombre de otra persona. */
  readonly requesters: readonly User[] | null;
  readonly onSubmit: (values: Values) => Promise<void>;
}

export function TicketForm({ categories, requesters, onSubmit }: TicketFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values, unknown, z.output<typeof createTicketRequestSchema>>({
    resolver: zodResolver(createTicketRequestSchema),
    defaultValues: { priority: 'MEDIA' },
  });

  const submit = handleSubmit(async ({ requesterId, ...rest }) => {
    setServerError(null);
    try {
      await onSubmit({
        ...rest,
        ...(requesterId !== undefined && requesterId !== '' && { requesterId }),
      });
    } catch (error) {
      setServerError(applyApiErrors(error, setError, FIELDS));
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="space-y-5">
      {serverError !== null && <Alert>{serverError}</Alert>}
      <FormField
        id="title"
        label="Título"
        error={errors.title?.message}
        hint="Resuma el problema en una frase"
      >
        <Input id="title" invalid={errors.title !== undefined} {...register('title')} />
      </FormField>
      <FormField id="description" label="Descripción" error={errors.description?.message}>
        <Textarea
          id="description"
          rows={5}
          invalid={errors.description !== undefined}
          {...register('description')}
        />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="categoryId" label="Categoría" error={errors.categoryId?.message}>
          <Select
            id="categoryId"
            invalid={errors.categoryId !== undefined}
            defaultValue=""
            {...register('categoryId')}
          >
            <option value="" disabled>
              Seleccione…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="priority" label="Prioridad" error={errors.priority?.message}>
          <Select id="priority" invalid={errors.priority !== undefined} {...register('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      {requesters !== null && (
        <FormField
          id="requesterId"
          label="Registrar a nombre de"
          hint="Déjelo vacío para registrarla a su nombre"
          error={errors.requesterId?.message}
        >
          <Select id="requesterId" defaultValue="" {...register('requesterId')}>
            <option value="">Yo mismo</option>
            {requesters.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </Select>
        </FormField>
      )}
      <Button type="submit" loading={isSubmitting}>
        Registrar solicitud
      </Button>
    </form>
  );
}
