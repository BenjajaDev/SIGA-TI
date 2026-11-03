import { z } from 'zod';
import { isoDateTimeSchema, itemsOf, uuidSchema } from './common';
import { roleSchema } from './enums';

export const userSchema = z
  .object({
    id: uuidSchema,
    email: z.email(),
    fullName: z.string(),
    role: roleSchema,
    isActive: z.boolean(),
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'User' });

export const listUsersQuerySchema = z.object({
  role: roleSchema.optional(),
  isActive: z.stringbool().optional(),
});

export const userListSchema = itemsOf(userSchema);

export type User = z.infer<typeof userSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
