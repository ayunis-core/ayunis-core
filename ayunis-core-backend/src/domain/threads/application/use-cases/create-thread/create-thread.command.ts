import type { UUID } from 'crypto';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import type { ThreadOrigin } from 'src/domain/threads/domain/thread-origin';

export class CreateThreadCommand {
  modelId?: UUID;
  mode?: ModelMode;
  title?: string;
  instruction?: string;
  isAnonymous?: boolean;
  workspaceId?: UUID;
  /** A plain chat when omitted. */
  origin?: ThreadOrigin;
  /** Integrations attached to the new thread, as if added one by one. */
  mcpIntegrationIds?: UUID[];

  constructor(params: {
    modelId?: UUID;
    mode?: ModelMode;
    title?: string;
    instruction?: string;
    isAnonymous?: boolean;
    workspaceId?: UUID;
    origin?: ThreadOrigin;
    mcpIntegrationIds?: UUID[];
  }) {
    this.modelId = params.modelId;
    this.mode = params.mode;
    this.title = params.title;
    this.instruction = params.instruction;
    this.isAnonymous = params.isAnonymous;
    this.workspaceId = params.workspaceId;
    this.origin = params.origin;
    this.mcpIntegrationIds = params.mcpIntegrationIds;
  }
}
