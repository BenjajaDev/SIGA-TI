import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { bearer, createTicket, errorOf } from '../helpers/api';
import { createTestContext, firstCategoryId, loginAs, userIdOf } from '../helpers/context';

const ctx = createTestContext();
const api = '/api/v1/users';
let admin: string;
let supervisor: string;
let solicitante: string;

beforeAll(() => ctx.reset());
beforeEach(async () => {
  await ctx.reset();
  [admin, supervisor, solicitante] = await Promise.all([
    loginAs(ctx.app, 'admin'),
    loginAs(ctx.app, 'supervisor'),
    loginAs(ctx.app, 'solicitante1'),
  ]);
});
afterAll(() => ctx.close());

describe('administración de usuarios', () => {
  it('solo ADMIN crea cuentas y nunca expone el hash de contraseña', async () => {
    const body = {
      email: 'nuevo.usuario@siga-ti.test',
      fullName: 'Nuevo Usuario',
      role: 'TECNICO',
      password: 'Clave-segura-2026!',
    };
    const forbidden = await request(ctx.app).post(api).set(bearer(supervisor)).send(body);
    expect(forbidden.status).toBe(403);

    const created = await request(ctx.app).post(api).set(bearer(admin)).send(body);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      email: body.email,
      fullName: body.fullName,
      role: body.role,
      isActive: true,
    });
    expect(JSON.stringify(created.body)).not.toContain('passwordHash');
    expect(JSON.stringify(created.body)).not.toContain(body.password);
    const stored = await ctx.db.user.findUniqueOrThrow({ where: { email: body.email } });
    expect(stored.passwordHash).not.toBe(body.password);
  });

  it('rechaza correo duplicado y evita auto-desactivación o auto-degradación', async () => {
    const duplicate = await request(ctx.app).post(api).set(bearer(admin)).send({
      email: 'admin@siga-ti.test',
      fullName: 'Duplicado',
      role: 'SOLICITANTE',
      password: 'Clave-segura-2026!',
    });
    expect(duplicate.status).toBe(409);
    expect(errorOf(duplicate).code).toBe('EMAIL_IN_USE');

    const adminId = await userIdOf(ctx.db, 'admin');
    const selfUpdate = await request(ctx.app).put(`${api}/${adminId}`).set(bearer(admin)).send({
      email: 'admin@siga-ti.test',
      fullName: 'Administrador',
      role: 'TECNICO',
      isActive: true,
    });
    expect(selfUpdate.status).toBe(403);
    const selfDeactivate = await request(ctx.app).delete(`${api}/${adminId}`).set(bearer(admin));
    expect(selfDeactivate.status).toBe(403);
  });

  it('edita y desactiva cuentas, revocando sus sesiones de renovación', async () => {
    const targetId = await userIdOf(ctx.db, 'solicitante1');
    const categoryId = await firstCategoryId(ctx.db);
    const ticket = await createTicket(ctx.app, solicitante, categoryId);
    const updated = await request(ctx.app).put(`${api}/${targetId}`).set(bearer(admin)).send({
      email: 'solicitante.actualizado@siga-ti.test',
      fullName: 'Solicitante Actualizado',
      role: 'TECNICO',
      isActive: true,
      password: 'Otra-clave-segura-2026!',
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      email: 'solicitante.actualizado@siga-ti.test',
      fullName: 'Solicitante Actualizado',
      role: 'TECNICO',
    });
    expect(JSON.stringify(updated.body)).not.toContain('passwordHash');

    const disabled = await request(ctx.app).delete(`${api}/${targetId}`).set(bearer(admin));
    expect(disabled.status).toBe(204);
    expect(await ctx.db.refreshToken.count({ where: { userId: targetId, revokedAt: null } })).toBe(
      0,
    );
    const deactivatedUser = await ctx.db.user.findUniqueOrThrow({ where: { id: targetId } });
    expect(deactivatedUser.isActive).toBe(false);
    expect(await ctx.db.ticket.count({ where: { id: ticket.id, requesterId: targetId } })).toBe(1);
    expect(
      await ctx.db.ticketEvent.count({ where: { ticketId: ticket.id, actorId: targetId } }),
    ).toBe(1);
    const existingAccessToken = await request(ctx.app)
      .get('/api/v1/auth/me')
      .set(bearer(solicitante));
    expect(existingAccessToken.status).toBe(401);

    const reactivated = await request(ctx.app).put(`${api}/${targetId}`).set(bearer(admin)).send({
      email: 'solicitante.actualizado@siga-ti.test',
      fullName: 'Solicitante Actualizado',
      role: 'TECNICO',
      isActive: true,
    });
    expect(reactivated.status).toBe(200);
    expect((reactivated.body as { isActive: boolean }).isActive).toBe(true);
  });

  it('impide retirar acceso administrativo a la cuenta propia y valida entradas', async () => {
    const adminId = await userIdOf(ctx.db, 'admin');
    const lastAdmin = await request(ctx.app).put(`${api}/${adminId}`).set(bearer(admin)).send({
      email: 'admin@siga-ti.test',
      fullName: 'Administrador',
      role: 'ADMIN',
      isActive: false,
    });
    expect(lastAdmin.status).toBe(403);
    expect(errorOf(lastAdmin).code).toBe('FORBIDDEN');

    const invalid = await request(ctx.app).post(api).set(bearer(admin)).send({
      email: 'mal-capturado',
      fullName: 'A',
      role: 'TECNICO',
      password: 'corta',
    });
    expect(invalid.status).toBe(400);

    const supervisorUpdate = await request(ctx.app)
      .put(`${api}/${await userIdOf(ctx.db, 'solicitante1')}`)
      .set(bearer(supervisor))
      .send({
        email: 'solicitante1@siga-ti.test',
        fullName: 'Solicitante Uno',
        role: 'SOLICITANTE',
        isActive: true,
      });
    expect(supervisorUpdate.status).toBe(403);
  });
});
