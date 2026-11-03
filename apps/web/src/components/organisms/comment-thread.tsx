import {
  canComment,
  canWriteInternalComment,
  createCommentRequestSchema,
  type Comment,
  type Ticket,
  type User,
} from '@siga/shared';
import { useState } from 'react';
import { useAddComment, useTicketComments } from '../../hooks/use-tickets';
import { formatDateTime } from '../../lib/format';
import { VISIBILITY_LABEL } from '../../lib/labels';
import { actorContextFor } from '../../lib/ticket-context';
import { errorMessage } from '../../services/api-error';
import { Alert } from '../atoms/alert';
import { Button } from '../atoms/button';
import { Select, Textarea } from '../atoms/controls';
import { FormField } from '../molecules/form-field';
import { EmptyState, QueryState } from '../molecules/query-state';

function CommentItem({ comment }: { readonly comment: Comment }) {
  const internal = comment.visibility === 'INTERNO';
  return (
    <li
      className={`rounded-md border p-3 ${internal ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}
    >
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-slate-900">{comment.author.fullName}</span>
        {internal && (
          <span className="rounded bg-amber-200 px-1.5 text-xs font-medium text-amber-900">
            {VISIBILITY_LABEL.INTERNO}
          </span>
        )}
        <time dateTime={comment.createdAt} className="text-xs text-slate-500">
          {formatDateTime(comment.createdAt)}
        </time>
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{comment.body}</p>
    </li>
  );
}

export function CommentThread({ ticket, user }: { readonly ticket: Ticket; readonly user: User }) {
  const comments = useTicketComments(ticket.id);
  const add = useAddComment(ticket.id);
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'PUBLICO' | 'INTERNO'>('PUBLICO');
  const ctx = actorContextFor(user, ticket);
  const writable = canComment(ctx, ticket.status);
  const internalAllowed = canWriteInternalComment(ctx, ticket.status);
  const parsed = createCommentRequestSchema.safeParse({ body, visibility });

  return (
    <div className="space-y-4">
      <QueryState
        isPending={comments.isPending}
        error={comments.error}
        onRetry={() => void comments.refetch()}
      >
        {comments.data?.length === 0 ? (
          <EmptyState title="Aún no hay comentarios" />
        ) : (
          <ul className="space-y-3">
            {comments.data?.map((c) => (
              <CommentItem key={c.id} comment={c} />
            ))}
          </ul>
        )}
      </QueryState>
      {writable ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!parsed.success) return;
            add.mutate(parsed.data, {
              onSuccess: () => {
                setBody('');
              },
            });
          }}
        >
          {add.error !== null && <Alert>{errorMessage(add.error)}</Alert>}
          <FormField id="comment-body" label="Agregar comentario">
            <Textarea
              id="comment-body"
              rows={3}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
              }}
            />
          </FormField>
          {internalAllowed && (
            <FormField id="comment-visibility" label="Visibilidad">
              <Select
                id="comment-visibility"
                value={visibility}
                onChange={(e) => {
                  setVisibility(e.target.value as 'PUBLICO' | 'INTERNO');
                }}
              >
                <option value="PUBLICO">{VISIBILITY_LABEL.PUBLICO} (lo ve el solicitante)</option>
                <option value="INTERNO">{VISIBILITY_LABEL.INTERNO} (solo el equipo TI)</option>
              </Select>
            </FormField>
          )}
          <Button type="submit" loading={add.isPending} disabled={!parsed.success}>
            Publicar comentario
          </Button>
        </form>
      ) : (
        <p className="text-sm text-slate-500">
          {ticket.status === 'CERRADA'
            ? 'La solicitud está cerrada: no admite comentarios.'
            : 'No puede comentar esta solicitud.'}
        </p>
      )}
    </div>
  );
}
