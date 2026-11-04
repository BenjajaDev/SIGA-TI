import express, { Router, type RequestHandler } from 'express';
import { updateBrandingRequestSchema, type Branding } from '@siga/shared';
import type {
  BrandingView,
  GetBrandingUseCase,
  UpdateBrandingUseCase,
} from '../../../application/use-cases/branding/branding';
import { assertAdmin } from '../../../domain/services/ticket-access-policy';
import { currentActor } from '../request-context';
import { parseInput } from '../validation';

const LOGO_BODY_LIMIT = '450kb';

export interface BrandingRoutesDeps {
  readonly authenticate: RequestHandler;
  readonly get: GetBrandingUseCase;
  readonly update: UpdateBrandingUseCase;
}

const serialize = (view: BrandingView): Branding => ({
  ...view,
  updatedAt: view.updatedAt === null ? null : view.updatedAt.toISOString(),
});

export const createBrandingRouter = (deps: BrandingRoutesDeps): Router => {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(serialize(await deps.get.execute()));
  });

  router.put('/', deps.authenticate, express.json({ limit: LOGO_BODY_LIMIT }), async (req, res) => {
    const actor = currentActor(req);
    assertAdmin(actor);
    const data = parseInput(updateBrandingRequestSchema, req.body);
    res.json(serialize(await deps.update.execute(actor, data)));
  });

  return router;
};
