import type { UUID } from 'crypto';

/** Omitted properties stay unchanged; a null model means the user's default. */
export class UpdateRoutineCommand {
  readonly id: UUID;
  readonly name?: string;
  readonly prompt?: string;
  readonly modelId?: UUID | null;
  readonly dailyTime?: string;
  readonly internetEnabled?: boolean;
  /** Replaces the routine's integrations. */
  readonly mcpIntegrationIds?: UUID[];
  readonly enabled?: boolean;

  constructor(params: {
    id: UUID;
    name?: string;
    prompt?: string;
    modelId?: UUID | null;
    dailyTime?: string;
    internetEnabled?: boolean;
    mcpIntegrationIds?: UUID[];
    enabled?: boolean;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.prompt = params.prompt;
    this.modelId = params.modelId;
    this.dailyTime = params.dailyTime;
    this.internetEnabled = params.internetEnabled;
    this.mcpIntegrationIds = params.mcpIntegrationIds;
    this.enabled = params.enabled;
  }
}
