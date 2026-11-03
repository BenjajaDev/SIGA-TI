import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateCommentInput, CreateTicketInput, TransitionTicketRequest } from '@siga/shared';
import { queryKeys } from '../lib/query-keys';
import { services } from '../services';
import type { TicketListParams } from '../services/ticket-service';

export const useTicketList = (params: TicketListParams) =>
  useQuery({
    queryKey: queryKeys.tickets.list(params),
    queryFn: () => services.tickets.list(params),
    placeholderData: keepPreviousData,
  });

export const useTicket = (id: string) =>
  useQuery({ queryKey: queryKeys.tickets.detail(id), queryFn: () => services.tickets.get(id) });

export const useTicketEvents = (id: string) =>
  useQuery({ queryKey: queryKeys.tickets.events(id), queryFn: () => services.tickets.events(id) });

export const useTicketComments = (id: string) =>
  useQuery({
    queryKey: queryKeys.tickets.comments(id),
    queryFn: () => services.tickets.comments(id),
  });

const useInvalidateTickets = () => {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.tickets.all }),
      client.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    ]);
};

export const useCreateTicket = () => {
  const invalidate = useInvalidateTickets();
  return useMutation({
    mutationFn: (body: CreateTicketInput) => services.tickets.create(body),
    onSuccess: invalidate,
  });
};

export const useAssignTicket = (ticketId: string) => {
  const invalidate = useInvalidateTickets();
  return useMutation({
    mutationFn: (assigneeId: string) => services.tickets.assign(ticketId, assigneeId),
    onSuccess: invalidate,
  });
};

export const useTransitionTicket = (ticketId: string) => {
  const invalidate = useInvalidateTickets();
  return useMutation({
    mutationFn: (body: TransitionTicketRequest) => services.tickets.transition(ticketId, body),
    onSuccess: invalidate,
  });
};

export const useAddComment = (ticketId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCommentInput) => services.tickets.addComment(ticketId, body),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.tickets.comments(ticketId) }),
  });
};
