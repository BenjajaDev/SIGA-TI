import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assignTicket, bearer, createTicket, errorOf, transitionTicket } from '../helpers/api';
import { createTestContext, firstCategoryId, loginAs, userIdOf } from '../helpers/context';

const ctx = createTestContext();
const api = '/api/v1/dashboard';

let solicitante: string;
let supervisor: string;
let admin: string;
let tecnico1: string;
let categoryId: string;

beforeAll(() => ctx.reset());
beforeEach(async () => {
  await ctx.reset();
  categoryId = await firstCategoryId(ctx.db);
  [solicitante, supervisor, admin, tecnico1] = await Promise.all([
    loginAs(ctx.app, 'solicitante1'),
    loginAs(ctx.app, 'supervisor'),
    loginAs(ctx.app, 'admin'),
    loginAs(ctx.app, 'tecnico1'),
  ]);
});
afterAll(() => ctx.close());

const get = (token: string, path: string): request.Test =>
  request(ctx.app).get(`${api}${path}`).set(bearer(token));

describe('control de acceso al panel', () => {
  it.each(['/summary', '/by-category', '/workload', '/resolution'])(
    '%s: 403 para solicitante y técnico, 401 sin sesión, 200 para supervisor y admin',
    async (path) => {
      expect((await get(solicitante, path)).status).toBe(403);
      expect((await get(tecnico1, path)).status).toBe(403);
      expect((await request(ctx.app).get(`${api}${path}`)).status).toBe(401);
      expect((await get(supervisor, path)).status).toBe(200);
      expect((await get(admin, path)).status).toBe(200);
    },
  );
});

