import { Router, type CookieOptions, type Request, type Response } from 'express';
import { loginRequestSchema } from '@siga/shared';
import type { IssuedSession } from '../../../application/use-cases/auth/session-issuer';
import type { LoginUseCase } from '../../../application/use-cases/auth/login';
import type { LogoutUseCase } from '../../../application/use-cases/auth/logout';
import type { RefreshSessionUseCase } from '../../../application/use-cases/auth/refresh-session';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '../../../config/constants';
import { UnauthenticatedError } from '../../../domain/errors';
import { currentUser } from '../request-context';
import { serializeSession, serializeUser } from '../serializers';
import { parseInput } from '../validation';
import type { RequestHandler } from 'express';

const readRefreshCookie = (req: Request): string | undefined => {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export interface AuthRoutesDeps {
  readonly login: LoginUseCase;
  readonly refresh: RefreshSessionUseCase;
  readonly logout: LogoutUseCase;
  readonly authenticate: RequestHandler;
  readonly loginRateLimiter: RequestHandler;
  readonly cookieSecure: boolean;
}

export const createAuthRouter = (deps: AuthRoutesDeps): Router => {
  const baseCookie: CookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: deps.cookieSecure,
    path: REFRESH_COOKIE_PATH,
  };

  const setRefreshCookie = (res: Response, session: IssuedSession): void => {
    res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, {
      ...baseCookie,
      expires: session.refreshExpiresAt,
    });
  };
  const clearRefreshCookie = (res: Response): void => {
    res.clearCookie(REFRESH_COOKIE_NAME, baseCookie);
  };

  const router = Router();

  router.post('/login', deps.loginRateLimiter, async (req, res) => {
    const input = parseInput(loginRequestSchema, req.body);
    const session = await deps.login.execute(input);
    setRefreshCookie(res, session);
    res.json(serializeSession(session));
  });

  router.post('/refresh', async (req, res) => {
    const token = readRefreshCookie(req);
    try {
      if (token === undefined) throw new UnauthenticatedError();
      const session = await deps.refresh.execute(token);
      setRefreshCookie(res, session);
      res.json(serializeSession(session));
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  });

  router.post('/logout', async (req, res) => {
    await deps.logout.execute(readRefreshCookie(req));
    clearRefreshCookie(res);
    res.status(204).end();
  });

  router.get('/me', deps.authenticate, (req, res) => {
    res.json(serializeUser(currentUser(req)));
  });

  return router;
};
