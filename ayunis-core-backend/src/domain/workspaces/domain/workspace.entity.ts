import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import {
  DEFAULT_WORKSPACE_COLOR,
  DEFAULT_WORKSPACE_ICON,
} from './workspaces.constants';
import { WorkspaceVisibility } from './value-objects/workspace-visibility.enum';

export class Workspace {
  public readonly id: UUID;
  public readonly userId: UUID;
  public readonly orgId: UUID;
  public readonly createdAt: Date;
  public name: string;
  public description: string | null;
  public instruction: string | null;
  public icon: string;
  public color: string;
  public visibility: WorkspaceVisibility;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    orgId: UUID;
    name: string;
    description?: string | null;
    instruction?: string | null;
    icon?: string;
    color?: string;
    visibility?: WorkspaceVisibility;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.name = params.name;
    this.description = params.description ?? null;
    this.instruction = params.instruction ?? null;
    this.icon = params.icon ?? DEFAULT_WORKSPACE_ICON;
    this.color = params.color ?? DEFAULT_WORKSPACE_COLOR;
    this.visibility = params.visibility ?? WorkspaceVisibility.PRIVATE;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  rename(name: string): void {
    this.name = name;
    this.touch();
  }

  describe(description: string | null): void {
    this.description = description;
    this.touch();
  }

  instruct(instruction: string | null): void {
    this.instruction = instruction;
    this.touch();
  }

  restyle(params: { icon?: string; color?: string }): void {
    this.icon = params.icon ?? this.icon;
    this.color = params.color ?? this.color;
    this.touch();
  }

  changeVisibility(visibility: WorkspaceVisibility): void {
    this.visibility = visibility;
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