describe('indicadores (RF-10, RF-11)', () => {
  it('sin datos devuelve ceros y los seis estados', async () => {
    const response = await get(supervisor, '/summary');
    const body = response.body as { total: number; byStatus: unknown[]; backlog: number };
    expect(body.total).toBe(0);
    expect(body.byStatus).toHaveLength(6);
    expect(body.backlog).toBe(0);
  });

  it('cuenta por estado, backlog, sin asignar, vencidas, categoría y carga', async () => {
    const tec1Id = await userIdOf(ctx.db, 'tecnico1');
    const tec2Id = await userIdOf(ctx.db, 'tecnico2');

    const t1 = await createTicket(ctx.app, solicitante, categoryId, { priority: 'CRITICA' });
    const t2 = await createTicket(ctx.app, solicitante, categoryId, { priority: 'ALTA' });
    const t3 = await createTicket(ctx.app, solicitante, categoryId, { priority: 'BAJA' });
    await createTicket(ctx.app, solicitante, categoryId, { priority: 'BAJA' });

    await assignTicket(ctx.app, supervisor, t1.id, tec1Id);
    await assignTicket(ctx.app, supervisor, t2.id, tec1Id);
    await assignTicket(ctx.app, supervisor, t3.id, tec2Id);
    await transitionTicket(ctx.app, tecnico1, t1.id, 'EN_PROGRESO');
    await transitionTicket(ctx.app, tecnico1, t2.id, 'EN_PROGRESO');
    await transitionTicket(ctx.app, tecnico1, t2.id, 'RESUELTA', 'Resuelta');

    ctx.clock.advanceHours(9);

    const summary = (await get(supervisor, '/summary')).body as {
      total: number;
      backlog: number;
      unassigned: number;
      overdue: number;
      byStatus: { status: string; count: number }[];
    };
    const count = (status: string): number =>
      summary.byStatus.find((c) => c.status === status)?.count ?? -1;
    expect(summary.total).toBe(4);
    expect(count('ABIERTA')).toBe(1);
    expect(count('ASIGNADA')).toBe(1);
    expect(count('EN_PROGRESO')).toBe(1);
    expect(count('RESUELTA')).toBe(1);
    expect(summary.backlog).toBe(3);
    expect(summary.unassigned).toBe(1);
    expect(summary.overdue).toBe(1);

    const byCategory = (await get(supervisor, '/by-category')).body as {
      items: { category: { id: string }; count: number }[];
    };
    expect(byCategory.items.find((i) => i.category.id === categoryId)?.count).toBe(4);
    expect(byCategory.items.length).toBeGreaterThanOrEqual(7);

    const workload = (await get(supervisor, '/workload')).body as {
      items: {
        technician: { id: string };
        openTotal: number;
        byStatus: { status: string; count: number }[];
      }[];
    };
    expect(workload.items).toHaveLength(3);
    const loadOf = (id: string) => workload.items.find((w) => w.technician.id === id);
    expect(loadOf(tec1Id)?.openTotal).toBe(1);
    expect(loadOf(tec2Id)?.openTotal).toBe(1);
    expect(loadOf(tec1Id)?.byStatus.map((c) => c.status)).toEqual([
      'ABIERTA',
      'ASIGNADA',
      'EN_PROGRESO',
      'EN_ESPERA',
    ]);
    const idle = workload.items.find(
      (w) => w.technician.id !== tec1Id && w.technician.id !== tec2Id,
    );
    expect(idle?.openTotal).toBe(0);
  });

  it('tiempo medio de resolución y cumplimiento de SLA', async () => {
    const tec1Id = await userIdOf(ctx.db, 'tecnico1');
    const resolveAfter = async (priority: 'ALTA' | 'CRITICA', hours: number): Promise<void> => {
      const ticket = await createTicket(ctx.app, solicitante, categoryId, { priority });
      await assignTicket(ctx.app, supervisor, ticket.id, tec1Id);
      await transitionTicket(ctx.app, tecnico1, ticket.id, 'EN_PROGRESO');
      ctx.clock.advanceHours(hours);
      await transitionTicket(ctx.app, tecnico1, ticket.id, 'RESUELTA', 'Resuelta');
    };

    await resolveAfter('ALTA', 10);
    await resolveAfter('CRITICA', 14);

    const response = await get(supervisor, '/resolution');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      resolvedCount: 2,
      averageResolutionHours: 12,
      withinSlaCount: 1,
      breachedCount: 1,
      slaCompliancePercent: 50,
    });
  });

  it('la resolución sin datos devuelve null, no cero', async () => {
    const response = await get(supervisor, '/resolution');
    expect(response.body).toMatchObject({
      resolvedCount: 0,
      averageResolutionHours: null,
      slaCompliancePercent: null,
    });
  });

  it('valida el rango de fechas', async () => {
    const inverted = await get(
      supervisor,
      '/resolution?from=2026-02-01T00:00:00Z&to=2026-01-01T00:00:00Z',
    );
    expect(inverted.status).toBe(400);
    expect(errorOf(inverted).code).toBe('VALIDATION_ERROR');
    expect((await get(supervisor, '/resolution?from=ayer')).status).toBe(400);
  });
});

describe('GET /users y /categories', () => {
  it('el supervisor lista técnicos para asignar; el solicitante no', async () => {
    const ok = await request(ctx.app)
      .get('/api/v1/users?role=TECNICO&isActive=true')
      .set(bearer(supervisor));
    expect(ok.status).toBe(200);
    expect((ok.body as { items: unknown[] }).items).toHaveLength(3);
    expect(JSON.stringify(ok.body)).not.toContain('passwordHash');
    expect((await request(ctx.app).get('/api/v1/users').set(bearer(solicitante))).status).toBe(403);
  });

  it('cualquier usuario autenticado lista categorías activas', async () => {
    const response = await request(ctx.app).get('/api/v1/categories').set(bearer(solicitante));
    expect(response.status).toBe(200);
    expect((response.body as { items: unknown[] }).items).toHaveLength(7);
    expect((await request(ctx.app).get('/api/v1/categories')).status).toBe(401);
  });
});
