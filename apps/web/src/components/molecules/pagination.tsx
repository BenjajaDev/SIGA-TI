import { Button } from '../atoms/button';

interface PaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, totalItems, onChange }: PaginationProps) {
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 pt-4">
      <p className="text-sm text-slate-600" aria-live="polite">
        {totalItems} {totalItems === 1 ? 'resultado' : 'resultados'} · Página {page} de{' '}
        {Math.max(totalPages, 1)}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => {
            onChange(page - 1);
          }}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => {
            onChange(page + 1);
          }}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
