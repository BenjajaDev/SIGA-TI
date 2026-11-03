import type { Request, Response } from 'express';
import type { Actor, User } from '../../domain/entities';
import { UnauthenticatedError } from '../../domain/errors';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export const currentUser = (req: Request): User => {
  if (req.user === undefined) throw new UnauthenticatedError();
  return req.user;
};

export const currentActor = (req: Request): Actor => {
  const { id, role } = currentUser(req);
  return { id, role };
};

export const requestIdOf = (res: Response): string => {
  const value = res.getHeader('x-request-id');
  return typeof value === 'string' ? value : '';
};
