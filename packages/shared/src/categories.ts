import { z } from 'zod';
import { itemsOf, uuidSchema } from './common';

export const categorySchema = z
  .object({
    id: uuidSchema,
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
  })
  .meta({ id: 'Category' });

export const categoryListSchema = itemsOf(categorySchema);

export type Category = z.infer<typeof categorySchema>;
