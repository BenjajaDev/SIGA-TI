import type { Express } from 'express';
import request, { type Response } from 'supertest';
import type { Priority, TicketStatus } from '@siga/shared';

export const bearer = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
});

export interface TicketBody {
  readonly id: string;
  readonly code: string;
  readonly status: TicketStatus;
  readonly dueAt: string;
  readonly createdAt: string;
  readonly isOverdue: boolean;
  readonly resolvedAt: string | null;
  readonly closedAt: string | null;
  readonly assignee: { id: string; fullName: string } | null;
  readonly requester: { id: string; fullName: string };
}

export interface ErrorBody {
  readonly error: {
    code: string;
    message: string;
    details: { path: string; message: string }[];
    requestId: string;
  };
}

export const errorOf = (response: Response): ErrorBody['error'] =>
  (response.body as ErrorBody).error;

export const ticketOf = (response: Response): TicketBody => response.body as TicketBody;

export const createTicket = async (
  app: Express,
  token: string,
  categoryId: string,
  overrides: Partial<{ title: string; description: string; priority: Priority }> = {},
): Promise<TicketBody> => {
  const response = await request(app)
    .post('/api/v1/tickets')
    .set(bearer(token))
    .send({
      title: 'Falla en equipo de oficina',
      description: 'El equipo no enciende desde esta mañana',
      priority: 'ALTA',
      categoryId,
      ...overrides,
    });
  if (response.status !== 201) {
    throw new Error(
      `createTicket falló: ${String(response.status)} ${JSON.stringify(response.body)}`,
    );
  }
  return ticketOf(response);
};

export const assignTicket = (
  app: Express,
  token: string,
  ticketId: string,
  assigneeId: string,
): request.Test =>
  request(app)
    .put(`/api/v1/tickets/${ticketId}/assignment`)
    .set(bearer(token))
    .send({ assigneeId });

export const transitionTicket = (
  app: Express,
  token: string,
  ticketId: string,
  to: string,
  note?: string,
): request.Test =>
  request(app)
    .post(`/api/v1/tickets/${ticketId}/transitions`)
    .set(bearer(token))
    .send(note === undefined ? { to } : { to, note });
