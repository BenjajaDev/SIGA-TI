import {
  commentListSchema,
  commentSchema,
  ticketEventListSchema,
  ticketPageSchema,
  ticketSchema,
  type AssignTicketRequest,
  type Comment,
  type CreateCommentInput,
  type CreateTicketInput,
  type ListTicketsQuery,
  type Ticket,
  type TicketEvent,
  type TransitionTicketRequest,
} from '@siga/shared';
import type { z } from 'zod';
import type { HttpClient } from './http-client';

export type TicketListParams = Partial<Omit<ListTicketsQuery, 'page' | 'pageSize'>> & {
  readonly page?: number;
  readonly pageSize?: number;
};
export type TicketPage = z.output<typeof ticketPageSchema>;

export interface TicketService {
  list(params: TicketListParams): Promise<TicketPage>;
  get(id: string): Promise<Ticket>;
  create(body: CreateTicketInput): Promise<Ticket>;
  assign(id: string, assigneeId: AssignTicketRequest['assigneeId']): Promise<Ticket>;
  transition(id: string, body: TransitionTicketRequest): Promise<Ticket>;
  events(id: string): Promise<TicketEvent[]>;
  comments(id: string): Promise<Comment[]>;
  addComment(id: string, body: CreateCommentInput): Promise<Comment>;
}

export const createTicketService = (client: HttpClient): TicketService => ({
  list: (params) => client.get('/tickets', ticketPageSchema, { ...params }),
  get: (id) => client.get(`/tickets/${id}`, ticketSchema),
  create: (body) => client.post('/tickets', ticketSchema, body),
  assign: (id, assigneeId) => client.put(`/tickets/${id}/assignment`, ticketSchema, { assigneeId }),
  transition: (id, body) => client.post(`/tickets/${id}/transitions`, ticketSchema, body),
  events: async (id) => (await client.get(`/tickets/${id}/events`, ticketEventListSchema)).items,
  comments: async (id) => (await client.get(`/tickets/${id}/comments`, commentListSchema)).items,
  addComment: (id, body) => client.post(`/tickets/${id}/comments`, commentSchema, body),
});
