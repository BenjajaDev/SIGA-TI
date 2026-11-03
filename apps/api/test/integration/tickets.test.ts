import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assignTicket,
  bearer,
  createTicket,
  errorOf,
  ticketOf,
  type TicketBody,
} from '../helpers/api';
import { createTestContext, firstCategoryId, loginAs, userIdOf } from '../helpers/context';

const ctx = createTestContext();
const api = '/api/v1/tickets';

let categoryId: string;
let solicitante1: string;
let solicitante2: string;
let supervisor: string;
let admin: string;
let tecnico1: string;

beforeAll(() => ctx.reset());
beforeEach(async () => {
  await ctx.reset();
  categoryId = await firstCategoryId(ctx.db);
  [solicitante1, solicitante2, supervisor, admin, tecnico1] = await Promise.all([
    loginAs(ctx.app, 'solicitante1'),
    loginAs(ctx.app, 'solicitante2'),
    loginAs(ctx.app, 'supervisor'),
    loginAs(ctx.app, 'admin'),
    loginAs(ctx.app, 'tecnico1'),
  ]);
});
afterAll(() => ctx.close());

describe('POST /tickets (RF-04)', () => {
  it('crea la solicitud con código secuencial, SLA y evento CREATED', async () => {
    ctx.clock.set(new Date('2026-06-01T09:00:00.000Z'));
    const first = await createTicket(ctx.app, solicitante1, categoryId, { priority: 'ALTA' });
    const second = await createTicket(ctx.app, solicitante1, categoryId, { priority: 'CRITICA' });

    expect(first.code).toBe('SIGA-000001');
    expect(second.code).toBe('SIGA-000002');
    expect(first.status).toBe('ABIERTA');
    expect(first.assignee).toBeNull();
    expect(first.dueAt).toBe('2026-06-02T09:00:00.000Z');
    expect(second.dueAt).toBe('2026-06-01T17:00:00.000Z');

    const events = await ctx.db.ticketEvent.findMany({ where: { ticketId: first.id } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'CREATED', toStatus: 'ABIERTA' });
  });

  it.each([
    ['BAJA', 120],
    ['MEDIA', 72],
  ] as const)('el vencimiento de prioridad %s suma %i h', async (priority, hours) => {
    ctx.clock.set(new Date('2026-06-01T00:00:00.000Z'));
    const ticket = await createTicket(ctx.app, solicitante1, categoryId, { priority });
    const expected = new Date('2026-06-01T00:00:00.000Z').getTime() + hours * 3_600_000;
    expect(new Date(ticket.dueAt).getTime()).toBe(expected);
  });

  it('valida la entrada con detalle por campo', async () => {
    const response = await request(ctx.app)
      .post(api)
      .set(bearer(solicitante1))
      .send({ title: 'x', description: 'corta', categoryId: 'no-uuid', priority: 'URGENTE' });
    expect(response.status).toBe(400);
    expect(
      errorOf(response)
        .details.map((d) => d.path)
        .sort(),
    ).toEqual(['categoryId', 'description', 'priority', 'title']);
  });

  it('rechaza campos desconocidos', async () => {
    const response = await request(ctx.app).post(api).set(bearer(solicitante1)).send({
      title: 'Título válido',
      description: 'Descripción válida y suficiente',
      categoryId,
      priority: 'MEDIA',
      status: 'CERRADA',
    });
    expect(response.status).toBe(400);
  });

  it('404 si la categoría no existe o está inactiva', async () => {
    const missing = await request(ctx.app).post(api).set(bearer(solicitante1)).send({
      title: 'Título válido',
      description: 'Descripción válida y suficiente',
      categoryId: '00000000-0000-4000-8000-000000000000',
      priority: 'MEDIA',
    });
    expect(missing.status).toBe(404);

    await ctx.db.category.update({ where: { id: categoryId }, data: { isActive: false } });
    const inactive = await request(ctx.app).post(api).set(bearer(solicitante1)).send({
      title: 'Título válido',
      description: 'Descripción válida y suficiente',
      categoryId,
      priority: 'MEDIA',
    });
    expect(inactive.status).toBe(404);
  });

  it('requiere autenticación', async () => {
    const response = await request(ctx.app).post(api).send({});
    expect(response.status).toBe(401);
  });

  it('el admin no registra solicitudes', async () => {
    const response = await request(ctx.app).post(api).set(bearer(admin)).send({
      title: 'Título válido',
      description: 'Descripción válida y suficiente',
      categoryId,
      priority: 'MEDIA',
    });
    expect(response.status).toBe(403);
  });

  it('solo el supervisor registra a nombre de otro usuario', async () => {
    const requesterId = await userIdOf(ctx.db, 'solicitante2');
    const body = {
      title: 'Registrada por teléfono',
      description: 'El usuario llamó para reportar el problema',
      categoryId,
      priority: 'MEDIA',
      requesterId,
    };

    const denied = await request(ctx.app).post(api).set(bearer(solicitante1)).send(body);
    expect(denied.status).toBe(403);

    const accepted = await request(ctx.app).post(api).set(bearer(supervisor)).send(body);
    expect(accepted.status).toBe(201);
    expect(ticketOf(accepted).requester.id).toBe(requesterId);

    const created = await ctx.db.ticketEvent.findFirstOrThrow({
      where: { ticketId: ticketOf(accepted).id },
    });
    expect(created.actorId).toBe(await userIdOf(ctx.db, 'supervisor'));

    const visibleToOwner = await request(ctx.app)
      .get(`${api}/${ticketOf(accepted).id}`)
      .set(bearer(solicitante2));
    expect(visibleToOwner.status).toBe(200);
  });

  it('404 si el solicitante indicado no existe', async () => {
    const response = await request(ctx.app).post(api).set(bearer(supervisor)).send({
      title: 'Registrada por teléfono',
      description: 'El usuario llamó para reportar el problema',
      categoryId,
      priority: 'MEDIA',
      requesterId: '00000000-0000-4000-8000-000000000000',
    });
    expect(response.status).toBe(404);
  });
});

