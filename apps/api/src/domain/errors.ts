import type { ErrorCode } from '@siga/shared';

export interface ErrorDetail {
  readonly path: string;
  readonly message: string;
}

export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;

  constructor(
    message: string,
    readonly details: readonly ErrorDetail[] = [],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
}

export class UnauthenticatedError extends AppError {
  readonly code = 'UNAUTHENTICATED';

  constructor(message = 'Debe iniciar sesión') {
    super(message);
  }
}

export class InvalidCredentialsError extends AppError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Correo o contraseña incorrectos');
  }
}

export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN';

  constructor(message = 'No tiene permiso para realizar esta acción') {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';

  constructor(resource: string) {
    super(`${resource} no encontrada`);
  }
}

export type ConflictCode =
  'INVALID_TRANSITION' | 'INVALID_ASSIGNEE' | 'CONCURRENT_MODIFICATION' | 'TICKET_CLOSED';

export class ConflictError extends AppError {
  constructor(
    readonly code: ConflictCode,
    message: string,
  ) {
    super(message);
  }
}
