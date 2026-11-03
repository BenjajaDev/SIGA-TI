import { Link } from 'react-router';
import { PageHeader } from '../components/molecules/page-header';

export function NotFoundPage() {
  return (
    <div>
      <PageHeader title="Página no encontrada" subtitle="La dirección no existe o fue movida." />
      <Link to="/tickets" className="font-medium text-brand-700 underline">
        Volver a las solicitudes
      </Link>
    </div>
  );
}
