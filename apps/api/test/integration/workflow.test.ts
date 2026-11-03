import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assignTicket,
  bearer,
  createTicket,
  errorOf,
  ticketOf,
  transitionTicket,
  type TicketBody,
} from '../helpers/api';
import { createTestContext, firstCategoryId, loginAs, userIdOf } from '../helpers/context';

const ctx = createTestContext();

let solicitante: string;
let solicitante2: string;
let supervisor: string;
let admin: string;
let tecnico1: string;
let tecnico2: string;
let tecnico1Id: string;
let tecnico2Id: string;
let ticket: TicketBody;

beforeAll(() => ctx.reset());
beforeEach(async () => {
  await ctx.reset();
  const categoryId = await firstCategoryId(ctx.db);
  [solicitante, solicitante2, supervisor, admin, tecnico1, tecnico2] = await Promise.all([
    loginAs(ctx.app, 'solicitante1'),
    loginAs(ctx.app, 'solicitante2'),
    loginAs(ctx.app, 'supervisor'),
    loginAs(ctx.app, 'admin'),
    loginAs(ctx.app, 'tecnico1'),
    loginAs(ctx.app, 'tecnico2'),
  ]);
  [tecnico1Id, tecnico2Id] = await Promise.all([
    userIdOf(ctx.db, 'tecnico1'),
    userIdOf(ctx.db, 'tecnico2'),
  ]);
  ticket = await createTicket(ctx.app, solicitante, categoryId);
});
afterAll(() => ctx.close());

const assigned = async (): Promise<void> => {
  const response = await assignTicket(ctx.app, supervisor, ticket.id, tecnico1Id);
  expect(response.status).toBe(200);
};

const inProgress = async (): Promise<void> => {
  await assigned();
  expect((await transitionTicket(ctx.app, tecnico1, ticket.id, 'EN_PROGRESO')).status).toBe(200);
};

const resolved = async (): Promise<void> => {
  await inProgress();
  const response = await transitionTicket(
    ctx.app,
    tecnico1,
    ticket.id,
    'RESUELTA',
    'Equipo reemplazado',
  );
  expect(response.status).toBe(200);
};

