export const ACCESS_TOKEN_TTL_SECONDS = 900;
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;
export const GLOBAL_RATE_LIMIT = { max: 300, windowMs: 60 * 1000 } as const;
export const REFRESH_COOKIE_NAME = 'siga_rt';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
export const API_PREFIX = '/api/v1';
