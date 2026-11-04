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

const userProfileFields = {
  email: z
    .email({ error: 'Correo inválido' })
    .max(254)
    .transform((value) => value.trim().toLowerCase()),
  fullName: z.string().trim().min(2, 'Ingrese al menos 2 caracteres').max(120),
  role: roleSchema,
};

export const createUserRequestSchema = z
  .strictObject({
    ...userProfileFields,
    password: z.string().min(12, 'La contraseña debe tener al menos 12 caracteres').max(128),
  })
  .meta({ id: 'CreateUserRequest' });

export const updateUserRequestSchema = z
  .strictObject({
    ...userProfileFields,
    isActive: z.boolean(),
    password: z
      .string()
      .min(12, 'La contraseña debe tener al menos 12 caracteres')
      .max(128)
      .optional(),
  })
  .meta({ id: 'UpdateUserRequest' });

export const userIdParamsSchema = z
  .strictObject({ userId: uuidSchema })
  .meta({ id: 'UserIdParams' });

export const userListSchema = itemsOf(userSchema);

export type User = z.infer<typeof userSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
