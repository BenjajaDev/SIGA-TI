import type {
  CommentVisibility,
  Priority,
  Role,
  TicketEvent,
  TicketEventType,
  TicketStatus,
} from '@siga/shared';

export const STATUS_LABEL: Readonly<Record<TicketStatus, string>> = {
  ABIERTA: 'Abierta',
  ASIGNADA: 'Asignada',
  EN_PROGRESO: 'En progreso',
  EN_ESPERA: 'En espera',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
};

export const PRIORITY_LABEL: Readonly<Record<Priority, string>> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
};

export const ROLE_LABEL: Readonly<Record<Role, string>> = {
  SOLICITANTE: 'Solicitante',
  TECNICO: 'Técnico',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Administrador',
};

export const VISIBILITY_LABEL: Readonly<Record<CommentVisibility, string>> = {
  PUBLICO: 'Público',
  INTERNO: 'Interno',
};

const TRANSITION_LABELS: Readonly<Record<string, string>> = {
  'ASIGNADA>EN_PROGRESO': 'Iniciar trabajo',
  'EN_PROGRESO>EN_ESPERA': 'Poner en espera',
  'EN_ESPERA>EN_PROGRESO': 'Reanudar',
  'EN_PROGRESO>RESUELTA': 'Marcar como resuelta',
  'RESUELTA>CERRADA': 'Cerrar solicitud',
  'RESUELTA>EN_PROGRESO': 'Reabrir',
};

export const transitionLabel = (from: TicketStatus, to: TicketStatus): string =>
  TRANSITION_LABELS[`${from}>${to}`] ?? STATUS_LABEL[to];

export const EVENT_TYPE_LABEL: Readonly<Record<TicketEventType, string>> = {
  CREATED: 'Solicitud creada',
  ASSIGNED: 'Asignación',
  REASSIGNED: 'Reasignación',
  STATUS_CHANGED: 'Cambio de estado',
};

export const describeEvent = (event: TicketEvent): string => {
  const actor = event.actor.fullName;
  switch (event.type) {
    case 'CREATED':
      return `${actor} registró la solicitud`;
    case 'ASSIGNED':
      return `${actor} asignó la solicitud a ${event.toAssignee?.fullName ?? 'un técnico'}`;
    case 'REASSIGNED':
      return `${actor} reasignó de ${event.fromAssignee?.fullName ?? '—'} a ${event.toAssignee?.fullName ?? '—'}`;
    case 'STATUS_CHANGED': {
      const from = event.fromStatus === null ? '—' : STATUS_LABEL[event.fromStatus];
      const to = event.toStatus === null ? '—' : STATUS_LABEL[event.toStatus];
      return `${actor} cambió el estado de ${from} a ${to}`;
    }
  }
};
