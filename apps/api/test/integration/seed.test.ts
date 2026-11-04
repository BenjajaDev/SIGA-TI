import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PRIORITIES } from '@siga/shared';
import { seedBase } from '../../prisma/seed/base';
import { seedDemo } from '../../prisma/seed/demo';
import { CATEGORIES, USERS } from '../../prisma/seed/data';
import { Argon2PasswordHasher } from '../../src/infrastructure/security/argon2-password-hasher';
import { createTestContext } from '../helpers/context';

const ctx = createTestContext();
const hasher = new Argon2PasswordHasher({ memoryCost: 1024, timeCost: 1, parallelism: 1 });

beforeAll(() => ctx.reset());
afterAll(() => ctx.close());

describe('seed:base', () => {
  it('es idempotente', async () => {
    await seedBase(ctx.db, hasher, 'Otra-Clave-Segura-1');
    await seedBase(ctx.db, hasher, 'Otra-Clave-Segura-1');
    expect(await ctx.db.user.count()).toBe(USERS.length);
    expect(await ctx.db.category.count()).toBe(CATEGORIES.length);
    expect(await ctx.db.slaPolicy.count()).toBe(PRIORITIES.length);
  });

  it('guarda las contraseñas con argon2id, nunca en claro', async () => {
    const users = await ctx.db.user.findMany();
    for (const user of users) {
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      expect(user.passwordHash).not.toContain('Otra-Clave-Segura-1');
    }
  });

  it('todos los correos pertenecen al dominio ficticio reservado', async () => {
    const users = await ctx.db.user.findMany();
    expect(users.every((u) => u.email.endsWith('@siga-ti.test'))).toBe(true);
  });

  it('genera solicitudes demo representativas de forma idempotente', async () => {
    await seedDemo(ctx.db);
    const firstTicketCount = await ctx.db.ticket.count();
    const firstEventCount = await ctx.db.ticketEvent.count();

    await seedDemo(ctx.db);

    expect(firstTicketCount).toBe(40);
    expect(await ctx.db.ticket.count()).toBe(firstTicketCount);
    expect(await ctx.db.ticketEvent.count()).toBe(firstEventCount);
    expect(await ctx.db.ticket.groupBy({ by: ['status'] })).toHaveLength(6);
  });
});
