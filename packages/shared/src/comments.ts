import { z } from 'zod';
import { isoDateTimeSchema, itemsOf, userSummarySchema, uuidSchema } from './common';
import { commentVisibilitySchema } from './enums';

export const commentSchema = z
  .object({
    id: uuidSchema,
    author: userSummarySchema,
    body: z.string(),
    visibility: commentVisibilitySchema,
    createdAt: isoDateTimeSchema,
  })
  .meta({ id: 'Comment' });

export const createCommentRequestSchema = z
  .strictObject({
    body: z.string().trim().min(1, 'El comentario es obligatorio').max(2000),
    visibility: commentVisibilitySchema.default('PUBLICO'),
  })
  .meta({ id: 'CreateCommentRequest' });

export const commentListSchema = itemsOf(commentSchema);

export type Comment = z.infer<typeof commentSchema>;
export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>;
