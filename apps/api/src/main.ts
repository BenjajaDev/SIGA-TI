import type { Express } from 'express';
import type { Logger } from 'pino';
import { AuthenticateAccessTokenUseCase } from './application/use-cases/auth/authenticate-access-token';
import { LoginUseCase } from './application/use-cases/auth/login';
import { LogoutUseCase } from './application/use-cases/auth/logout';
import { RefreshSessionUseCase } from './application/use-cases/auth/refresh-session';
import { SessionIssuer } from './application/use-cases/auth/session-issuer';
import {
  GetBrandingUseCase,
  UpdateBrandingUseCase,
} from './application/use-cases/branding/branding';
import { ListCategoriesUseCase, ListUsersUseCase } from './application/use-cases/catalog/catalog';
import {
  CreateUserUseCase,
  DeactivateUserUseCase,
  UpdateUserUseCase,
} from './application/use-cases/catalog/manage-users';
import {
  GetDashboardSummaryUseCase,
  GetResolutionMetricsUseCase,
  GetTechnicianWorkloadUseCase,
  GetTicketsByCategoryUseCase,
} from './application/use-cases/dashboard/dashboard';
import { AssignTicketUseCase } from './application/use-cases/tickets/assign-ticket';
import { AddCommentUseCase, ListCommentsUseCase } from './application/use-cases/tickets/comments';
import { CreateTicketUseCase } from './application/use-cases/tickets/create-ticket';
import { GetTicketUseCase } from './application/use-cases/tickets/get-ticket';
import { ListTicketEventsUseCase } from './application/use-cases/tickets/list-ticket-events';
import { ListTicketsUseCase } from './application/use-cases/tickets/list-tickets';
import { TransitionTicketUseCase } from './application/use-cases/tickets/transition-ticket';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_MS } from './config/constants';
import type { Env } from './config/env';
import type { Clock, PasswordHasher } from './domain/ports/security';
import { SimulatedIdentityProvider } from './infrastructure/identity/simulated-identity-provider';
import { createLogger } from './infrastructure/logging/logger';
import type { Database } from './infrastructure/persistence/prisma-client';
import {
  PrismaCategoryRepository,
  PrismaSlaPolicyRepository,
} from './infrastructure/persistence/repositories/prisma-catalog-repositories';
import { PrismaBrandingRepository } from './infrastructure/persistence/repositories/prisma-branding-repository';
import { PrismaCommentRepository } from './infrastructure/persistence/repositories/prisma-comment-repository';
import { PrismaDashboardQueries } from './infrastructure/persistence/repositories/prisma-dashboard-queries';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/repositories/prisma-refresh-token-repository';
import { PrismaTicketRepository } from './infrastructure/persistence/repositories/prisma-ticket-repository';
import { PrismaUserRepository } from './infrastructure/persistence/repositories/prisma-user-repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { JoseTokenService } from './infrastructure/security/jose-token-service';
import { SystemClock } from './infrastructure/time/system-clock';
import { createApp } from './interfaces/http/app';

export interface Overrides {
  readonly clock?: Clock;
  readonly hasher?: PasswordHasher;
  readonly logger?: Logger;
}

/** Composition root: único lugar que conecta infraestructura con casos de uso. */
export const buildApp = (env: Env, db: Database, overrides: Overrides = {}): Express => {
  const clock = overrides.clock ?? new SystemClock();
  const hasher = overrides.hasher ?? new Argon2PasswordHasher();
  const logger = overrides.logger ?? createLogger(env);
  const tokens = new JoseTokenService(env.JWT_ACCESS_SECRET, ACCESS_TOKEN_TTL_SECONDS);

  const users = new PrismaUserRepository(db);
  const tickets = new PrismaTicketRepository(db);
  const comments = new PrismaCommentRepository(db);
  const categories = new PrismaCategoryRepository(db);
  const slaPolicies = new PrismaSlaPolicyRepository(db);
  const refreshTokens = new PrismaRefreshTokenRepository(db);
  const dashboardQueries = new PrismaDashboardQueries(db);
  const brandingRepository = new PrismaBrandingRepository(db);
  const identity = new SimulatedIdentityProvider(db, hasher);

  const sessions = new SessionIssuer(tokens, refreshTokens, clock, {
    accessTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshTtlMs: REFRESH_TOKEN_TTL_MS,
  });

  return createApp({
    env,
    logger,
    authenticateUseCase: new AuthenticateAccessTokenUseCase(tokens, users),
    auth: {
      login: new LoginUseCase(identity, users, sessions, clock),
      refresh: new RefreshSessionUseCase(tokens, refreshTokens, users, sessions, clock),
      logout: new LogoutUseCase(tokens, refreshTokens, clock),
    },
    tickets: {
      clock,
      create: new CreateTicketUseCase(tickets, users, categories, slaPolicies, clock),
      list: new ListTicketsUseCase(tickets),
      get: new GetTicketUseCase(tickets),
      assign: new AssignTicketUseCase(tickets, users, clock),
      transition: new TransitionTicketUseCase(tickets, clock),
      events: new ListTicketEventsUseCase(tickets),
      addComment: new AddCommentUseCase(tickets, comments),
      listComments: new ListCommentsUseCase(tickets, comments),
    },
    dashboard: {
      summary: new GetDashboardSummaryUseCase(dashboardQueries, clock),
      byCategory: new GetTicketsByCategoryUseCase(dashboardQueries),
      workload: new GetTechnicianWorkloadUseCase(dashboardQueries),
      resolution: new GetResolutionMetricsUseCase(dashboardQueries, clock),
    },
    branding: {
      get: new GetBrandingUseCase(brandingRepository),
      update: new UpdateBrandingUseCase(brandingRepository),
    },
    catalog: {
      categories: new ListCategoriesUseCase(categories),
      users: new ListUsersUseCase(users),
      createUser: new CreateUserUseCase(users, hasher),
      updateUser: new UpdateUserUseCase(users, hasher, clock),
      deactivateUser: new DeactivateUserUseCase(users, clock),
    },
  });
};
