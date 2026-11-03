import type { TicketListParams } from '../services/ticket-service';

export const queryKeys = {
  tickets: {
    all: ['tickets'] as const,
    list: (params: TicketListParams) => ['tickets', 'list', params] as const,
    detail: (id: string) => ['tickets', 'detail', id] as const,
    events: (id: string) => ['tickets', 'events', id] as const,
    comments: (id: string) => ['tickets', 'comments', id] as const,
  },
  categories: ['categories'] as const,
  branding: ['branding'] as const,
  users: (filter: object) => ['users', filter] as const,
  dashboard: {
    all: ['dashboard'] as const,
    summary: ['dashboard', 'summary'] as const,
    byCategory: ['dashboard', 'by-category'] as const,
    workload: ['dashboard', 'workload'] as const,
    resolution: (range: object) => ['dashboard', 'resolution', range] as const,
  },
};
