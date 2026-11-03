import { Router, type RequestHandler } from 'express';
import { listUsersQuerySchema } from '@siga/shared';
import type {
  ListCategoriesUseCase,
  ListUsersUseCase,
} from '../../../application/use-cases/catalog/catalog';
import { currentActor } from '../request-context';
import { serializeCategory, serializeUser } from '../serializers';
import { parseInput } from '../validation';

export interface CatalogRoutesDeps {
  readonly authenticate: RequestHandler;
  readonly categories: ListCategoriesUseCase;
  readonly users: ListUsersUseCase;
}

export const createCategoriesRouter = (deps: CatalogRoutesDeps): Router => {
  const router = Router();
  router.use(deps.authenticate);
  router.get('/', async (_req, res) => {
    res.json({ items: (await deps.categories.execute()).map(serializeCategory) });
  });
  return router;
};

export const createUsersRouter = (deps: CatalogRoutesDeps): Router => {
  const router = Router();
  router.use(deps.authenticate);
  router.get('/', async (req, res) => {
    const filter = parseInput(listUsersQuerySchema, req.query);
    const users = await deps.users.execute(currentActor(req), filter);
    res.json({ items: users.map(serializeUser) });
  });
  return router;
};
