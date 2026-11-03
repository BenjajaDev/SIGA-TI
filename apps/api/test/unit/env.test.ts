import { describe, expect, it } from 'vitest';
import { EnvValidationError, loadEnv } from '../../src/config/env';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  CORS_ALLOWED_ORIGINS: 'http://localhost:5173, https://siga.example.test',
  JWT_ACCESS_SECRET: 'a-very-long-secret-value-0123456789abcdef',
};

describe('loadEnv', () => {
  it('aplica valores por defecto y parsea orígenes', () => {
    const env = loadEnv(valid);
    expect(env.PORT).toBe(3000);
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.CORS_ALLOWED_ORIGINS).toEqual([
      'http://localhost:5173',
      'https://siga.example.test',
    ]);
  });

  it('interpreta "false" como falso (no como cadena truthy)', () => {
    expect(loadEnv({ ...valid, COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(false);
  });

  it.each([
    ['falta DATABASE_URL', { ...valid, DATABASE_URL: undefined }],
    ['secreto corto', { ...valid, JWT_ACCESS_SECRET: 'corto' }],
    ['CORS con comodín', { ...valid, CORS_ALLOWED_ORIGINS: '*' }],
    ['CORS con ruta', { ...valid, CORS_ALLOWED_ORIGINS: 'http://localhost:5173/app' }],
    ['URL de BD no postgres', { ...valid, DATABASE_URL: 'mysql://u:p@h/db' }],
  ])('rechaza: %s', (_name, source) => {
    expect(() => loadEnv(source)).toThrow(EnvValidationError);
  });

  it('en producción exige cookie segura y secreto no de ejemplo', () => {
    expect(() => loadEnv({ ...valid, NODE_ENV: 'production' })).toThrow(EnvValidationError);
    expect(() =>
      loadEnv({
        ...valid,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'true',
        JWT_ACCESS_SECRET: 'dev-only-change-me-0000000000000000000000',
      }),
    ).toThrow(EnvValidationError);
    expect(loadEnv({ ...valid, NODE_ENV: 'production', COOKIE_SECURE: 'true' }).NODE_ENV).toBe(
      'production',
    );
  });

  it('el mensaje de error no filtra los valores', () => {
    expect(() => loadEnv({ ...valid, JWT_ACCESS_SECRET: 'secreto-corto-visible' })).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining('secreto-corto-visible') as string,
      }) as Error,
    );
  });
});
