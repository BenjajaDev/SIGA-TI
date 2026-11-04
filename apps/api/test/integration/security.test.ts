import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, errorOf } from '../helpers/api';
import { createTestContext, firstCategoryId, loginAs, userIdOf } from '../helpers/context';

const ctx = createTestContext();
const prod = createTestContext({
  NODE_ENV: 'production',
  COOKIE_SECURE: 'true',
  LOG_LEVEL: 'silent',
  JWT_ACCESS_SECRET: 'a-production-grade-secret-0123456789abcdef',
});

beforeAll(() => ctx.reset());
afterAll(async () => {
  await ctx.close();
  await prod.close();
});

const sign = async (
  claims: { sub: string; role: string },
  secret: string,
  expiresIn = '15m',
): Promise<string> =>
  new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));

const me = (token: string): request.Test =>
  request(ctx.app).get('/api/v1/auth/me').set(bearer(token));

describe('tokens de acceso', () => {
  it('rechaza un token firmado con otro secreto', async () => {
    const userId = await userIdOf(ctx.db, 'admin');
    const forged = await sign(
      { sub: userId, role: 'ADMIN' },
      'otro-secreto-distinto-de-32-caracteres-o-mas!!',
    );
    expect((await me(forged)).status).toBe(401);
  });

  it('rechaza tokens sin firma (alg=none)', async () => {
    const encode = (value: object): string =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const userId = await userIdOf(ctx.db, 'admin');
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: userId, role: 'ADMIN' })}.`;
    expect((await me(unsigned)).status).toBe(401);
  });

  it('rechaza tokens expirados', async () => {
    const userId = await userIdOf(ctx.db, 'solicitante1');
    const expired = await sign(
      { sub: userId, role: 'SOLICITANTE' },
      ctx.env.JWT_ACCESS_SECRET,
      '-10s',
    );
    expect((await me(expired)).status).toBe(401);
  });

  it('el rol vigente es el de la base de datos, no el declarado en el token', async () => {
    const userId = await userIdOf(ctx.db, 'solicitante1');
    const inflated = await sign({ sub: userId, role: 'ADMIN' }, ctx.env.JWT_ACCESS_SECRET);
    expect((await me(inflated)).status).toBe(200);
    const dashboard = await request(ctx.app).get('/api/v1/dashboard/summary').set(bearer(inflated));
    expect(dashboard.status).toBe(403);
    const branding = await request(ctx.app).put('/api/v1/branding').set(bearer(inflated)).send({
      institutionName: 'X',
      primaryColor: '#000000',
      secondaryColor: '#000000',
      gradientAngle: 0,
      logoDataUrl: null,
    });
    expect(branding.status).toBe(403);
  });

  it('un token de un usuario inexistente es inválido', async () => {
    const ghost = await sign(
      { sub: '00000000-0000-4000-8000-000000000000', role: 'ADMIN' },
      ctx.env.JWT_ACCESS_SECRET,
    );
    expect((await me(ghost)).status).toBe(401);
  });
});

describe('entradas maliciosas', () => {
  it('no se puede escalar privilegios por asignación masiva ni por __proto__', async () => {
    const token = await loginAs(ctx.app, 'solicitante1');
    const categoryId = await firstCategoryId(ctx.db);
    const base = {
      title: 'Título válido',
      description: 'Descripción válida y suficiente',
      categoryId,
      priority: 'MEDIA',
    };
    for (const extra of [
      '{"role":"ADMIN"}',
      '{"assigneeId":"x"}',
      '{"__proto__":{"role":"ADMIN"}}',
    ]) {
      const body = `${JSON.stringify(base).slice(0, -1)},${extra.slice(1)}`;
      const response = await request(ctx.app)
        .post('/api/v1/tickets')
        .set(bearer(token))
        .set('Content-Type', 'application/json')
        .send(body);
      expect(response.status, extra).toBe(400);
    }
  });

  it('la contaminación de parámetros se rechaza', async () => {
    const token = await loginAs(ctx.app, 'supervisor');
    const response = await request(ctx.app)
      .get('/api/v1/tickets?status=ABIERTA&status=CERRADA')
      .set(bearer(token));
    expect(response.status).toBe(400);
  });

  it('las cargas con comillas o SQL se tratan como texto, no como consulta', async () => {
    const token = await loginAs(ctx.app, 'solicitante1');
    const categoryId = await firstCategoryId(ctx.db);
    const title = "'; DROP TABLE tickets; --";
    const created = await request(ctx.app).post('/api/v1/tickets').set(bearer(token)).send({
      title,
      description: "<script>alert('x')</script> descripción",
      categoryId,
      priority: 'MEDIA',
    });
    expect(created.status).toBe(201);
    expect((created.body as { title: string }).title).toBe(title);
    expect(await ctx.db.ticket.count()).toBeGreaterThan(0);
  });

  it('PUT /branding sin sesión se rechaza antes de procesar el cuerpo', async () => {
    const huge = { institutionName: 'x'.repeat(400_000) };
    const response = await request(ctx.app).put('/api/v1/branding').send(huge);
    expect(response.status).toBe(401);
    expect(errorOf(response).code).toBe('UNAUTHENTICATED');
  });
});

describe('configuración de producción', () => {
  it('la cookie de refresh es Secure, HttpOnly y SameSite=Strict', async () => {
    await prod.reset();
    const response = await request(prod.app)
      .post('/api/v1/auth/login')
      .send({ email: 'solicitante1@siga-ti.test', password: 'Test-Password-2026!' });
    expect(response.status).toBe(200);
    const cookie = (response.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('siga_rt='),
    );
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
  });

  it('no expone la documentación Swagger', async () => {
    const response = await request(prod.app).get('/api/docs/');
    expect(response.status).toBe(404);
  });
});
