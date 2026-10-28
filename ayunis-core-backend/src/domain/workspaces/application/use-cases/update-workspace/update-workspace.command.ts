import type { UUID } from 'crypto';

export class UpdateWorkspaceCommand {
  readonly id: UUID;
  readonly name?: string;
  readonly description?: string | null;
  readonly icon?: string;
  readonly color?: string;

  constructor(params: {
    id: UUID;
    name?: string;
    description?: string | null;
    icon?: string;
    color?: string;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.description = params.description;
    this.icon = params.icon;
    this.color = params.color;
  }
}
