import type { RequestHandler } from 'express';
import type { AuthenticateAccessTokenUseCase } from '../../../application/use-cases/auth/authenticate-access-token';
import { UnauthenticatedError } from '../../../domain/errors';

const BEARER = /^Bearer (\S+)$/;

export const authenticate =
  (useCase: AuthenticateAccessTokenUseCase): RequestHandler =>
  async (req, _res, next) => {
    const match = BEARER.exec(req.header('authorization') ?? '');
    if (match?.[1] === undefined) throw new UnauthenticatedError();
    req.user = await useCase.execute(match[1]);
    next();
  };
