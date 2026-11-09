import type { UUID } from 'crypto';

export class CreateRoutineCommand {
  readonly name: string;
  readonly prompt: string;
  /** Omitted: the user's default model. */
  readonly modelId?: UUID;
  readonly dailyTime: string;
  readonly internetEnabled: boolean;
  readonly mcpIntegrationIds: UUID[];
  readonly enabled: boolean;

  constructor(params: {
    name: string;
    prompt: string;
    modelId?: UUID;
    dailyTime: string;
    internetEnabled: boolean;
    mcpIntegrationIds?: UUID[];
    enabled?: boolean;
  }) {
    this.name = params.name;
    this.prompt = params.prompt;
    this.modelId = params.modelId;
    this.dailyTime = params.dailyTime;
    this.internetEnabled = params.internetEnabled;
    this.mcpIntegrationIds = params.mcpIntegrationIds ?? [];
    this.enabled = params.enabled ?? true;
  }
}
