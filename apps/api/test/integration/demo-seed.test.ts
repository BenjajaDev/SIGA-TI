import type { TicketStatus } from '@siga/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDemo } from '../../prisma/seed/demo';
import { DEMO_TICKETS } from '../../prisma/seed/demo-data';
import { computeResolutionStats } from '../../src/domain/services/resolution-metrics';
import { createTestContext } from '../helpers/context';

const ctx = createTestContext();
const NOW = new Date('2026-06-15T12:00:00.000Z');

beforeEach(() => ctx.reset());
afterAll(() => ctx.close());

const expectedByStatus = (): Partial<Record<TicketStatus, number>> => {
  const counts: Partial<Record<TicketStatus, number>> = {};
  for (const t of DEMO_TICKETS) counts[t.target] = (counts[t.target] ?? 0) + 1;
  return counts;
};

describe('seed:demo', () => {
  it('crea solicitudes en todos los estados con historial coherente', async () => {
    const summary = await seedDemo(ctx.db, { now: NOW });
    expect(summary.tickets).toBe(DEMO_TICKETS.length);
    expect(summary.byStatus).toEqual(expectedByStatus());

    const tickets = await ctx.db.ticket.findMany({
      include: { events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
    });
    expect(tickets).toHaveLength(DEMO_TICKETS.length);
    for (const ticket of tickets) {
      const first = ticket.events[0];
      expect(first?.type, ticket.title).toBe('CREATED');
      const statusEvents = ticket.events.filter((e) => e.toStatus !== null);
      expect(statusEvents.at(-1)?.toStatus, ticket.title).toBe(ticket.status);
      const times = ticket.events.map((e) => e.createdAt.getTime());
      expect(times, ticket.title).toEqual([...times].sort((a, b) => a - b));
      expect(Math.max(...times)).toBeLessThanOrEqual(NOW.getTime());
      expect(ticket.createdAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
    }
  });

  it('deja datos útiles para el panel: vencidas, SLA mixto, reabiertas y comentarios', async () => {
    await seedDemo(ctx.db, { now: NOW });
    const open = await ctx.db.ticket.count({
      where: {
        status: { in: ['ABIERTA', 'ASIGNADA', 'EN_PROGRESO', 'EN_ESPERA'] },
        dueAt: { lt: NOW },
      },
    });
    expect(open).toBeGreaterThan(0);

    const resolved = await ctx.db.ticket.findMany({ where: { resolvedAt: { not: null } } });
    const stats = computeResolutionStats(
      resolved.flatMap((t) =>
        t.resolvedAt === null
          ? []
          : [{ createdAt: t.createdAt, resolvedAt: t.resolvedAt, dueAt: t.dueAt }],
      ),
    );
    expect(stats.withinSlaCount).toBeGreaterThan(0);
    expect(stats.breachedCount).toBeGreaterThan(0);

    expect(await ctx.db.ticketEvent.count({ where: { type: 'REASSIGNED' } })).toBeGreaterThan(0);
    const reopened = await ctx.db.ticketEvent.count({
      where: { fromStatus: 'RESUELTA', toStatus: 'EN_PROGRESO' },
    });
    expect(reopened).toBeGreaterThan(0);
    const internal = await ctx.db.comment.count({ where: { visibility: 'INTERNO' } });
    const publicCount = await ctx.db.comment.count({ where: { visibility: 'PUBLICO' } });
    expect(internal).toBeGreaterThan(0);
    expect(publicCount).toBeGreaterThan(0);
  });

  it('es determinista con la misma semilla y fecha', async () => {
    await seedDemo(ctx.db, { now: NOW });
    const snapshot = async () =>
      (await ctx.db.ticket.findMany({ orderBy: { number: 'asc' } })).map((t) => [
        t.title,
        t.status,
        t.createdAt.toISOString(),
        t.dueAt.toISOString(),
      ]);
    const first = await snapshot();
    await ctx.reset();
    await seedDemo(ctx.db, { now: NOW });
    expect(await snapshot()).toEqual(first);
  });

  it('se niega a ejecutarse si ya hay solicitudes', async () => {
    await seedDemo(ctx.db, { now: NOW });
    await expect(seedDemo(ctx.db, { now: NOW })).rejects.toThrow(/ya contiene solicitudes/);
  });
});
