import type { TicketStatus } from '@siga/shared';
import type { Actor, Ticket } from '../../src/domain/entities';

export const REQUESTER: Actor = { id: 'req-1', role: 'SOLICITANTE' };
export const ASSIGNEE: Actor = { id: 'tec-1', role: 'TECNICO' };
export const OTHER_TECH: Actor = { id: 'tec-2', role: 'TECNICO' };
export const SUPERVISOR: Actor = { id: 'sup-1', role: 'SUPERVISOR' };
export const ADMIN: Actor = { id: 'adm-1', role: 'ADMIN' };
export const OTHER_REQUESTER: Actor = { id: 'req-2', role: 'SOLICITANTE' };

export const buildTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 't-1',
  number: 1,
  code: 'SIGA-000001',
  title: 'Título de prueba',
  description: 'Descripción de prueba',
  category: { id: 'c-1', name: 'Redes y conectividad' },
  priority: 'MEDIA',
  status: 'ASIGNADA',
  requester: { id: REQUESTER.id, fullName: 'Solicitante' },
  assignee: { id: ASSIGNEE.id, fullName: 'Técnico' },
  dueAt: new Date('2026-01-04T00:00:00Z'),
  resolvedAt: null,
  closedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

export const ticketIn = (status: TicketStatus): Ticket =>
  buildTicket({
    status,
    assignee: status === 'ABIERTA' ? null : { id: ASSIGNEE.id, fullName: 'Técnico' },
    resolvedAt:
      status === 'RESUELTA' || status === 'CERRADA' ? new Date('2026-01-02T00:00:00Z') : null,
    closedAt: status === 'CERRADA' ? new Date('2026-01-03T00:00:00Z') : null,
  });
