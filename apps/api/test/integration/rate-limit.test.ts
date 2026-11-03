import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { emailOf } from '../../prisma/seed/data';
import { errorOf } from '../helpers/api';
import { createTestContext } from '../helpers/context';

const ctx = createTestContext({ RATE_LIMIT_LOGIN_MAX: '3' });

beforeAll(() => ctx.reset());
afterAll(() => ctx.close());

describe('límite de intentos de ingreso', () => {
  it('responde 429 con el sobre estándar tras superar el máximo', async () => {
    const attempt = (): request.Test =>
      request(ctx.app)
        .post('/api/v1/auth/login')
        .send({ email: emailOf('solicitante1'), password: 'incorrecta' });

    for (let i = 0; i < 3; i += 1) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(errorOf(blocked).code).toBe('RATE_LIMITED');
    expect(blocked.headers['retry-after']).toBeDefined();
  });
});