describe('asignación (RF-06)', () => {
  it('ABIERTA → ASIGNADA con evento ASSIGNED', async () => {
    const response = await assignTicket(ctx.app, supervisor, ticket.id, tecnico1Id);
    expect(response.status).toBe(200);
    expect(ticketOf(response)).toMatchObject({ status: 'ASIGNADA' });
    expect(ticketOf(response).assignee?.id).toBe(tecnico1Id);

    const events = await ctx.db.ticketEvent.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(events.map((e) => e.type)).toEqual(['CREATED', 'ASSIGNED']);
    expect(events[1]).toMatchObject({
      fromStatus: 'ABIERTA',
      toStatus: 'ASIGNADA',
      toAssigneeId: tecnico1Id,
    });
  });

  it('reasignar cambia el técnico sin cambiar el estado y deja evento REASSIGNED', async () => {
    await inProgress();
    const response = await assignTicket(ctx.app, supervisor, ticket.id, tecnico2Id);
    expect(response.status).toBe(200);
    expect(ticketOf(response).status).toBe('EN_PROGRESO');
    expect(ticketOf(response).assignee?.id).toBe(tecnico2Id);

    const last = await ctx.db.ticketEvent.findFirstOrThrow({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(last).toMatchObject({
      type: 'REASSIGNED',
      fromAssigneeId: tecnico1Id,
      toAssigneeId: tecnico2Id,
    });

    const oldTech = await transitionTicket(
      ctx.app,
      tecnico1,
      ticket.id,
      'EN_ESPERA',
      'Esperando repuesto',
    );
    expect(oldTech.status).toBe(404);
  });

  it.each([
    ['solicitante', 'solicitante1'],
    ['técnico', 'tecnico1'],
    ['admin', 'admin'],
  ] as const)('solo el supervisor asigna (%s → 403 o 404)', async (_name, key) => {
    const token = await loginAs(ctx.app, key);
    const response = await assignTicket(ctx.app, token, ticket.id, tecnico1Id);
    expect([403, 404]).toContain(response.status);
    if (key === 'solicitante1' || key === 'admin') expect(response.status).toBe(403);
  });

  it('409 INVALID_ASSIGNEE si el destino no es un técnico activo', async () => {
    const cases = [
      await userIdOf(ctx.db, 'solicitante2'),
      await userIdOf(ctx.db, 'supervisor'),
      '00000000-0000-4000-8000-000000000000',
    ];
    for (const assigneeId of cases) {
      const response = await assignTicket(ctx.app, supervisor, ticket.id, assigneeId);
      expect(response.status).toBe(409);
      expect(errorOf(response).code).toBe('INVALID_ASSIGNEE');
    }
    await ctx.db.user.update({ where: { id: tecnico2Id }, data: { isActive: false } });
    const inactive = await assignTicket(ctx.app, supervisor, ticket.id, tecnico2Id);
    expect(errorOf(inactive).code).toBe('INVALID_ASSIGNEE');
  });

  it('409 si ya está asignada a ese técnico', async () => {
    await assigned();
    const response = await assignTicket(ctx.app, supervisor, ticket.id, tecnico1Id);
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('INVALID_ASSIGNEE');
  });

  it('409 INVALID_TRANSITION al asignar una solicitud resuelta o cerrada', async () => {
    await resolved();
    const response = await assignTicket(ctx.app, supervisor, ticket.id, tecnico2Id);
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('INVALID_TRANSITION');
  });

  it('400 con identificador de técnico inválido', async () => {
    const response = await assignTicket(ctx.app, supervisor, ticket.id, 'no-uuid');
    expect(response.status).toBe(400);
  });
});

describe('transiciones (RF-07, RF-13)', () => {
  it('recorre el ciclo completo con historial coherente', async () => {
    ctx.clock.advanceHours(1);
    await assigned();
    ctx.clock.advanceHours(1);
    await transitionTicket(ctx.app, tecnico1, ticket.id, 'EN_PROGRESO');
    ctx.clock.advanceHours(1);
    await transitionTicket(ctx.app, tecnico1, ticket.id, 'EN_ESPERA', 'Esperando repuesto');
    ctx.clock.advanceHours(1);
    await transitionTicket(ctx.app, tecnico1, ticket.id, 'EN_PROGRESO');
    ctx.clock.advanceHours(1);
    const resolvedResponse = await transitionTicket(
      ctx.app,
      tecnico1,
      ticket.id,
      'RESUELTA',
      'Repuesto instalado',
    );
    expect(ticketOf(resolvedResponse).resolvedAt).not.toBeNull();
    ctx.clock.advanceHours(1);
    const closed = await transitionTicket(ctx.app, solicitante, ticket.id, 'CERRADA');

    expect(closed.status).toBe(200);
    expect(ticketOf(closed)).toMatchObject({ status: 'CERRADA' });
    expect(ticketOf(closed).closedAt).not.toBeNull();
    expect(ticketOf(closed).resolvedAt).not.toBeNull();

    const events = await request(ctx.app)
      .get(`/api/v1/tickets/${ticket.id}/events`)
      .set(bearer(solicitante));
    const items = (
      events.body as {
        items: {
          type: string;
          fromStatus: string | null;
          toStatus: string | null;
          note: string | null;
          actor: { fullName: string };
        }[];
      }
    ).items;
    expect(items.map((e) => `${e.fromStatus ?? '-'}>${e.toStatus ?? '-'}`)).toEqual([
      '->ABIERTA',
      'ABIERTA>ASIGNADA',
      'ASIGNADA>EN_PROGRESO',
      'EN_PROGRESO>EN_ESPERA',
      'EN_ESPERA>EN_PROGRESO',
      'EN_PROGRESO>RESUELTA',
      'RESUELTA>CERRADA',
    ]);
    expect(items[3]?.note).toBe('Esperando repuesto');
    expect(items[0]?.actor.fullName).toBe('Javiera Muñoz');
  });

  it('el supervisor puede ejecutar cualquier transición válida', async () => {
    await assigned();
    expect((await transitionTicket(ctx.app, supervisor, ticket.id, 'EN_PROGRESO')).status).toBe(
      200,
    );
    expect(
      (
        await transitionTicket(
          ctx.app,
          supervisor,
          ticket.id,
          'RESUELTA',
          'Resuelta por supervisión',
        )
      ).status,
    ).toBe(200);
    expect((await transitionTicket(ctx.app, supervisor, ticket.id, 'CERRADA')).status).toBe(200);
  });

  it('reabrir limpia resolvedAt y permite resolver de nuevo', async () => {
    await resolved();
    const reopened = await transitionTicket(
      ctx.app,
      solicitante,
      ticket.id,
      'EN_PROGRESO',
      'Sigue fallando',
    );
    expect(reopened.status).toBe(200);
    expect(ticketOf(reopened)).toMatchObject({ status: 'EN_PROGRESO', resolvedAt: null });
    const again = await transitionTicket(
      ctx.app,
      tecnico1,
      ticket.id,
      'RESUELTA',
      'Corregido definitivamente',
    );
    expect(ticketOf(again).resolvedAt).not.toBeNull();
  });

  it('403 cuando el actor no tiene el rol requerido para esa transición', async () => {
    await assigned();
    expect((await transitionTicket(ctx.app, solicitante, ticket.id, 'EN_PROGRESO')).status).toBe(
      403,
    );
    await transitionTicket(ctx.app, tecnico1, ticket.id, 'EN_PROGRESO');
    await transitionTicket(ctx.app, tecnico1, ticket.id, 'RESUELTA', 'Listo');
    expect((await transitionTicket(ctx.app, tecnico1, ticket.id, 'CERRADA')).status).toBe(403);
    expect(
      (await transitionTicket(ctx.app, tecnico1, ticket.id, 'EN_PROGRESO', 'Reabro')).status,
    ).toBe(403);
  });

  it('el admin no ejecuta transiciones', async () => {
    await assigned();
    const response = await transitionTicket(ctx.app, admin, ticket.id, 'EN_PROGRESO');
    expect(response.status).toBe(403);
  });

  it('404 si el actor no puede ver la solicitud', async () => {
    await assigned();
    expect((await transitionTicket(ctx.app, tecnico2, ticket.id, 'EN_PROGRESO')).status).toBe(404);
    expect((await transitionTicket(ctx.app, solicitante2, ticket.id, 'CERRADA')).status).toBe(404);
  });

  it('409 INVALID_TRANSITION para saltos fuera del grafo', async () => {
    const skip = await transitionTicket(ctx.app, supervisor, ticket.id, 'RESUELTA', 'No debería');
    expect(skip.status).toBe(409);
    expect(errorOf(skip).code).toBe('INVALID_TRANSITION');
    await resolved();
    await transitionTicket(ctx.app, solicitante, ticket.id, 'CERRADA');
    const afterClose = await transitionTicket(
      ctx.app,
      supervisor,
      ticket.id,
      'EN_PROGRESO',
      'Reabrir cerrada',
    );
    expect(afterClose.status).toBe(409);
  });

  it('400 si el destino es ASIGNADA o desconocido', async () => {
    expect((await transitionTicket(ctx.app, supervisor, ticket.id, 'ASIGNADA')).status).toBe(400);
    expect((await transitionTicket(ctx.app, supervisor, ticket.id, 'INVENTADA')).status).toBe(400);
  });

  it.each(['EN_ESPERA', 'RESUELTA'] as const)('400 sin nota al pasar a %s', async (target) => {
    await inProgress();
    const response = await transitionTicket(ctx.app, tecnico1, ticket.id, target);
    expect(response.status).toBe(400);
    expect(errorOf(response).details[0]?.path).toBe('note');
  });

  it('dos transiciones simultáneas: gana una y la otra recibe 409', async () => {
    await inProgress();
    const results = await Promise.all([
      transitionTicket(ctx.app, tecnico1, ticket.id, 'EN_ESPERA', 'Esperando proveedor'),
      transitionTicket(ctx.app, supervisor, ticket.id, 'RESUELTA', 'Resuelta en paralelo'),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);
    const loser = results.find((r) => r.status === 409);
    expect(['CONCURRENT_MODIFICATION', 'INVALID_TRANSITION']).toContain(
      errorOf(loser as request.Response).code,
    );

    const events = await ctx.db.ticketEvent.count({ where: { ticketId: ticket.id } });
    expect(events).toBe(4);
  });
});

describe('historial inmutable (RF-08)', () => {
  it('la base de datos rechaza UPDATE y DELETE sobre ticket_events', async () => {
    const event = await ctx.db.ticketEvent.findFirstOrThrow({ where: { ticketId: ticket.id } });
    await expect(
      ctx.db.ticketEvent.update({ where: { id: event.id }, data: { note: 'manipulado' } }),
    ).rejects.toThrow(/append-only/);
    await expect(ctx.db.ticketEvent.delete({ where: { id: event.id } })).rejects.toThrow(
      /append-only/,
    );
  });

  it('un ticket no puede quedar asignado y ABIERTA, ni sin técnico fuera de ABIERTA', async () => {
    await expect(
      ctx.db.ticket.update({ where: { id: ticket.id }, data: { assigneeId: tecnico1Id } }),
    ).rejects.toThrow();
    await assigned();
    await expect(
      ctx.db.ticket.update({ where: { id: ticket.id }, data: { assigneeId: null } }),
    ).rejects.toThrow();
  });

  it('el historial no es visible para quien no ve la solicitud', async () => {
    const response = await request(ctx.app)
      .get(`/api/v1/tickets/${ticket.id}/events`)
      .set(bearer(solicitante2));
    expect(response.status).toBe(404);
  });
});
