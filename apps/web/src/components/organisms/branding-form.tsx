import { zodResolver } from '@hookform/resolvers/zod';
import {
  DEFAULT_BRANDING,
  MAX_LOGO_DATA_URL_LENGTH,
  updateBrandingRequestSchema,
  type UpdateBrandingRequest,
} from '@siga/shared';
import { useState, type ChangeEvent } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { applyApiErrors } from '../../lib/form-errors';
import { Alert } from '../atoms/alert';
import { Button } from '../atoms/button';
import { Input } from '../atoms/controls';
import { FormField } from '../molecules/form-field';

const FIELDS = [
  'institutionName',
  'primaryColor',
  'secondaryColor',
  'gradientAngle',
  'logoDataUrl',
];

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Formato de archivo no soportado'));
    };
    reader.onerror = () => {
      reject(new Error('No se pudo leer el archivo'));
    };
    reader.readAsDataURL(file);
  });

interface ColorFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly error: string | undefined;
  readonly onChange: (value: string) => void;
}

function ColorField({ id, label, value, error, onChange }: ColorFieldProps) {
  return (
    <FormField id={id} label={label} error={error}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} (selector)`}
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className="size-10 cursor-pointer rounded border border-slate-300 bg-white p-1"
        />
        <Input
          id={id}
          value={value}
          invalid={error !== undefined}
          maxLength={7}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className="font-mono"
        />
      </div>
    </FormField>
  );
}

interface BrandingFormProps {
  readonly initial: UpdateBrandingRequest;
  readonly onSubmit: (values: UpdateBrandingRequest) => Promise<void>;
}

export function BrandingForm({ initial, onSubmit }: BrandingFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateBrandingRequest>({
    resolver: zodResolver(updateBrandingRequestSchema),
    defaultValues: initial,
  });
  const values = useWatch({ control }) as UpdateBrandingRequest;

  const pickLogo = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    setLogoError(null);
    const dataUrl = await readAsDataUrl(file);
    if (dataUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
      setLogoError('El logo supera el tamaño permitido (≈200 KB). Use una imagen más liviana.');
      return;
    }
    setValue('logoDataUrl', dataUrl, { shouldValidate: true, shouldDirty: true });
  };

  const submit = handleSubmit(async (data) => {
    setServerError(null);
    setSaved(false);
    try {
      await onSubmit(data);
      setSaved(true);
    } catch (error) {
      setServerError(applyApiErrors(error, setError, FIELDS));
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="space-y-6">
      {serverError !== null && <Alert>{serverError}</Alert>}
      {saved && (
        <Alert tone="success">Cambios guardados. El tema ya se aplicó a todo el sistema.</Alert>
      )}

      <div
        aria-label="Vista previa del degradado"
        role="img"
        className="flex items-center gap-3 rounded-lg p-5 text-white shadow"
        style={{
          backgroundImage: `linear-gradient(${String(values.gradientAngle)}deg, ${values.primaryColor}, ${values.secondaryColor})`,
        }}
      >
        {values.logoDataUrl !== null && (
          <img src={values.logoDataUrl} alt="" className="h-12 w-auto" />
        )}
        <span className="text-xl font-semibold">{values.institutionName}</span>
      </div>

      <FormField
        id="institutionName"
        label="Nombre de la institución"
        error={errors.institutionName?.message}
      >
        <Input
          id="institutionName"
          invalid={errors.institutionName !== undefined}
          {...register('institutionName')}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <Controller
          control={control}
          name="primaryColor"
          render={({ field }) => (
            <ColorField
              id="primaryColor"
              label="Color primario"
              value={field.value}
              error={errors.primaryColor?.message}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="secondaryColor"
          render={({ field }) => (
            <ColorField
              id="secondaryColor"
              label="Color secundario"
              value={field.value}
              error={errors.secondaryColor?.message}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <FormField
        id="gradientAngle"
        label={`Ángulo del degradado: ${String(values.gradientAngle)}°`}
        error={errors.gradientAngle?.message}
      >
        <Controller
          control={control}
          name="gradientAngle"
          render={({ field }) => (
            <input
              id="gradientAngle"
              type="range"
              min={0}
              max={360}
              step={5}
              value={field.value}
              onChange={(event) => {
                field.onChange(Number(event.target.value));
              }}
              className="w-full accent-brand-700"
            />
          )}
        />
      </FormField>

      <FormField
        id="logo"
        label="Logo"
        hint="PNG, JPG, WebP o SVG de hasta ≈200 KB"
        error={logoError ?? errors.logoDataUrl?.message}
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(event) => void pickLogo(event)}
            className="text-sm"
          />
          {values.logoDataUrl !== null && (
            <Button
              variant="ghost"
              onClick={() => {
                setValue('logoDataUrl', null, { shouldDirty: true });
              }}
            >
              Quitar logo
            </Button>
          )}
        </div>
      </FormField>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={isSubmitting}>
          Guardar cambios
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            reset(DEFAULT_BRANDING);
            setSaved(false);
          }}
        >
          Restaurar valores por defecto
        </Button>
      </div>
    </form>
  );
}
