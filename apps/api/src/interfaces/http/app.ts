import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import type { Logger } from 'pino';
import { API_PREFIX, GLOBAL_RATE_LIMIT, LOGIN_RATE_WINDOW_MS } from '../../config/constants';
import type { Env } from '../../config/env';
import { buildErrorBody } from './http-error';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { authenticate } from './middlewares/authenticate';
import { requestId } from './middlewares/request-id';
import { buildOpenApiDocument } from './openapi/registry';
import { requestIdOf } from './request-context';
import { createAuthRouter, type AuthRoutesDeps } from './routes/auth-routes';
import {
  createCategoriesRouter,
  createUsersRouter,
  type CatalogRoutesDeps,
} from './routes/catalog-routes';
import { createDashboardRouter, type DashboardRoutesDeps } from './routes/dashboard-routes';
import { createTicketRouter, type TicketRoutesDeps } from './routes/ticket-routes';
import type { AuthenticateAccessTokenUseCase } from '../../application/use-cases/auth/authenticate-access-token';

export interface AppDependencies {
  readonly env: Pick<
    Env,
    'NODE_ENV' | 'CORS_ALLOWED_ORIGINS' | 'COOKIE_SECURE' | 'RATE_LIMIT_LOGIN_MAX'
  >;
  readonly logger: Logger;
  readonly authenticateUseCase: AuthenticateAccessTokenUseCase;
  readonly auth: Omit<AuthRoutesDeps, 'authenticate' | 'loginRateLimiter' | 'cookieSecure'>;
  readonly tickets: Omit<TicketRoutesDeps, 'authenticate'>;
  readonly dashboard: Omit<DashboardRoutesDeps, 'authenticate'>;
  readonly catalog: Omit<CatalogRoutesDeps, 'authenticate'>;
}

interface LimiterOptions {
  readonly max: number;
  readonly windowMs: number;
}

const createLimiter = ({ max, windowMs }: LimiterOptions): ReturnType<typeof rateLimit> =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res
        .status(429)
        .json(
          buildErrorBody(
            'RATE_LIMITED',
            'Demasiadas peticiones, intente nuevamente más tarde',
            [],
            requestIdOf(res),
          ),
        );
    },
  });

export const createApp = (deps: AppDependencies): Express => {
  const { env, logger } = deps;
  const app = express();
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (_req, res) => String(res.getHeader('x-request-id')),
    }),
  );

  if (env.NODE_ENV !== 'production') {
    app.use(
      '/api/docs',
      helmet({ contentSecurityPolicy: false }),
      swaggerUi.serve,
      swaggerUi.setup(buildOpenApiDocument()),
    );
  }

  app.use(helmet());
  app.use(cors({ origin: [...env.CORS_ALLOWED_ORIGINS], credentials: true }));
  app.use(createLimiter(GLOBAL_RATE_LIMIT));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const requireAuth = authenticate(deps.authenticateUseCase);
  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  api.use(
    '/auth',
    createAuthRouter({
      ...deps.auth,
      authenticate: requireAuth,
      loginRateLimiter: createLimiter({
        max: env.RATE_LIMIT_LOGIN_MAX,
        windowMs: LOGIN_RATE_WINDOW_MS,
      }),
      cookieSecure: env.COOKIE_SECURE,
    }),
  );
  api.use('/tickets', createTicketRouter({ ...deps.tickets, authenticate: requireAuth }));
  api.use('/dashboard', createDashboardRouter({ ...deps.dashboard, authenticate: requireAuth }));
  api.use('/categories', createCategoriesRouter({ ...deps.catalog, authenticate: requireAuth }));
  api.use('/users', createUsersRouter({ ...deps.catalog, authenticate: requireAuth }));
  app.use(API_PREFIX, api);

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
};
