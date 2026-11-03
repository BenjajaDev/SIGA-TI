import { Router, type RequestHandler } from 'express';
import {
  assignTicketRequestSchema,
  createCommentRequestSchema,
  createTicketRequestSchema,
  listTicketsQuerySchema,
  ticketIdParamsSchema,
  transitionTicketRequestSchema,
} from '@siga/shared';
import type { AssignTicketUseCase } from '../../../application/use-cases/tickets/assign-ticket';
import type {
  AddCommentUseCase,
  ListCommentsUseCase,
} from '../../../application/use-cases/tickets/comments';
import type { CreateTicketUseCase } from '../../../application/use-cases/tickets/create-ticket';
import type { GetTicketUseCase } from '../../../application/use-cases/tickets/get-ticket';
import type { ListTicketEventsUseCase } from '../../../application/use-cases/tickets/list-ticket-events';
import type { ListTicketsUseCase } from '../../../application/use-cases/tickets/list-tickets';
import type { TransitionTicketUseCase } from '../../../application/use-cases/tickets/transition-ticket';
import type { Clock } from '../../../domain/ports/security';
import { currentActor } from '../request-context';
import { serializeComment, serializeEvent, serializeTicket } from '../serializers';
import { parseInput } from '../validation';

export interface TicketRoutesDeps {
  readonly authenticate: RequestHandler;
  readonly clock: Clock;
  readonly create: CreateTicketUseCase;
  readonly list: ListTicketsUseCase;
  readonly get: GetTicketUseCase;
  readonly assign: AssignTicketUseCase;
  readonly transition: TransitionTicketUseCase;
  readonly events: ListTicketEventsUseCase;
  readonly addComment: AddCommentUseCase;
  readonly listComments: ListCommentsUseCase;
}

export const createTicketRouter = (deps: TicketRoutesDeps): Router => {
  const router = Router();
  router.use(deps.authenticate);

  const idParam = (params: unknown): string => parseInput(ticketIdParamsSchema, params).ticketId;

  router.post('/', async (req, res) => {
    const body = parseInput(createTicketRequestSchema, req.body);
    const ticket = await deps.create.execute({ actor: currentActor(req), ...body });
    res.status(201).json(serializeTicket(ticket, deps.clock.now()));
  });

  router.get('/', async (req, res) => {
    const { page, pageSize, ...filter } = parseInput(listTicketsQuerySchema, req.query);
    const result = await deps.list.execute({
      actor: currentActor(req),
      filter,
      page: { page, pageSize },
    });
    const now = deps.clock.now();
    res.json({
      items: result.items.map((ticket) => serializeTicket(ticket, now)),
      page,
      pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / pageSize),
    });
  });

  router.get('/:ticketId', async (req, res) => {
    const ticket = await deps.get.execute(currentActor(req), idParam(req.params));
    res.json(serializeTicket(ticket, deps.clock.now()));
  });

  router.put('/:ticketId/assignment', async (req, res) => {
    const { assigneeId } = parseInput(assignTicketRequestSchema, req.body);
    const ticket = await deps.assign.execute({
      actor: currentActor(req),
      ticketId: idParam(req.params),
      assigneeId,
    });
    res.json(serializeTicket(ticket, deps.clock.now()));
  });

  router.post('/:ticketId/transitions', async (req, res) => {
    const { to, note } = parseInput(transitionTicketRequestSchema, req.body);
    const ticket = await deps.transition.execute({
      actor: currentActor(req),
      ticketId: idParam(req.params),
      to,
      note,
    });
    res.json(serializeTicket(ticket, deps.clock.now()));
  });

  router.get('/:ticketId/events', async (req, res) => {
    const events = await deps.events.execute(currentActor(req), idParam(req.params));
    res.json({ items: events.map(serializeEvent) });
  });

  router.get('/:ticketId/comments', async (req, res) => {
    const comments = await deps.listComments.execute(currentActor(req), idParam(req.params));
    res.json({ items: comments.map(serializeComment) });
  });

  router.post('/:ticketId/comments', async (req, res) => {
    const { body, visibility } = parseInput(createCommentRequestSchema, req.body);
    const comment = await deps.addComment.execute({
      actor: currentActor(req),
      ticketId: idParam(req.params),
      body,
      visibility,
    });
    res.status(201).json(serializeComment(comment));
  });

  return router;
};
