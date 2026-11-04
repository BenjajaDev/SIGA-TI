import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/services/api-error';
import { createHttpClient } from '../src/services/http-client';

const USER = {
  id: '3f2b8c1e-7d4a-4f1b-9c2e-1a2b3c4d5e6f',
  email: 'a@siga-ti.test',
  fullName: 'Ana',
  role: 'SOLICITANTE',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const session = (token: string) => ({ accessToken: token, expiresIn: 900, user: USER });
const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const errorBody = (code: string, message: string) => ({
  error: { code, message, details: [], requestId: '3f2b8c1e-7d4a-4f1b-9c2e-1a2b3c4d5e6f' },
});

const schema = z.object({ ok: z.boolean() });

const setup = (handler: (url: string, init: RequestInit) => Response | Promise<Response>) => {
  const fetchFn = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(input instanceof Request ? input.url : String(input), init ?? {})),
  );
  const client = createHttpClient({
    baseUrl: '/api/v1',
    fetchFn: fetchFn,
  });
  return { client, fetchFn };
};

describe('createHttpClient', () => {
  it('envía DELETE autenticado y acepta una respuesta 204', async () => {
    const { client, fetchFn } = setup(() => new Response(null, { status: 204 }));
    client.setAccessToken('tok');
    await expect(client.deleteNoContent('/users/user-id')).resolves.toBeUndefined();
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/users/user-id');
    expect(init.method).toBe('DELETE');
    expect((init.headers as Record<string, string>).Authorization).toContain('tok');
  });

  it('envía el access token y serializa la consulta ignorando vacíos', async () => {
    const { client, fetchFn } = setup(() => json(200, { ok: true }));
    client.setAccessToken('tok');
    await client.get('/tickets', schema, {
      status: 'ABIERTA',
      page: 2,
      priority: undefined,
      q: '',
    });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/tickets?status=ABIERTA&page=2');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(init.credentials).toBe('include');
  });

  it('ante 401 renueva la sesión una vez y reintenta', async () => {
    let calls = 0;
    const { client, fetchFn } = setup((url) => {
      if (url.endsWith('/auth/refresh')) return json(200, session('nuevo'));
      calls += 1;
      return calls === 1 ? json(401, errorBody('UNAUTHENTICATED', 'x')) : json(200, { ok: true });
    });
    client.setAccessToken('viejo');
    await expect(client.get('/tickets', schema)).resolves.toEqual({ ok: true });
    const lastInit = fetchFn.mock.calls.at(-1)?.[1];
    expect((lastInit?.headers as Record<string, string> | undefined)?.Authorization).toBe(
      'Bearer nuevo',
    );
  });

  it('varios 401 simultáneos comparten una sola renovación (evita rotar el token dos veces)', async () => {
    let refreshes = 0;
    let first = true;
    const { client } = setup(async (url) => {
      if (url.endsWith('/auth/refresh')) {
        refreshes += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return json(200, session('nuevo'));
      }
      if (first) {
        first = false;
        return json(401, errorBody('UNAUTHENTICATED', 'x'));
      }
      return json(200, { ok: true });
    });
    client.setAccessToken('viejo');
    const calls = await Promise.all([
      client.get('/a', schema),
      client.get('/b', schema),
      client.get('/c', schema),
    ]);
    expect(calls).toHaveLength(3);
    expect(refreshes).toBe(1);
  });

  it('si la renovación falla, avisa que la sesión expiró y devuelve el error', async () => {
    const expired = vi.fn();
    const { client } = setup((url) =>
      url.endsWith('/auth/refresh')
        ? json(401, errorBody('UNAUTHENTICATED', 'Sesión inválida'))
        : json(401, errorBody('UNAUTHENTICATED', 'Debe iniciar sesión')),
    );
    client.onSessionExpired(expired);
    await expect(client.get('/tickets', schema)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
    });
    expect(expired).toHaveBeenCalledOnce();
  });

  it('no intenta renovar en endpoints sin autenticación (login)', async () => {
    const { client, fetchFn } = setup(() =>
      json(401, errorBody('INVALID_CREDENTIALS', 'Correo o contraseña incorrectos')),
    );
    await expect(client.post('/auth/login', schema, {}, { auth: false })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('mapea errores de validación con detalle por campo', async () => {
    const { client } = setup(() =>
      json(400, {
        error: {
          ...errorBody('VALIDATION_ERROR', 'Datos inválidos').error,
          details: [{ path: 'title', message: 'Mínimo 5' }],
        },
      }),
    );
    const error = await client.post('/tickets', schema, {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).details).toEqual([{ path: 'title', message: 'Mínimo 5' }]);
    expect((error as ApiError).requestId).toBeTruthy();
  });

  it('traduce fallos de red y respuestas inesperadas', async () => {
    const network = createHttpClient({
      baseUrl: '/x',
      fetchFn: () => Promise.reject(new TypeError('boom')),
    });
    await expect(network.get('/a', schema)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
    const { client } = setup(() => json(200, { inesperado: 1 }));
    await expect(client.get('/a', schema)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
