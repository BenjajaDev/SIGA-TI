import type { ReactNode } from 'react';
import { errorMessage } from '../../services/api-error';
import { Alert } from '../atoms/alert';
import { Button } from '../atoms/button';
import { Spinner } from '../atoms/spinner';

interface QueryStateProps {
  readonly isPending: boolean;
  readonly error: unknown;
  readonly onRetry?: () => void;
  readonly children: ReactNode;
}

export function QueryState({ isPending, error, onRetry, children }: QueryStateProps) {
  if (isPending) return <Spinner />;
  if (error !== null && error !== undefined) {
    return (
      <div className="space-y-3">
        <Alert>{errorMessage(error)}</Alert>
        {onRetry !== undefined && (
          <Button variant="secondary" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
    );
  }
  return <>{children}</>;
}

export function EmptyState({
  title,
  description,
}: {
  readonly title: string;
  readonly description?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {description !== undefined && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  );
}
