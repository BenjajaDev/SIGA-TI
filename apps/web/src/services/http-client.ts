import { authSessionSchema, errorResponseSchema, type AuthSession } from '@siga/shared';
import type { z } from 'zod';
import { ApiError } from './api-error';

export type QueryParams = Readonly<Record<string, string | number | boolean | undefined>>;

interface RequestOptions {
  readonly query?: QueryParams | undefined;
  readonly body?: unknown;
  readonly auth?: boolean;
}

export interface HttpClientConfig {
  readonly baseUrl: string;
  readonly fetchFn?: typeof fetch;
}

export interface HttpClient {
  get<S extends z.ZodType>(path: string, schema: S, query?: QueryParams): Promise<z.output<S>>;
  post<S extends z.ZodType>(
    path: string,
    schema: S,
    body?: unknown,
    options?: { auth?: boolean },
  ): Promise<z.output<S>>;
  put<S extends z.ZodType>(path: string, schema: S, body: unknown): Promise<z.output<S>>;
  postNoContent(path: string): Promise<void>;
  deleteNoContent(path: string): Promise<void>;
  refreshSession(): Promise<AuthSession>;
  setAccessToken(token: string | null): void;
  onSessionExpired(handler: () => void): void;
}

const NETWORK_MESSAGE = 'No se pudo conectar con el servidor. Intente nuevamente.';

const toQueryString = (query: QueryParams | undefined): string => {
  if (query === undefined) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
};

const toApiError = async (response: Response): Promise<ApiError> => {
  const parsed = errorResponseSchema.safeParse(await readJson(response));
  if (!parsed.success) {
    return new ApiError(response.status, 'INTERNAL_ERROR', 'Ocurrió un error inesperado');
  }
  const { code, message, details, requestId } = parsed.data.error;
  return new ApiError(response.status, code, message, details, requestId);
};

export const createHttpClient = (config: HttpClientConfig): HttpClient => {
  const fetchFn = config.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  let accessToken: string | null = null;
  let expiredHandler: () => void = () => undefined;
  let inflightRefresh: Promise<AuthSession> | null = null;

  const send = async (method: string, path: string, options: RequestOptions): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.auth !== false && accessToken !== null) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    try {
      return await fetchFn(`${config.baseUrl}${path}${toQueryString(options.query)}`, {
        method,
        headers,
        credentials: 'include',
        ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
      });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', NETWORK_MESSAGE);
    }
  };

  const doRefresh = async (): Promise<AuthSession> => {
    const response = await send('POST', '/auth/refresh', { auth: false });
    if (!response.ok) throw await toApiError(response);
    const session = authSessionSchema.parse(await readJson(response));
    accessToken = session.accessToken;
    return session;
  };

  const refreshSession = (): Promise<AuthSession> => {
    inflightRefresh ??= doRefresh().finally(() => {
      inflightRefresh = null;
    });
    return inflightRefresh;
  };

  const execute = async (
    method: string,
    path: string,
    options: RequestOptions,
  ): Promise<Response> => {
    const response = await send(method, path, options);
    if (response.status !== 401 || options.auth === false) return response;

    try {
      await refreshSession();
    } catch {
      accessToken = null;
      expiredHandler();
      return response;
    }
    return send(method, path, options);
  };

  const parse = async <S extends z.ZodType>(
    response: Response,
    schema: S,
  ): Promise<z.output<S>> => {
    if (!response.ok) throw await toApiError(response);
    const result = schema.safeParse(await readJson(response));
    if (!result.success) {
      throw new ApiError(response.status, 'INVALID_RESPONSE', 'Respuesta inesperada del servidor');
    }
    return result.data;
  };

  return {
    async get(path, schema, query) {
      return parse(await execute('GET', path, { query }), schema);
    },
    async post(path, schema, body, options) {
      return parse(
        await execute('POST', path, {
          body,
          ...(options?.auth !== undefined && { auth: options.auth }),
        }),
        schema,
      );
    },
    async put(path, schema, body) {
      return parse(await execute('PUT', path, { body }), schema);
    },
    async postNoContent(path) {
      const response = await execute('POST', path, { auth: false });
      if (!response.ok) throw await toApiError(response);
    },
    async deleteNoContent(path) {
      const response = await execute('DELETE', path, {});
      if (!response.ok) throw await toApiError(response);
    },
    refreshSession,
    setAccessToken(token) {
      accessToken = token;
    },
    onSessionExpired(handler) {
      expiredHandler = handler;
    },
  };
};
