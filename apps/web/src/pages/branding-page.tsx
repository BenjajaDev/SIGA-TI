import { Card } from '../components/atoms/card';
import { PageHeader } from '../components/molecules/page-header';
import { QueryState } from '../components/molecules/query-state';
import { BrandingForm } from '../components/organisms/branding-form';
import { useBranding, useUpdateBranding } from '../hooks/use-branding';

export function BrandingPage() {
  const branding = useBranding();
  const update = useUpdateBranding();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Apariencia"
        subtitle="Nombre, logo, colores y degradado de todo el sistema"
      />
      <Card>
        <QueryState isPending={branding.isPending} error={branding.error}>
          {branding.data !== undefined && (
            <BrandingForm
              initial={{
                institutionName: branding.data.institutionName,
                primaryColor: branding.data.primaryColor,
                secondaryColor: branding.data.secondaryColor,
                gradientAngle: branding.data.gradientAngle,
                logoDataUrl: branding.data.logoDataUrl,
              }}
              onSubmit={async (values) => {
                await update.mutateAsync(values);
              }}
            />
          )}
        </QueryState>
      </Card>
    </div>
  );
}
