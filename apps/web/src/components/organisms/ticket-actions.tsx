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
import { STATUS_LABEL, transitionLabel } from '../../lib/labels';
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
      <div className="flex items-start gap-3 rounded-xl border border-surface-border bg-surface-muted p-3.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M12 8v4m0 4h.01M4.93 19h14.14a1.5 1.5 0 0 0 1.3-2.25L13.3 4.5a1.5 1.5 0 0 0-2.6 0L3.63 16.75A1.5 1.5 0 0 0 4.93 19Z"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="text-sm leading-5 text-slate-600">
          {user.role === 'ADMIN'
            ? 'El administrador cuenta con acceso de consulta; la gestión corresponde al supervisor, al técnico asignado o al solicitante.'
            : user.role === 'TECNICO'
              ? 'Solo el técnico asignado puede cambiar el estado de esta solicitud.'
              : user.role === 'SUPERVISOR'
                ? `No hay transiciones disponibles desde el estado ${STATUS_LABEL[ticket.status]}.`
                : ticket.status === 'CERRADA'
                  ? 'La solicitud está cerrada y no admite más cambios.'
                  : 'Podrá cerrar o reabrir la solicitud cuando se encuentre resuelta.'}
        </p>
      </div>
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
