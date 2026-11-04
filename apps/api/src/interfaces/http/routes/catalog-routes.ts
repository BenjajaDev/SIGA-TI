import { Router, type RequestHandler } from 'express';
import {
  createUserRequestSchema,
  listUsersQuerySchema,
  updateUserRequestSchema,
  userIdParamsSchema,
} from '@siga/shared';
import type {
  ListCategoriesUseCase,
  ListUsersUseCase,
} from '../../../application/use-cases/catalog/catalog';
import type {
  CreateUserUseCase,
  DeactivateUserUseCase,
  UpdateUserUseCase,
} from '../../../application/use-cases/catalog/manage-users';
import { currentActor } from '../request-context';
import { serializeCategory, serializeUser } from '../serializers';
import { parseInput } from '../validation';

export interface CatalogRoutesDeps {
  readonly authenticate: RequestHandler;
  readonly categories: ListCategoriesUseCase;
  readonly users: ListUsersUseCase;
  readonly createUser: CreateUserUseCase;
  readonly updateUser: UpdateUserUseCase;
  readonly deactivateUser: DeactivateUserUseCase;
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
  router.post('/', async (req, res) => {
    const body = parseInput(createUserRequestSchema, req.body);
    const user = await deps.createUser.execute(currentActor(req), body);
    res.status(201).json(serializeUser(user));
  });
  router.put('/:userId', async (req, res) => {
    const { userId } = parseInput(userIdParamsSchema, req.params);
    const body = parseInput(updateUserRequestSchema, req.body);
    const user = await deps.updateUser.execute(currentActor(req), userId, body);
    res.json(serializeUser(user));
  });
  router.delete('/:userId', async (req, res) => {
    const { userId } = parseInput(userIdParamsSchema, req.params);
    await deps.deactivateUser.execute(currentActor(req), userId);
    res.status(204).end();
  });
  return router;
};
