import request from 'supertest';
import { DEFAULT_BRANDING } from '@siga/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { bearer, errorOf } from '../helpers/api';
import { createTestContext, loginAs } from '../helpers/context';

const ctx = createTestContext();
const url = '/api/v1/branding';

const PNG_DOT =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const valid = {
  institutionName: 'Universidad de Ejemplo',
  primaryColor: '#7a1030',
  secondaryColor: '#b45309',
  gradientAngle: 90,
  logoDataUrl: PNG_DOT,
};

beforeEach(() => ctx.reset());
afterAll(() => ctx.close());

const put = (token: string, body: object): request.Test =>
  request(ctx.app).put(url).set(bearer(token)).send(body);

describe('GET /branding', () => {
  it('es público y devuelve el tema por defecto si nunca se editó', async () => {
    await ctx.db.brandSettings.deleteMany();
    const response = await request(ctx.app).get(url);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ...DEFAULT_BRANDING, updatedAt: null });
  });
});

describe('PUT /branding', () => {
  it('el administrador guarda nombre, logo, colores y ángulo', async () => {
    const admin = await loginAs(ctx.app, 'admin');
    const saved = await put(admin, valid);
    expect(saved.status).toBe(200);
    const read = await request(ctx.app).get(url);
    expect(read.body).toMatchObject(valid);
    expect((read.body as { updatedAt: string }).updatedAt).toMatch(/^\d{4}-/);
  });

  it('permite quitar el logo', async () => {
    const admin = await loginAs(ctx.app, 'admin');
    await put(admin, valid);
    const cleared = await put(admin, { ...valid, logoDataUrl: null });
    expect(cleared.status).toBe(200);
    expect((await request(ctx.app).get(url)).body).toMatchObject({ logoDataUrl: null });
  });

  it.each(['supervisor', 'tecnico1', 'solicitante1'] as const)(
    '%s no puede editar (403)',
    async (key) => {
      const response = await put(await loginAs(ctx.app, key), valid);
      expect(response.status).toBe(403);
    },
  );

  it('requiere sesión', async () => {
    expect((await request(ctx.app).put(url).send(valid)).status).toBe(401);
  });

  it.each([
    ['color mal formado', { primaryColor: 'rojo' }],
    ['primario muy claro (texto blanco ilegible)', { primaryColor: '#ffee99' }],
    ['secundario muy claro', { secondaryColor: '#ffffcc' }],
    ['ángulo fuera de rango', { gradientAngle: 400 }],
    ['nombre vacío', { institutionName: ' ' }],
    ['logo de tipo no permitido', { logoDataUrl: 'data:text/html;base64,PHNjcmlwdD4=' }],
    ['logo que no es data URL', { logoDataUrl: 'https://evil.example/logo.png' }],
  ])('rechaza %s', async (_name, patch) => {
    const admin = await loginAs(ctx.app, 'admin');
    const response = await put(admin, { ...valid, ...patch });
    expect(response.status).toBe(400);
    expect(errorOf(response).code).toBe('VALIDATION_ERROR');
  });

  it('rechaza un logo demasiado grande', async () => {
    const admin = await loginAs(ctx.app, 'admin');
    const huge = `data:image/png;base64,${'A'.repeat(310_000)}`;
    const response = await put(admin, { ...valid, logoDataUrl: huge });
    expect(response.status).toBe(400);
  });
});
