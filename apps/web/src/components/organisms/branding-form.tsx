import { zodResolver } from '@hookform/resolvers/zod';
import {
  DEFAULT_BRANDING,
  MAX_LOGO_DATA_URL_LENGTH,
  updateBrandingRequestSchema,
  type UpdateBrandingRequest,
} from '@siga/shared';
import { useRef, useState, type ChangeEvent } from 'react';
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
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
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
    try {
      const dataUrl = await readAsDataUrl(file);
      if (dataUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
        setLogoError('El logo supera el tamaño permitido (≈200 KB). Use una imagen más liviana.');
        event.target.value = '';
        return;
      }
      setValue('logoDataUrl', dataUrl, { shouldValidate: true, shouldDirty: true });
      setLogoFileName(file.name);
    } catch {
      setLogoError('No se pudo leer el archivo. Seleccione otra imagen e inténtelo nuevamente.');
      event.target.value = '';
    }
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
        aria-label="Vista previa de la identidad visual en navegación, panel y tarjetas"
        role="img"
        className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-brand-card"
      >
        <div className="flex min-h-56">
          <aside
            className="hidden w-36 shrink-0 flex-col gap-5 p-3 text-white sm:flex"
            style={{
              backgroundColor: `color-mix(in srgb, ${values.primaryColor} 86%, #0f172a)`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-white/40 bg-white p-0.5">
                {values.logoDataUrl === null ? (
                  <span className="text-xs font-bold text-brand-800">
                    {values.institutionName.charAt(0)}
                  </span>
                ) : (
                  <img src={values.logoDataUrl} alt="" className="h-full w-full object-contain" />
                )}
              </span>
              <span className="truncate text-[10px] font-semibold">{values.institutionName}</span>
            </div>
            <div className="space-y-2 text-[10px]">
              <div
                className="rounded-lg px-2.5 py-2 font-semibold text-white"
                style={{ backgroundColor: 'rgb(255 255 255 / 14%)' }}
              >
                Panel
              </div>
              <div className="px-2.5 py-1 text-white/65">Solicitudes</div>
              <div className="px-2.5 py-1 text-white/65">Indicadores</div>
            </div>
            <span className="mt-auto truncate text-[9px] text-white/55">Acceso institucional</span>
          </aside>
          <div
            className="min-w-0 flex-1 p-3 sm:p-4"
            style={{
              backgroundColor: `color-mix(in srgb, ${values.primaryColor} 3%, #f8fafc)`,
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Gestión de TI
                </p>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-900">
                  Panel de indicadores
                </p>
              </div>
              <span
                className="rounded-lg px-2.5 py-1.5 text-[9px] font-semibold text-white shadow-sm"
                style={{ backgroundColor: values.primaryColor }}
              >
                Ver solicitudes
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['Abiertas', 'En progreso', 'Resueltas'].map((label, index) => (
                <div
                  key={label}
                  className="overflow-hidden rounded-xl border border-surface-border bg-surface p-2 shadow-sm"
                >
                  <div
                    className="mb-2 h-0.5 rounded-full"
                    style={{
                      backgroundImage: `linear-gradient(${String(values.gradientAngle)}deg, ${values.primaryColor}, ${values.secondaryColor})`,
                    }}
                  />
                  <p className="truncate text-[8px] text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{[12, 8, 24][index]}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex h-12 items-end gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-2">
              {[38, 70, 48, 86, 59, 100, 72, 90].map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${String(height)}%`,
                    backgroundImage: `linear-gradient(180deg, ${values.secondaryColor}, ${values.primaryColor})`,
                    opacity: 0.45 + index * 0.07,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
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
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-surface-border bg-surface-muted p-4 sm:flex-row sm:items-center">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white p-2 shadow-sm">
            {values.logoDataUrl === null ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="size-8 text-slate-400"
                aria-hidden="true"
              >
                <path
                  d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13ZM8 9h.01M4.5 17l5-5 3 3 2-2 5 5"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <img
                src={values.logoDataUrl}
                alt="Vista previa del logo"
                className="h-full w-full object-contain"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              {logoFileName ??
                (values.logoDataUrl === null ? 'Sin logo seleccionado' : 'Logo actual')}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              El logo se mostrará sobre un fondo blanco para mantener su legibilidad.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  logoInputRef.current?.click();
                }}
              >
                {values.logoDataUrl === null ? 'Seleccionar logo' : 'Cambiar logo'}
              </Button>
              {values.logoDataUrl !== null && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setValue('logoDataUrl', null, { shouldDirty: true });
                    setLogoFileName(null);
                    if (logoInputRef.current !== null) logoInputRef.current.value = '';
                  }}
                >
                  Quitar logo
                </Button>
              )}
            </div>
          </div>
          <input
            ref={logoInputRef}
            id="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(event) => void pickLogo(event)}
            className="sr-only"
            tabIndex={-1}
            aria-label="Seleccionar archivo de logo"
          />
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
            setLogoFileName(null);
            setLogoError(null);
            if (logoInputRef.current !== null) logoInputRef.current.value = '';
          }}
        >
          Restaurar valores por defecto
        </Button>
      </div>
    </form>
  );
}
