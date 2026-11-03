import { z } from 'zod';
import { isoDateTimeSchema } from './common';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const LOGO_DATA_URL = /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/;

export const MAX_LOGO_DATA_URL_LENGTH = 300_000;
export const MIN_PRIMARY_CONTRAST = 4.5;
export const MIN_SECONDARY_CONTRAST = 3;

const channel = (value: number): number => {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
};

/** Razón de contraste WCAG entre un color #rrggbb y el blanco. */
export const contrastWithWhite = (hex: string): number => {
  const red = channel(parseInt(hex.slice(1, 3), 16));
  const green = channel(parseInt(hex.slice(3, 5), 16));
  const blue = channel(parseInt(hex.slice(5, 7), 16));
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return 1.05 / (luminance + 0.05);
};

const colorWith = (minContrast: number, label: string) =>
  z
    .string()
    .regex(HEX_COLOR, 'Use el formato #RRGGBB')
    .refine((value) => !HEX_COLOR.test(value) || contrastWithWhite(value) >= minContrast, {
      error: `${label} es demasiado claro: el texto blanco no sería legible`,
    });

const brandingFields = {
  institutionName: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  primaryColor: colorWith(MIN_PRIMARY_CONTRAST, 'El color primario'),
  secondaryColor: colorWith(MIN_SECONDARY_CONTRAST, 'El color secundario'),
  gradientAngle: z.number().int().min(0).max(360),
  logoDataUrl: z
    .string()
    .max(MAX_LOGO_DATA_URL_LENGTH, 'El logo supera el tamaño permitido (≈200 KB)')
    .regex(LOGO_DATA_URL, 'El logo debe ser PNG, JPG, WebP o SVG')
    .nullable(),
};

export const brandingSchema = z
  .object({ ...brandingFields, updatedAt: isoDateTimeSchema.nullable() })
  .meta({ id: 'Branding' });

export const updateBrandingRequestSchema = z
  .strictObject(brandingFields)
  .meta({ id: 'UpdateBrandingRequest' });

export type Branding = z.infer<typeof brandingSchema>;
export type UpdateBrandingRequest = z.infer<typeof updateBrandingRequestSchema>;

export const DEFAULT_BRANDING: UpdateBrandingRequest = {
  institutionName: 'SIGA-TI',
  primaryColor: '#1e3a8a',
  secondaryColor: '#0f766e',
  gradientAngle: 135,
  logoDataUrl: null,
};
