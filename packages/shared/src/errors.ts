import { z } from 'zod';

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'NOT_FOUND',
  'INVALID_TRANSITION',
  'INVALID_ASSIGNEE',
  'CONCURRENT_MODIFICATION',
  'TICKET_CLOSED',
  'EMAIL_IN_USE',
  'LAST_ACTIVE_ADMIN',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES).meta({ id: 'ErrorCode' });

export const errorResponseSchema = z
  .object({
    error: z.object({
      code: errorCodeSchema,
      message: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })),
      requestId: z.uuid(),
    }),
  })
  .meta({ id: 'ErrorResponse' });

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
