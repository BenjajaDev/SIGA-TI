import type {
  CommentVisibility,
  Priority,
  Role,
  TicketEventType,
  TicketStatus,
} from '@siga/shared';

export interface Actor {
  readonly id: string;
  readonly role: Role;
}

export interface UserSummary {
  readonly id: string;
  readonly fullName: string;
}

export interface User extends UserSummary {
  readonly email: string;
  readonly role: Role;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
}

export interface Ticket {
  readonly id: string;
  readonly number: number;
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly category: { readonly id: string; readonly name: string };
  readonly priority: Priority;
  readonly status: TicketStatus;
  readonly requester: UserSummary;
  readonly assignee: UserSummary | null;
  readonly dueAt: Date;
  readonly resolvedAt: Date | null;
  readonly closedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TicketEvent {
  readonly id: string;
  readonly ticketId: string;
  readonly type: TicketEventType;
  readonly actor: UserSummary;
  readonly fromStatus: TicketStatus | null;
  readonly toStatus: TicketStatus | null;
  readonly fromAssignee: UserSummary | null;
  readonly toAssignee: UserSummary | null;
  readonly note: string | null;
  readonly createdAt: Date;
}

export interface Comment {
  readonly id: string;
  readonly ticketId: string;
  readonly author: UserSummary;
  readonly body: string;
  readonly visibility: CommentVisibility;
  readonly createdAt: Date;
}

export interface RefreshTokenRecord {
  readonly id: string;
  readonly userId: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}
