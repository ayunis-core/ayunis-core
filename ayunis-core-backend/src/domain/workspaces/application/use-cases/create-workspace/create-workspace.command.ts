export class CreateWorkspaceCommand {
  readonly name: string;
  readonly description: string | null;
  readonly icon?: string;
  readonly color?: string;

  constructor(params: {
    name: string;
    description?: string | null;
    icon?: string;
    color?: string;
  }) {
    this.name = params.name;
    this.description = params.description ?? null;
    this.icon = params.icon;
    this.color = params.color;
  }
}
