import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import {
  InvalidWorkspaceDescriptionError,
  InvalidWorkspaceNameError,
} from './workspace.errors';
import {
  DEFAULT_WORKSPACE_COLOR,
  DEFAULT_WORKSPACE_ICON,
  WORKSPACE_DESCRIPTION_MAX_LENGTH,
  WORKSPACE_NAME_MAX_LENGTH,
} from './workspaces.constants';

const CONTROL_CHARS = /\p{Cc}/u;

// The module exports its use cases, so callers other than the HTTP layer can
// reach the entity without passing DTO validation — the length limits must
// hold here or oversized values surface as column-overflow 500s.
function validateWorkspaceName(name: string): void {
  if (
    name.length === 0 ||
    name.length > WORKSPACE_NAME_MAX_LENGTH ||
    name !== name.trim() ||
    CONTROL_CHARS.test(name)
  ) {
    throw new InvalidWorkspaceNameError(name);
  }
}

function validateWorkspaceDescription(description: string | null): void {
  if (
    description !== null &&
    description.length > WORKSPACE_DESCRIPTION_MAX_LENGTH
  ) {
    throw new InvalidWorkspaceDescriptionError();
  }
}

export class Workspace {
  public readonly id: UUID;
  public readonly userId: UUID;
  public readonly orgId: UUID;
  public readonly createdAt: Date;
  public name: string;
  public description: string | null;
  public icon: string;
  public color: string;
  public isPinned: boolean;
  public sortOrder: number;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    orgId: UUID;
    name: string;
    description?: string | null;
    icon?: string;
    color?: string;
    isPinned?: boolean;
    sortOrder?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    validateWorkspaceName(params.name);
    validateWorkspaceDescription(params.description ?? null);
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.name = params.name;
    this.description = params.description ?? null;
    this.icon = params.icon ?? DEFAULT_WORKSPACE_ICON;
    this.color = params.color ?? DEFAULT_WORKSPACE_COLOR;
    this.isPinned = params.isPinned ?? false;
    this.sortOrder = params.sortOrder ?? 0;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  rename(name: string): void {
    validateWorkspaceName(name);
    this.name = name;
    this.touch();
  }

  describe(description: string | null): void {
    validateWorkspaceDescription(description);
    this.description = description;
    this.touch();
  }

  restyle(params: { icon?: string; color?: string }): void {
    this.icon = params.icon ?? this.icon;
    this.color = params.color ?? this.color;
    this.touch();
  }

  /**
   * The mapper writes `updatedAt` through to the record, so TypeORM's
   * @UpdateDateColumn never gets to fill it in — an edit would otherwise keep
   * its old timestamp and never move in the "last updated" sort.
   */
  private touch(): void {
    this.updatedAt = new Date();
  }
}