describe('GET /tickets (RF-05)', () => {
  interface Page {
    items: TicketBody[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  }

  const list = (token: string, query = ''): request.Test =>
    request(ctx.app).get(`${api}${query}`).set(bearer(token));

  it('cada rol ve solo lo que le corresponde', async () => {
    const own = await createTicket(ctx.app, solicitante1, categoryId);
    await createTicket(ctx.app, solicitante2, categoryId);
    await assignTicket(ctx.app, supervisor, own.id, await userIdOf(ctx.db, 'tecnico1'));

    const mine = (await list(solicitante1)).body as Page;
    expect(mine.items.map((t) => t.id)).toEqual([own.id]);

    const tech = (await list(tecnico1)).body as Page;
    expect(tech.items.map((t) => t.id)).toEqual([own.id]);

    const otherTech = (await list(await loginAs(ctx.app, 'tecnico2'))).body as Page;
    expect(otherTech.items).toHaveLength(0);

    expect(((await list(supervisor)).body as Page).totalItems).toBe(2);
    expect(((await list(admin)).body as Page).totalItems).toBe(2);
  });

  it('el técnico ve también las solicitudes que él mismo registró', async () => {
    const ticket = await createTicket(ctx.app, tecnico1, categoryId);
    const page = (await list(tecnico1)).body as Page;
    expect(page.items.map((t) => t.id)).toEqual([ticket.id]);
  });

  it('filtra por estado, prioridad, categoría y asignado', async () => {
    const [a, b, c] = [
      await createTicket(ctx.app, solicitante1, categoryId, { priority: 'ALTA' }),
      await createTicket(ctx.app, solicitante1, categoryId, { priority: 'BAJA' }),
      await createTicket(ctx.app, solicitante2, categoryId, { priority: 'ALTA' }),
    ];
    const tec1Id = await userIdOf(ctx.db, 'tecnico1');
    await assignTicket(ctx.app, supervisor, a.id, tec1Id);

    const ids = async (query: string): Promise<string[]> =>
      ((await list(supervisor, query)).body as Page).items.map((t) => t.id).sort();

    expect(await ids('?status=ASIGNADA')).toEqual([a.id]);
    expect(await ids('?status=ABIERTA')).toEqual([b.id, c.id].sort());
    expect(await ids('?priority=ALTA')).toEqual([a.id, c.id].sort());
    expect(await ids(`?assigneeId=${tec1Id}`)).toEqual([a.id]);
    expect(await ids(`?categoryId=${categoryId}&priority=BAJA`)).toEqual([b.id]);
    expect(await ids('?status=CERRADA')).toEqual([]);
  });

  it('pagina con orden estable (más recientes primero)', async () => {
    const created: TicketBody[] = [];
    for (let i = 0; i < 5; i += 1) {
      ctx.clock.advanceHours(1);
      created.push(await createTicket(ctx.app, solicitante1, categoryId));
    }
    const expected = created.map((t) => t.id).reverse();

    const first = (await list(supervisor, '?pageSize=2&page=1')).body as Page;
    const third = (await list(supervisor, '?pageSize=2&page=3')).body as Page;
    expect(first).toMatchObject({ page: 1, pageSize: 2, totalItems: 5, totalPages: 3 });
    expect(first.items.map((t) => t.id)).toEqual(expected.slice(0, 2));
    expect(third.items.map((t) => t.id)).toEqual(expected.slice(4));
  });

  it.each(['?page=0', '?pageSize=101', '?status=INVENTADO', '?categoryId=abc'])(
    'rechaza consulta inválida %s',
    async (query) => {
      const response = await list(supervisor, query);
      expect(response.status).toBe(400);
      expect(errorOf(response).code).toBe('VALIDATION_ERROR');
    },
  );
});

describe('GET /tickets/:id', () => {
  it('404 (no 403) para quien no puede ver la solicitud, igual que si no existiera', async () => {
    const ticket = await createTicket(ctx.app, solicitante1, categoryId);
    const hidden = await request(ctx.app).get(`${api}/${ticket.id}`).set(bearer(solicitante2));
    const missing = await request(ctx.app)
      .get(`${api}/00000000-0000-4000-8000-000000000000`)
      .set(bearer(solicitante2));
    expect(hidden.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(errorOf(hidden).message).toBe(errorOf(missing).message);
  });

  it('400 si el identificador no es un UUID', async () => {
    const response = await request(ctx.app).get(`${api}/123`).set(bearer(supervisor));
    expect(response.status).toBe(400);
  });

  it('marca como vencida una solicitud abierta fuera de plazo', async () => {
    const ticket = await createTicket(ctx.app, solicitante1, categoryId, { priority: 'CRITICA' });
    expect(ticket.isOverdue).toBe(false);
    ctx.clock.advanceHours(9);
    const later = await request(ctx.app).get(`${api}/${ticket.id}`).set(bearer(solicitante1));
    expect(ticketOf(later).isOverdue).toBe(true);
  });
});
