import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assignTicket,
  bearer,
  createTicket,
  errorOf,
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
let ticket: TicketBody;

beforeAll(() => ctx.reset());
beforeEach(async () => {
  await ctx.reset();
  [solicitante, solicitante2, supervisor, admin, tecnico1, tecnico2] = await Promise.all([
    loginAs(ctx.app, 'solicitante1'),
    loginAs(ctx.app, 'solicitante2'),
    loginAs(ctx.app, 'supervisor'),
    loginAs(ctx.app, 'admin'),
    loginAs(ctx.app, 'tecnico1'),
    loginAs(ctx.app, 'tecnico2'),
  ]);
  ticket = await createTicket(ctx.app, solicitante, await firstCategoryId(ctx.db));
  await assignTicket(ctx.app, supervisor, ticket.id, await userIdOf(ctx.db, 'tecnico1'));
});
afterAll(() => ctx.close());

const url = (): string => `/api/v1/tickets/${ticket.id}/comments`;
const post = (token: string, body: string, visibility?: string): request.Test =>
  request(ctx.app)
    .post(url())
    .set(bearer(token))
    .send(visibility === undefined ? { body } : { body, visibility });
const list = async (token: string): Promise<{ body: string; visibility: string }[]> =>
  (
    (await request(ctx.app).get(url()).set(bearer(token))).body as {
      items: { body: string; visibility: string }[];
    }
  ).items;

describe('comentarios (RF-09)', () => {
  it('el comentario es PUBLICO por defecto', async () => {
    const response = await post(solicitante, 'Hola, ¿hay novedades?');
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      visibility: 'PUBLICO',
      author: { fullName: 'Javiera Muñoz' },
    });
  });

  it('el solicitante no puede publicar comentarios internos', async () => {
    const response = await post(solicitante, 'Nota interna', 'INTERNO');
    expect(response.status).toBe(403);
  });

  it('los internos solo los ven técnico asignado, supervisor y admin', async () => {
    await post(solicitante, 'Público del solicitante');
    expect((await post(tecnico1, 'Revisar el cableado', 'INTERNO')).status).toBe(201);
    expect((await post(supervisor, 'Priorizar esta', 'INTERNO')).status).toBe(201);

    expect((await list(solicitante)).map((c) => c.visibility)).toEqual(['PUBLICO']);
    expect(await list(tecnico1)).toHaveLength(3);
    expect(await list(supervisor)).toHaveLength(3);
    expect(await list(admin)).toHaveLength(3);
  });

  it('quien no ve la solicitud recibe 404', async () => {
    expect((await post(solicitante2, 'Intruso')).status).toBe(404);
    expect((await post(tecnico2, 'Intruso')).status).toBe(404);
    expect((await request(ctx.app).get(url()).set(bearer(tecnico2))).status).toBe(404);
  });

  it('el admin solo lee', async () => {
    expect((await post(admin, 'No puedo comentar')).status).toBe(403);
  });

  it('valida el cuerpo', async () => {
    const empty = await post(solicitante, '   ');
    expect(empty.status).toBe(400);
    const badVisibility = await post(solicitante, 'Texto', 'SECRETO');
    expect(badVisibility.status).toBe(400);
  });

  it('no se comenta una solicitud cerrada', async () => {
    await transitionTicket(ctx.app, tecnico1, ticket.id, 'EN_PROGRESO');
    await transitionTicket(ctx.app, tecnico1, ticket.id, 'RESUELTA', 'Listo');
    await transitionTicket(ctx.app, solicitante, ticket.id, 'CERRADA');
    const response = await post(solicitante, 'Gracias');
    expect(response.status).toBe(409);
    expect(errorOf(response).code).toBe('TICKET_CLOSED');
  });
});
