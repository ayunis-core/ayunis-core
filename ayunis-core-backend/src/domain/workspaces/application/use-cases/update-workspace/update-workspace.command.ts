import type { UUID } from 'crypto';

export class UpdateWorkspaceCommand {
  readonly workspaceId: UUID;
  readonly name?: string;
  readonly description?: string | null;
  readonly icon?: string;
  readonly color?: string;

  constructor(params: {
    workspaceId: UUID;
    name?: string;
    description?: string | null;
    icon?: string;
    color?: string;
  }) {
    this.workspaceId = params.workspaceId;
    this.name = params.name;
    this.description = params.description;
    this.icon = params.icon;
    this.color = params.color;
  }
}
