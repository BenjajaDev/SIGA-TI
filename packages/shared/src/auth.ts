import { z } from 'zod';
import { userSchema } from './users';

export const loginRequestSchema = z
  .strictObject({
    email: z
      .email({ error: 'Correo inválido' })
      .max(254)
      .transform((value) => value.toLowerCase()),
    password: z.string().min(1, 'La contraseña es obligatoria').max(128),
  })
  .meta({ id: 'LoginRequest' });

export const authSessionSchema = z
  .object({
    accessToken: z.string(),
    expiresIn: z.number().int().positive(),
    user: userSchema,
  })
  .meta({ id: 'AuthSession' });

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
