import express, { Router, type RequestHandler } from 'express';
import { updateBrandingRequestSchema, type Branding } from '@siga/shared';
import type {
  BrandingView,
  GetBrandingUseCase,
  UpdateBrandingUseCase,
} from '../../../application/use-cases/branding/branding';
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

  router.put('/', express.json({ limit: LOGO_BODY_LIMIT }), deps.authenticate, async (req, res) => {
    const data = parseInput(updateBrandingRequestSchema, req.body);
    res.json(serialize(await deps.update.execute(currentActor(req), data)));
  });

  return router;
};
