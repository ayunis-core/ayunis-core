import type { UUID } from 'crypto';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';

export class CreateThreadCommand {
  modelId?: UUID;
  mode?: ModelMode;
  title?: string;
  instruction?: string;
  isAnonymous?: boolean;
  workspaceId?: UUID;
  /** Makes this a routine thread created by that routine's execution. */
  routineId?: UUID;

  constructor(params: {
    modelId?: UUID;
    mode?: ModelMode;
    title?: string;
    instruction?: string;
    isAnonymous?: boolean;
    workspaceId?: UUID;
    routineId?: UUID;
  }) {
    this.modelId = params.modelId;
    this.mode = params.mode;
    this.title = params.title;
    this.instruction = params.instruction;
    this.isAnonymous = params.isAnonymous;
    this.workspaceId = params.workspaceId;
    this.routineId = params.routineId;
  }
}
