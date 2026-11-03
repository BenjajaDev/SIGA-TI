import { Router, type RequestHandler } from 'express';
import { resolutionQuerySchema } from '@siga/shared';
import type {
  GetDashboardSummaryUseCase,
  GetResolutionMetricsUseCase,
  GetTechnicianWorkloadUseCase,
  GetTicketsByCategoryUseCase,
} from '../../../application/use-cases/dashboard/dashboard';
import { currentActor } from '../request-context';
import { serializeResolution, serializeSummary } from '../serializers';
import { parseInput } from '../validation';

export interface DashboardRoutesDeps {
  readonly authenticate: RequestHandler;
  readonly summary: GetDashboardSummaryUseCase;
  readonly byCategory: GetTicketsByCategoryUseCase;
  readonly workload: GetTechnicianWorkloadUseCase;
  readonly resolution: GetResolutionMetricsUseCase;
}

export const createDashboardRouter = (deps: DashboardRoutesDeps): Router => {
  const router = Router();
  router.use(deps.authenticate);

  router.get('/summary', async (req, res) => {
    res.json(serializeSummary(await deps.summary.execute(currentActor(req))));
  });

  router.get('/by-category', async (req, res) => {
    res.json({ items: await deps.byCategory.execute(currentActor(req)) });
  });

  router.get('/workload', async (req, res) => {
    res.json({ items: await deps.workload.execute(currentActor(req)) });
  });

  router.get('/resolution', async (req, res) => {
    const { from, to } = parseInput(resolutionQuerySchema, req.query);
    const result = await deps.resolution.execute({
      actor: currentActor(req),
      from: from === undefined ? undefined : new Date(from),
      to: to === undefined ? undefined : new Date(to),
    });
    res.json(serializeResolution(result));
  });

  return router;
};
