import { readFileSync } from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { emailOf } from '../../prisma/seed/data';
import { OPENAPI_FILE, renderOpenApiYaml } from '../../src/interfaces/http/openapi/generate';
import { errorOf } from '../helpers/api';
import { createTestContext, TEST_PASSWORD } from '../helpers/context';

const ctx = createTestContext();
const broken = createTestContext({
  DATABASE_URL: 'postgresql://nadie:nada@127.0.0.1:1/inexistente',
});

beforeAll(() => ctx.reset());
afterAll(async () => {
  await ctx.close();
  await broken.close();
});

describe('contrato OpenAPI', () => {
  it('docs/openapi.yaml coincide con el generado desde los esquemas Zod', () => {
    const normalizeLineEndings = (content: string): string => content.replace(/\r\n/g, '\n');
    expect(normalizeLineEndings(readFileSync(OPENAPI_FILE, 'utf8'))).toBe(
      normalizeLineEndings(renderOpenApiYaml()),
    );
  });
});

describe('robustez y seguridad HTTP', () => {
  it('GET /health responde sin autenticación', async () => {
    const response = await request(ctx.app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('rutas desconocidas usan el sobre de error con requestId', async () => {
    const response = await request(ctx.app).get('/api/v1/nada');
    expect(response.status).toBe(404);
    expect(errorOf(response).code).toBe('NOT_FOUND');
    expect(errorOf(response).requestId).toBe(response.headers['x-request-id']);
  });

  it('JSON malformado responde 400 sin detalles internos', async () => {
    const response = await request(ctx.app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(response.status).toBe(400);
    expect(errorOf(response).code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(response.body)).not.toMatch(/SyntaxError|at \w+/);
  });

  it('cuerpos excesivamente grandes se rechazan', async () => {
    const response = await request(ctx.app)
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.test', password: 'x'.repeat(200_000) });
    expect(response.status).toBe(400);
  });

  it('respeta un X-Request-Id válido y descarta uno inválido', async () => {
    const valid = '3f2b8c1e-7d4a-4f1b-9c2e-1a2b3c4d5e6f';
    const echoed = await request(ctx.app).get('/api/v1/nada').set('X-Request-Id', valid);
    expect(echoed.headers['x-request-id']).toBe(valid);
    const replaced = await request(ctx.app)
      .get('/api/v1/nada')
      .set('X-Request-Id', 'no-es-un-uuid');
    expect(replaced.headers['x-request-id']).not.toBe('no-es-un-uuid');
    expect(replaced.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('aplica cabeceras de seguridad y oculta el framework', async () => {
    const response = await request(ctx.app).get('/api/v1/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['strict-transport-security']).toBeDefined();
  });

  it('CORS solo admite orígenes configurados', async () => {
    const allowed = ctx.env.CORS_ALLOWED_ORIGINS[0] ?? '';
    const ok = await request(ctx.app).get('/api/v1/health').set('Origin', allowed);
    expect(ok.headers['access-control-allow-origin']).toBe(allowed);
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const denied = await request(ctx.app)
      .get('/api/v1/health')
      .set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('un fallo interno responde 500 genérico sin filtrar detalles', async () => {
    const response = await request(broken.app)
      .post('/api/v1/auth/login')
      .send({ email: emailOf('solicitante1'), password: TEST_PASSWORD });
    expect(response.status).toBe(500);
    const error = errorOf(response);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe('Ocurrió un error inesperado');
    expect(JSON.stringify(response.body)).not.toMatch(/127\.0\.0\.1|inexistente|ECONNREFUSED/);
  });

  it('Swagger UI está disponible fuera de producción', async () => {
    const response = await request(ctx.app).get('/api/docs/').redirects(1);
    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger-ui');
  });
});
