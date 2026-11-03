import type { ErrorCode } from '@siga/shared';

export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'INVALID_RESPONSE';

export interface FieldError {
  readonly path: string;
  readonly message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    readonly details: readonly FieldError[] = [],
    readonly requestId: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const errorMessage = (error: unknown): string =>
  isApiError(error) ? error.message : 'Ocurrió un error inesperado';
