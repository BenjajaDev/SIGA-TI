import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { emailOf } from '../../prisma/seed/data';
import { bearer, errorOf } from '../helpers/api';
import { createTestContext, loginAs, TEST_PASSWORD } from '../helpers/context';

const ctx = createTestContext();
const api = '/api/v1/auth';

beforeAll(() => ctx.reset());
beforeEach(() => ctx.reset());
afterAll(() => ctx.close());

const login = (email: string, password: string): request.Test =>
  request(ctx.app).post(`${api}/login`).send({ email, password });

const cookieOf = (response: request.Response): string => {
  const header = response.headers['set-cookie'] as string[] | undefined;
  const cookie = header?.find((c) => c.startsWith('siga_rt='));
  if (cookie === undefined) throw new Error('Falta la cookie siga_rt');
  return cookie;
};

describe('POST /auth/login', () => {
  it('inicia sesión y entrega access token + cookie httpOnly de refresh', async () => {
    const response = await login(emailOf('solicitante1'), TEST_PASSWORD);
    expect(response.status).toBe(200);
    const body = response.body as { accessToken: string; expiresIn: number; user: object };
    expect(body.accessToken).toMatch(/^eyJ/);
    expect(body.expiresIn).toBe(900);
    expect(body.user).toMatchObject({ email: emailOf('solicitante1'), role: 'SOLICITANTE' });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');

    const cookie = cookieOf(response);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/v1/auth');
  });

  it('es insensible a mayúsculas en el correo', async () => {
    const response = await login(emailOf('solicitante1').toUpperCase(), TEST_PASSWORD);
    expect(response.status).toBe(200);
  });

  it('no distingue entre usuario inexistente y clave incorrecta', async () => {
    const wrongPassword = await login(emailOf('solicitante1'), 'incorrecta');
    const unknownUser = await login('nadie@siga-ti.test', 'incorrecta');
    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(errorOf(wrongPassword).code).toBe('INVALID_CREDENTIALS');
    expect(errorOf(unknownUser).code).toBe('INVALID_CREDENTIALS');
    expect(errorOf(unknownUser).message).toBe(errorOf(wrongPassword).message);
  });

  it('rechaza usuarios desactivados', async () => {
    await ctx.db.user.update({
      where: { email: emailOf('solicitante1') },
      data: { isActive: false },
    });
    const response = await login(emailOf('solicitante1'), TEST_PASSWORD);
    expect(response.status).toBe(401);
  });

  it('valida el cuerpo con 400 y detalle por campo', async () => {
    const response = await request(ctx.app).post(`${api}/login`).send({ email: 'no-es-correo' });
    expect(response.status).toBe(400);
    const error = errorOf(response);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details.map((d) => d.path).sort()).toEqual(['email', 'password']);
  });
});

describe('GET /auth/me', () => {
  it('devuelve el usuario autenticado', async () => {
    const token = await loginAs(ctx.app, 'tecnico1');
    const response = await request(ctx.app).get(`${api}/me`).set(bearer(token));
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ email: emailOf('tecnico1'), role: 'TECNICO' });
  });

  it.each([
    ['sin token', undefined],
    ['token basura', 'Bearer abc.def.ghi'],
    ['esquema distinto', 'Basic abc'],
  ])('401 %s', async (_name, header) => {
    const req = request(ctx.app).get(`${api}/me`);
    const response = await (header === undefined ? req : req.set('Authorization', header));
    expect(response.status).toBe(401);
    expect(errorOf(response).code).toBe('UNAUTHENTICATED');
  });

  it('desactivar al usuario invalida su token de inmediato', async () => {
    const token = await loginAs(ctx.app, 'tecnico1');
    await ctx.db.user.update({ where: { email: emailOf('tecnico1') }, data: { isActive: false } });
    const response = await request(ctx.app).get(`${api}/me`).set(bearer(token));
    expect(response.status).toBe(401);
  });
});

describe('POST /auth/refresh y /auth/logout', () => {
  it('rota el refresh token y entrega un nuevo access token', async () => {
    const first = await login(emailOf('solicitante1'), TEST_PASSWORD);
    const refreshed = await request(ctx.app)
      .post(`${api}/refresh`)
      .set('Cookie', cookieOf(first).split(';')[0] ?? '');
    expect(refreshed.status).toBe(200);
    expect((refreshed.body as { accessToken: string }).accessToken).toMatch(/^eyJ/);
    expect(cookieOf(refreshed)).not.toBe(cookieOf(first));
  });

  it('guarda solo el hash del refresh token', async () => {
    const response = await login(emailOf('solicitante1'), TEST_PASSWORD);
    const plain = (cookieOf(response).split(';')[0] ?? '').replace('siga_rt=', '');
    const stored = await ctx.db.refreshToken.findMany();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored[0]?.tokenHash).not.toBe(plain);
  });

  it('reutilizar un token rotado revoca también el token vigente', async () => {
    const first = await login(emailOf('solicitante1'), TEST_PASSWORD);
    const firstCookie = cookieOf(first).split(';')[0] ?? '';
    const second = await request(ctx.app).post(`${api}/refresh`).set('Cookie', firstCookie);
    const secondCookie = cookieOf(second).split(';')[0] ?? '';

    const replay = await request(ctx.app).post(`${api}/refresh`).set('Cookie', firstCookie);
    expect(replay.status).toBe(401);

    const afterReplay = await request(ctx.app).post(`${api}/refresh`).set('Cookie', secondCookie);
    expect(afterReplay.status).toBe(401);
  });

  it('sin cookie responde 401', async () => {
    const response = await request(ctx.app).post(`${api}/refresh`);
    expect(response.status).toBe(401);
  });

  it('logout revoca el token y es idempotente', async () => {
    const session = await login(emailOf('solicitante1'), TEST_PASSWORD);
    const cookie = cookieOf(session).split(';')[0] ?? '';
    const out = await request(ctx.app).post(`${api}/logout`).set('Cookie', cookie);
    expect(out.status).toBe(204);
    const again = await request(ctx.app).post(`${api}/logout`).set('Cookie', cookie);
    expect(again.status).toBe(204);
    const refresh = await request(ctx.app).post(`${api}/refresh`).set('Cookie', cookie);
    expect(refresh.status).toBe(401);
  });
});
