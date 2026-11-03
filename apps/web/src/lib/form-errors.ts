import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '../services/api-error';

/** Traslada los errores de validación del servidor a los campos del formulario. Devuelve el mensaje general si no hay detalle por campo. */
export const applyApiErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
): string | null => {
  if (!isApiError(error)) return 'Ocurrió un error inesperado';
  let mapped = 0;
  for (const detail of error.details) {
    if (knownFields.includes(detail.path)) {
      setError(detail.path as Path<T>, { type: 'server', message: detail.message });
      mapped += 1;
    }
  }
  return mapped > 0 ? null : error.message;
};
