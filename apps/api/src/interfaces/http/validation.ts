import type { z } from 'zod';
import { ValidationError } from '../../domain/errors';

export const parseInput = <S extends z.ZodType>(schema: S, value: unknown): z.output<S> => {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new ValidationError(
    'Datos inválidos',
    result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  );
};
