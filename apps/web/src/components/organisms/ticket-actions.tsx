import {
  availableTransitions,
  canAssign,
  type Ticket,
  type TransitionRule,
  type User,
} from '@siga/shared';
import { useState } from 'react';
import { useUsers } from '../../hooks/use-catalog';
import { useAssignTicket, useTransitionTicket } from '../../hooks/use-tickets';
import { transitionLabel } from '../../lib/labels';
import { actorContextFor } from '../../lib/ticket-context';
import { errorMessage } from '../../services/api-error';
import { Alert } from '../atoms/alert';
import { Button } from '../atoms/button';
import { Select, Textarea } from '../atoms/controls';
import { FormField } from '../molecules/form-field';

function TransitionPanel({ ticket, user }: { readonly ticket: Ticket; readonly user: User }) {
  const mutation = useTransitionTicket(ticket.id);
  const [pending, setPending] = useState<TransitionRule | null>(null);
  const [note, setNote] = useState('');
  const rules = availableTransitions(ticket.status, actorContextFor(user, ticket));

  if (rules.length === 0) {
    return (
      <p className="text-sm text-slate-500">No tiene acciones disponibles sobre esta solicitud.</p>
    );
  }

  const run = (rule: TransitionRule, text: string): void => {
    const trimmed = text.trim();
    mutation.mutate(
      {
        to: rule.to as 'EN_PROGRESO' | 'EN_ESPERA' | 'RESUELTA' | 'CERRADA',
        ...(trimmed !== '' && { note: trimmed }),
      },
      {
        onSuccess: () => {
          setPending(null);
          setNote('');
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      {mutation.error !== null && <Alert>{errorMessage(mutation.error)}</Alert>}
      <div className="flex flex-wrap gap-2">
        {rules.map((rule) => (
          <Button
            key={rule.to}
            variant={pending?.to === rule.to ? 'primary' : 'secondary'}
            loading={mutation.isPending && pending === null}
            onClick={() => {
              mutation.reset();
              if (rule.noteRequired) setPending(rule);
              else run(rule, '');
            }}
          >
            {transitionLabel(rule.from, rule.to)}
          </Button>
        ))}
      </div>
      {pending !== null && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(pending, note);
          }}
        >
          <FormField
            id="transition-note"
            label={`Nota para «${transitionLabel(pending.from, pending.to)}» (obligatoria)`}
          >
            <Textarea
              id="transition-note"
              rows={3}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
              }}
              required
              minLength={3}
            />
          </FormField>
          <div className="flex gap-2">
            <Button type="submit" loading={mutation.isPending} disabled={note.trim().length < 3}>
              Confirmar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPending(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function AssignPanel({ ticket }: { readonly ticket: Ticket }) {
  const technicians = useUsers({ role: 'TECNICO', isActive: true });
  const mutation = useAssignTicket(ticket.id);
  const [selected, setSelected] = useState('');
  const isReassign = ticket.assignee !== null;

  return (
    <div className="space-y-2">
      {mutation.error !== null && <Alert>{errorMessage(mutation.error)}</Alert>}
      <FormField id="assignee" label={isReassign ? 'Reasignar a' : 'Asignar a'}>
        <Select
          id="assignee"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
          }}
        >
          <option value="">Seleccione un técnico…</option>
          {(technicians.data ?? [])
            .filter((t) => t.id !== ticket.assignee?.id)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
        </Select>
      </FormField>
      <Button
        loading={mutation.isPending}
        disabled={selected === ''}
        onClick={() => {
          mutation.mutate(selected, {
            onSuccess: () => {
              setSelected('');
            },
          });
        }}
      >
        {isReassign ? 'Reasignar' : 'Asignar'}
      </Button>
    </div>
  );
}

export function TicketActions({ ticket, user }: { readonly ticket: Ticket; readonly user: User }) {
  return (
    <div className="space-y-6">
      <TransitionPanel ticket={ticket} user={user} />
      {canAssign(ticket.status, user.role) && <AssignPanel ticket={ticket} />}
    </div>
  );
}
