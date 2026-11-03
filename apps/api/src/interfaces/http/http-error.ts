import type { ErrorCode, ErrorResponse } from '@siga/shared';
import type { ErrorDetail } from '../../domain/errors';

export const STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  INVALID_ASSIGNEE: 409,
  CONCURRENT_MODIFICATION: 409,
  TICKET_CLOSED: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export const buildErrorBody = (
  code: ErrorCode,
  message: string,
  details: readonly ErrorDetail[],
  requestId: string,
): ErrorResponse => ({
  error: { code, message, details: details.map((d) => ({ ...d })), requestId },
});
