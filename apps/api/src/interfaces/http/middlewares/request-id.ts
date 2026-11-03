import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { z } from 'zod';

const REQUEST_ID_HEADER = 'x-request-id';
const uuid = z.uuid();

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = uuid.safeParse(req.header(REQUEST_ID_HEADER));
  res.setHeader(REQUEST_ID_HEADER, incoming.success ? incoming.data : randomUUID());
  next();
};
