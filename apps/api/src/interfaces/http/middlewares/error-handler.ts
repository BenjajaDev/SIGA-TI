import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';
import { AppError } from '../../../domain/errors';
import { buildErrorBody, STATUS_BY_CODE } from '../http-error';
import { requestIdOf } from '../request-context';

interface HttpLikeError {
  readonly status?: unknown;
  readonly statusCode?: unknown;
}

const clientStatusOf = (error: unknown): number | null => {
  if (typeof error !== 'object' || error === null) return null;
  const { status, statusCode } = error as HttpLikeError;
  const value = typeof status === 'number' ? status : statusCode;
  return typeof value === 'number' && value >= 400 && value < 500 ? value : null;
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(buildErrorBody('NOT_FOUND', 'Recurso no encontrado', [], requestIdOf(res)));
};

export const errorHandler =
  (logger: Logger): ErrorRequestHandler =>
  (error: unknown, _req, res, _next) => {
    const requestId = requestIdOf(res);

    if (error instanceof AppError) {
      res
        .status(STATUS_BY_CODE[error.code])
        .json(buildErrorBody(error.code, error.message, error.details, requestId));
      return;
    }

    if (clientStatusOf(error) !== null) {
      res
        .status(400)
        .json(buildErrorBody('VALIDATION_ERROR', 'Cuerpo de la petición inválido', [], requestId));
      return;
    }

    logger.error({ err: error, requestId }, 'Error no controlado');
    res
      .status(500)
      .json(buildErrorBody('INTERNAL_ERROR', 'Ocurrió un error inesperado', [], requestId));
  };
