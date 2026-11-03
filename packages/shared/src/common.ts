import { z } from 'zod';

export const uuidSchema = z.uuid({ error: 'Identificador inválido' });
export const isoDateTimeSchema = z.iso.datetime({ error: 'Fecha inválida (ISO-8601)' });

export const userSummarySchema = z
  .object({ id: uuidSchema, fullName: z.string() })
  .meta({ id: 'UserSummary' });

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const pageMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const paginated = <T extends z.ZodType>(item: T) =>
  pageMetaSchema.extend({ items: z.array(item) });

export const itemsOf = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });

export type UserSummary = z.infer<typeof userSummarySchema>;
export type PageQuery = z.infer<typeof pageQuerySchema>;
export type PageMeta = z.infer<typeof pageMetaSchema>;
